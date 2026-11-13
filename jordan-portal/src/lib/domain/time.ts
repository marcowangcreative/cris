import { DateTime } from "luxon";
import { getConfig } from "@/lib/rules";
import { RULES } from "@/lib/rules";
import { DomainError } from "./errors";

export const STUDIO_ZONE = RULES.timezone;

export function parseInstant(iso: string): DateTime {
  const dt = DateTime.fromISO(iso, { setZone: true });
  if (!dt.isValid) {
    throw new DomainError("Invalid timestamp.");
  }
  return dt;
}

export function chicagoDateTime(iso: string): DateTime {
  return parseInstant(iso).setZone(STUDIO_ZONE);
}

/** Calendar date in America/Chicago, DST-safe. */
export function chicagoDate(iso: string): string {
  const date = chicagoDateTime(iso).toISODate();
  if (!date) throw new DomainError("Invalid timestamp.");
  return date;
}

/**
 * Public transformation starts are 10:00:00 in America/Chicago.
 * The same UTC hour is 10:00 on only one side of DST.
 */
export function isTenAmChicago(iso: string): boolean {
  const dt = DateTime.fromISO(iso, { setZone: true });
  if (!dt.isValid) return false;
  const local = dt.setZone(STUDIO_ZONE);
  return (
    local.hour === RULES.publicStartHour &&
    local.minute === RULES.publicStartMinute &&
    local.second === 0 &&
    local.millisecond === 0
  );
}

export function formatChicago(iso: string): string {
  return chicagoDateTime(iso).toFormat("cccc, LLLL d, yyyy 'at' h:mm a ZZZZ");
}

export function formatChicagoDate(isoDate: string): string {
  const dt = DateTime.fromISO(isoDate, { zone: STUDIO_ZONE });
  return dt.toFormat("cccc, LLLL d");
}

export function monthLabel(year: number, month: number): string {
  return DateTime.fromObject(
    { year, month, day: 1 },
    { zone: STUDIO_ZONE },
  ).toFormat("LLLL yyyy");
}

/** The 1st opens the month two months ahead. February 1 opens April. */
export function monthOpenedOn(releaseLocal: DateTime): {
  year: number;
  month: number;
} {
  const opened = releaseLocal.setZone(STUDIO_ZONE).startOf("month").plus({
    months: getConfig().releaseLeadMonths,
  });
  return { year: opened.year, month: opened.month };
}

export function suggestedReleaseInstant(
  targetYear: number,
  targetMonth: number,
): DateTime {
  const config = getConfig();
  const [hour, minute] = config.releaseLocalTime.split(":").map(Number);
  const target = DateTime.fromObject(
    { year: targetYear, month: targetMonth, day: 1 },
    { zone: STUDIO_ZONE },
  );
  return target.minus({ months: config.releaseLeadMonths }).set({
    day: config.releaseDayOfMonth,
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });
}

export function datesForWeekdays(
  year: number,
  month: number,
  weekdays: number[],
): string[] {
  const dates: string[] = [];
  let cursor = DateTime.fromObject(
    { year, month, day: 1 },
    { zone: STUDIO_ZONE },
  );
  while (cursor.month === month) {
    if (weekdays.includes(cursor.weekday)) {
      const iso = cursor.toISODate();
      if (iso) dates.push(iso);
    }
    cursor = cursor.plus({ days: 1 });
  }
  return dates;
}

export function chicagoDayInterval(isoDate: string): {
  start: DateTime;
  end: DateTime;
} {
  const start = DateTime.fromISO(isoDate, { zone: STUDIO_ZONE }).startOf("day");
  return { start, end: start.plus({ days: 1 }) };
}

export function intervalsOverlap(
  aStart: DateTime,
  aEnd: DateTime,
  bStart: DateTime,
  bEnd: DateTime,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
