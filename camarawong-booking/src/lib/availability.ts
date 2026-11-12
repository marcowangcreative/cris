import {
  addDays,
  chicagoToday,
  daysInMonth,
  isRealDate,
  isRealMonth,
  sundayIndex,
  weekdayName,
} from "@/lib/civil-date";
import { studio } from "@/lib/config";
import { SlotUnavailableError } from "@/lib/errors";
import { quote } from "@/lib/pricing";
import { occupiesSlot } from "@/lib/status";
import type {
  AddonSelection,
  AvailabilityMonth,
  Booking,
  DayStatus,
  Settings,
} from "@/lib/types";

export type SlotDecision = { ok: true } | { ok: false; reason: string };

export function parseStartMinutes(hhmm: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) throw new Error(`Invalid time ${hhmm}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Half-open intervals, so a station that ends at 6:00 does not block a 6:00 start. */
export function intervalsOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number,
): boolean {
  return startA < startB + durationB && startB < startA + durationA;
}

export function evaluateSlot(args: {
  date: string;
  startTime: string;
  durationMinutes: number;
  bookings: Booking[];
  settings: Settings;
  now: Date;
  ignoreBookingId?: string;
}): SlotDecision {
  if (!isRealDate(args.date)) return { ok: false, reason: "That date is not valid." };

  const today = chicagoToday(args.now);
  const earliest = addDays(today, studio.leadDays);
  const latest = addDays(today, studio.horizonDays);
  if (args.date < earliest) {
    return { ok: false, reason: "That date is inside the minimum notice window." };
  }
  if (args.date > latest) {
    return { ok: false, reason: "That date is outside the booking window." };
  }

  const weekday = weekdayName(args.date);
  if (studio.closedWeekdays.includes(weekday as (typeof studio.closedWeekdays)[number])) {
    return { ok: false, reason: `The studio is closed on ${weekday}s.` };
  }

  if (!studio.startTimes.includes(args.startTime)) {
    return { ok: false, reason: "That start time is not offered." };
  }

  if (args.settings.blockedDates.includes(args.date)) {
    return { ok: false, reason: "That date is blocked." };
  }

  if (!Number.isInteger(args.settings.maxEventsPerDate) || args.settings.maxEventsPerDate < 1) {
    return { ok: false, reason: "No events can be booked on that date." };
  }

  const startMinute = parseStartMinutes(args.startTime);
  const relevant = args.bookings.filter((booking) => {
    if (booking.id === args.ignoreBookingId) return false;
    if (booking.date !== args.date) return false;
    return occupiesSlot(booking, args.now);
  });

  if (relevant.length >= args.settings.maxEventsPerDate) {
    return { ok: false, reason: "That date is fully booked." };
  }

  const overlap = relevant.some((booking) =>
    intervalsOverlap(
      startMinute,
      args.durationMinutes,
      parseStartMinutes(booking.startTime),
      booking.quote.durationMinutes,
    ),
  );
  if (overlap) return { ok: false, reason: "That time overlaps another reservation." };

  return { ok: true };
}

function dayStatus(reason: string): DayStatus {
  if (reason.includes("notice")) return "past";
  if (reason.includes("outside")) return "beyond";
  if (reason.includes("closed")) return "closed";
  if (reason.includes("blocked")) return "blocked";
  return "full";
}

export function monthAvailability(args: {
  month: string;
  packageId: string;
  addons: AddonSelection[];
  bookings: Booking[];
  settings: Settings;
  now: Date;
  ignoreBookingId?: string;
}): AvailabilityMonth {
  if (!isRealMonth(args.month)) throw new Error("Invalid month");
  const priced = quote(args.packageId, args.addons);
  const dates = daysInMonth(args.month);

  const days = dates.map((date) => {
    const startTimes = studio.startTimes.filter((startTime) => {
      return evaluateSlot({
        date,
        startTime,
        durationMinutes: priced.durationMinutes,
        bookings: args.bookings,
        settings: args.settings,
        now: args.now,
        ignoreBookingId: args.ignoreBookingId,
      }).ok;
    });

    let status: DayStatus = "open";
    if (startTimes.length === 0) {
      const probe = evaluateSlot({
        date,
        startTime: studio.startTimes[0],
        durationMinutes: priced.durationMinutes,
        bookings: args.bookings,
        settings: args.settings,
        now: args.now,
        ignoreBookingId: args.ignoreBookingId,
      });
      status = probe.ok ? "full" : dayStatus(probe.reason);
    }

    return { date, weekday: weekdayName(date), status, startTimes };
  });

  return {
    month: args.month,
    firstWeekday: sundayIndex(dates[0]),
    maxEventsPerDate: args.settings.maxEventsPerDate,
    days,
  };
}

export function assertSlotOpen(args: Parameters<typeof evaluateSlot>[0]): void {
  const decision = evaluateSlot(args);
  if (!decision.ok) throw new SlotUnavailableError(decision.reason);
}
