import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { NotFoundError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { buildSeed } from "@/lib/seed";
import { applySettingsAction } from "@/lib/settings";
import { planHold } from "@/lib/transitions";
import { emptyDatabase } from "@/lib/store/persistence";
import type { HoldInput, Store } from "@/lib/store/types";
import type { Booking, Database, Inquiry, Settings, SettingsAction } from "@/lib/types";

type Sql = ReturnType<typeof postgres>;
type Transaction = postgres.TransactionSql;

function statements(sqlText: string): string[] {
  return sqlText
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function asJson<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

export class PostgresStore implements Store {
  private readonly sql: Sql;
  private readonly ready: Promise<void>;

  constructor(url: string) {
    this.sql = postgres(url, {
      max: 4,
      idle_timeout: 20,
      // Supabase's transaction pooler rejects prepared statements.
      prepare: false,
    });
    this.ready = this.ensure();
  }

  private async ensure(): Promise<void> {
    const file = path.join(process.cwd(), "sql", "schema.sql");
    const ddl = await readFile(file, "utf8");
    for (const statement of statements(ddl)) {
      await this.sql.unsafe(statement);
    }
    if (process.env.SEED_ON_EMPTY === "false") return;

    await this.sql.begin(async (tx: Transaction) => {
      await tx`select id from studio_settings where id = 1 for update`;
      const rows = await tx<{ count: number }[]>`select count(*)::int as count from bookings`;
      if (Number(rows[0]?.count ?? 0) > 0) return;
      const seed = buildSeed(new Date());
      await persistDiff(tx, emptyDatabase(), seed);
    });
  }

  private async read(tx?: Transaction): Promise<Database> {
    const query = tx ?? this.sql;
    const settingsRows = await query<{ max_events_per_date: number; blocked_dates: string[] | null }[]>`
      select max_events_per_date, blocked_dates from studio_settings where id = 1
    `;
    if (!settingsRows[0]) throw new Error("studio_settings is missing. Run sql/schema.sql.");
    const bookingRows = await query<{ payload: Booking | string }[]>`select payload from bookings`;
    const inquiryRows = await query<{ payload: Inquiry | string }[]>`select payload from inquiries`;
    return {
      settings: {
        maxEventsPerDate: settingsRows[0].max_events_per_date,
        blockedDates: settingsRows[0].blocked_dates ?? [],
      },
      bookings: bookingRows.map((row) => asJson(row.payload)),
      inquiries: inquiryRows.map((row) => asJson(row.payload)),
    };
  }

  private async mutate<T>(fn: (db: Database) => { db: Database; result: T } | Promise<{ db: Database; result: T }>): Promise<T> {
    await this.ready;
    const result = await this.sql.begin(async (tx: Transaction) => {
      await tx`select id from studio_settings where id = 1 for update`;
      await tx`select id from bookings for update`;
      const db = await this.read(tx);
      const next = await fn(db);
      await persistDiff(tx, db, next.db);
      return next.result;
    });
    return result as T;
  }

  async listBookings(): Promise<Booking[]> {
    await this.ready;
    return (await this.read()).bookings;
  }

  async getBooking(id: string): Promise<Booking | null> {
    return (await this.listBookings()).find((booking) => booking.id === id) ?? null;
  }

  async createHold(input: HoldInput): Promise<Booking> {
    const now = input.now ?? new Date();
    return this.mutate((db) => {
      const booking = planHold({
        id: newId("bk"),
        now,
        packageId: input.packageId,
        addons: input.addons,
        date: input.date,
        startTime: input.startTime,
        bookings: db.bookings,
        settings: db.settings,
      });
      return { db: { ...db, bookings: [...db.bookings, booking] }, result: booking };
    });
  }

  async updateBooking(id: string, updater: (current: Booking) => Booking): Promise<Booking> {
    return this.mutate((db) => {
      const index = db.bookings.findIndex((booking) => booking.id === id);
      if (index < 0) throw new NotFoundError("Booking not found.");
      const next = updater(db.bookings[index]);
      if (next === db.bookings[index]) return { db, result: next };
      const bookings = db.bookings.slice();
      bookings[index] = next;
      return { db: { ...db, bookings }, result: next };
    });
  }

  async listInquiries(): Promise<Inquiry[]> {
    await this.ready;
    return (await this.read()).inquiries;
  }

  async createInquiry(input: Omit<Inquiry, "id" | "createdAt">): Promise<Inquiry> {
    const inquiry: Inquiry = { ...input, id: newId("inq"), createdAt: new Date().toISOString() };
    return this.mutate((db) => ({
      db: { ...db, inquiries: [...db.inquiries, inquiry] },
      result: inquiry,
    }));
  }

  async getSettings(): Promise<Settings> {
    await this.ready;
    return (await this.read()).settings;
  }

  async changeSettings(action: SettingsAction): Promise<Settings> {
    return this.mutate((db) => {
      const settings = applySettingsAction(db.settings, action);
      return { db: { ...db, settings }, result: settings };
    });
  }
}

async function persistDiff(tx: Transaction, prev: Database, next: Database): Promise<void> {
  if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) {
    await tx`
      update studio_settings
      set max_events_per_date = ${next.settings.maxEventsPerDate},
          blocked_dates = ${tx.array(next.settings.blockedDates)}
      where id = 1
    `;
  }

  const previousBookings = new Map(prev.bookings.map((booking) => [booking.id, booking]));
  for (const booking of next.bookings) {
    const before = previousBookings.get(booking.id);
    if (!before) {
      await tx`
        insert into bookings (
          id, event_date, start_time, duration_minutes, status, hold_expires_at, payload, created_at
        ) values (
          ${booking.id},
          ${booking.date},
          ${booking.startTime},
          ${booking.quote.durationMinutes},
          ${booking.status},
          ${booking.holdExpiresAt},
          ${tx.json(booking)},
          ${booking.createdAt}
        )
      `;
    } else if (JSON.stringify(before) !== JSON.stringify(booking)) {
      await tx`
        update bookings
        set event_date = ${booking.date},
            start_time = ${booking.startTime},
            duration_minutes = ${booking.quote.durationMinutes},
            status = ${booking.status},
            hold_expires_at = ${booking.holdExpiresAt},
            payload = ${tx.json(booking)}
        where id = ${booking.id}
      `;
    }
  }

  const previousInquiries = new Set(prev.inquiries.map((inquiry) => inquiry.id));
  for (const inquiry of next.inquiries) {
    if (previousInquiries.has(inquiry.id)) continue;
    await tx`
      insert into inquiries (id, payload, created_at)
      values (${inquiry.id}, ${tx.json(inquiry)}, ${inquiry.createdAt})
    `;
  }
}
