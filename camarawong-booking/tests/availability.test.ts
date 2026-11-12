import { describe, expect, it } from "vitest";
import { evaluateSlot, intervalsOverlap, monthAvailability } from "@/lib/availability";
import { weekdayName } from "@/lib/civil-date";
import { SlotUnavailableError } from "@/lib/errors";
import { buildSeed } from "@/lib/seed";
import { planHold } from "@/lib/transitions";
import type { Booking, Settings } from "@/lib/types";
import { NOW } from "./helpers";

const open: Settings = { maxEventsPerDate: 1, blockedDates: [] };

function hold(partial: {
  date?: string;
  startTime?: string;
  packageId?: string;
  bookings?: Booking[];
  settings?: Settings;
  addons?: { id: string; quantity: number }[];
}) {
  return planHold({
    id: "hold_test",
    now: NOW,
    packageId: partial.packageId ?? "corporate",
    addons: partial.addons ?? [],
    date: partial.date ?? "2026-11-18",
    startTime: partial.startTime ?? "16:00",
    bookings: partial.bookings ?? [],
    settings: partial.settings ?? open,
  });
}

describe("availability and double booking", () => {
  it("treats touching windows as free and overlapping windows as taken", () => {
    expect(intervalsOverlap(16 * 60, 120, 18 * 60, 90)).toBe(false);
    expect(intervalsOverlap(16 * 60, 120, 17 * 60, 90)).toBe(true);
  });

  it("opens a real weekday outside the notice window and refuses Mondays, notice, horizon, and bad times", () => {
    expect(evaluateSlot({ date: "2026-11-18", startTime: "16:00", durationMinutes: 90, bookings: [], settings: open, now: NOW }).ok).toBe(true);
    expect(evaluateSlot({ date: "2026-11-14", startTime: "11:00", durationMinutes: 90, bookings: [], settings: open, now: NOW }).ok).toBe(true);

    const monday = evaluateSlot({ date: "2026-11-16", startTime: "16:00", durationMinutes: 90, bookings: [], settings: open, now: NOW });
    expect(monday.ok).toBe(false);
    if (!monday.ok) expect(monday.reason).toMatch(/closed/);

    const soon = evaluateSlot({ date: "2026-11-13", startTime: "16:00", durationMinutes: 90, bookings: [], settings: open, now: NOW });
    expect(soon.ok).toBe(false);
    if (!soon.ok) expect(soon.reason).toMatch(/notice/);

    const far = evaluateSlot({ date: "2027-06-01", startTime: "16:00", durationMinutes: 90, bookings: [], settings: open, now: NOW });
    expect(far.ok).toBe(false);
    if (!far.ok) expect(far.reason).toMatch(/outside/);

    const odd = evaluateSlot({ date: "2026-11-18", startTime: "16:30", durationMinutes: 90, bookings: [], settings: open, now: NOW });
    expect(odd.ok).toBe(false);
    expect(evaluateSlot({ date: "2026-02-31", startTime: "16:00", durationMinutes: 90, bookings: [], settings: open, now: NOW }).ok).toBe(false);
  });

  it("blocks a date the desk closed", () => {
    const decision = evaluateSlot({
      date: "2026-11-18",
      startTime: "16:00",
      durationMinutes: 90,
      bookings: [],
      settings: { maxEventsPerDate: 1, blockedDates: ["2026-11-18"] },
      now: NOW,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.reason).toMatch(/blocked/);
  });

  it("stops a second booking on the same slot, an overlap, and a second event when the daily max is one", () => {
    const first = hold({});
    const same = evaluateSlot({
      date: first.date,
      startTime: first.startTime,
      durationMinutes: 90,
      bookings: [first],
      settings: open,
      now: NOW,
    });
    expect(same.ok).toBe(false);

    const custom = hold({ packageId: "custom", startTime: "14:00", settings: { maxEventsPerDate: 2, blockedDates: [] } });
    const overlap = evaluateSlot({
      date: custom.date,
      startTime: "16:00",
      durationMinutes: 90,
      bookings: [custom],
      settings: { maxEventsPerDate: 2, blockedDates: [] },
      now: NOW,
    });
    expect(overlap.ok).toBe(false);
    if (!overlap.ok) expect(overlap.reason).toMatch(/overlap/);

    const after = evaluateSlot({
      date: custom.date,
      startTime: "18:00",
      durationMinutes: 90,
      bookings: [custom],
      settings: { maxEventsPerDate: 2, blockedDates: [] },
      now: NOW,
    });
    expect(after.ok).toBe(true);

    const otherTime = evaluateSlot({
      date: first.date,
      startTime: "11:00",
      durationMinutes: 90,
      bookings: [first],
      settings: open,
      now: NOW,
    });
    expect(otherTime.ok).toBe(false);
    if (!otherTime.ok) expect(otherTime.reason).toMatch(/fully booked/);
  });

  it("lets a second non-overlapping event through only while the date is under its max", () => {
    const settings = { maxEventsPerDate: 2, blockedDates: [] };
    const morning = hold({ packageId: "digital", startTime: "11:00", settings });
    const afternoon = hold({ startTime: "14:00", bookings: [morning], settings });
    expect(afternoon.startTime).toBe("14:00");
    const evening = evaluateSlot({
      date: "2026-11-18",
      startTime: "18:00",
      durationMinutes: 90,
      bookings: [morning, afternoon],
      settings,
      now: NOW,
    });
    expect(evening.ok).toBe(false);
  });

  it("ignores expired holds and cancelled bookings, and ignores the booking being edited", () => {
    const expired = { ...hold({}), holdExpiresAt: new Date(NOW.getTime() - 60_000).toISOString() };
    expect(
      evaluateSlot({ date: expired.date, startTime: "16:00", durationMinutes: 90, bookings: [expired], settings: open, now: NOW }).ok,
    ).toBe(true);

    const cancelled = { ...hold({}), status: "cancelled" as const };
    expect(
      evaluateSlot({ date: cancelled.date, startTime: "16:00", durationMinutes: 90, bookings: [cancelled], settings: open, now: NOW }).ok,
    ).toBe(true);

    const current = hold({});
    expect(
      evaluateSlot({
        date: current.date,
        startTime: current.startTime,
        durationMinutes: 90,
        bookings: [current],
        settings: open,
        now: NOW,
        ignoreBookingId: current.id,
      }).ok,
    ).toBe(true);
  });

  it("throws when a hold is planned on a taken slot", () => {
    const first = hold({});
    expect(() => hold({ bookings: [first] })).toThrow(SlotUnavailableError);
  });

  it("shows seeded paid and blocked dates as unavailable on the calendar", () => {
    const db = buildSeed(NOW);
    for (const date of [db.bookings[0].date, db.bookings[1].date, ...db.settings.blockedDates]) {
      expect(weekdayName(date)).not.toBe("Monday");
    }
    const paid = db.bookings.find((booking) => booking.status === "paid");
    expect(paid?.payment.provider).toBe("demo");
    expect(paid?.contract?.signerName).toBe("Priya Shah");
    const month = paid!.date.slice(0, 7);
    const calendar = monthAvailability({
      month,
      packageId: "corporate",
      addons: [],
      bookings: db.bookings,
      settings: db.settings,
      now: NOW,
    });
    expect(calendar.days.find((day) => day.date === paid!.date)?.status).toBe("full");
    const blocked = db.settings.blockedDates[0];
    expect(calendar.days.find((day) => day.date === blocked)?.status).toBe("blocked");
    expect(calendar.days.some((day) => day.status === "open")).toBe(true);
    expect(calendar.days.find((day) => day.weekday === "Monday" && day.status !== "past" && day.status !== "beyond")?.status).toBe("closed");
  });
});
