import { NotFoundError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { applySettingsAction } from "@/lib/settings";
import { planHold } from "@/lib/transitions";
import type { Booking, Database, Inquiry, SettingsAction } from "@/lib/types";
import type { Persistence } from "@/lib/store/persistence";
import type { HoldInput, Store } from "@/lib/store/types";

class Mutex {
  private tail: Promise<void> = Promise.resolve();

  run<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(fn, fn);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

export class DocumentStore implements Store {
  private readonly mutex = new Mutex();

  constructor(private readonly persistence: Persistence) {}

  private async transaction<T>(
    fn: (db: Database) => Promise<{ db: Database; result: T }> | { db: Database; result: T },
  ): Promise<T> {
    return this.mutex.run(async () => {
      const db = await this.persistence.load();
      const next = await fn(db);
      if (next.db !== db) await this.persistence.save(next.db);
      return next.result;
    });
  }

  async listBookings(): Promise<Booking[]> {
    return (await this.persistence.load()).bookings;
  }

  async getBooking(id: string): Promise<Booking | null> {
    return (await this.listBookings()).find((booking) => booking.id === id) ?? null;
  }

  async createHold(input: HoldInput): Promise<Booking> {
    const now = input.now ?? new Date();
    return this.transaction((db) => {
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
    return this.transaction((db) => {
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
    return (await this.persistence.load()).inquiries;
  }

  async createInquiry(input: Omit<Inquiry, "id" | "createdAt">): Promise<Inquiry> {
    const inquiry: Inquiry = { ...input, id: newId("inq"), createdAt: new Date().toISOString() };
    return this.transaction((db) => ({
      db: { ...db, inquiries: [...db.inquiries, inquiry] },
      result: inquiry,
    }));
  }

  async getSettings() {
    return (await this.persistence.load()).settings;
  }

  async changeSettings(action: SettingsAction) {
    return this.transaction((db) => {
      const settings = applySettingsAction(db.settings, action);
      return { db: { ...db, settings }, result: settings };
    });
  }
}
