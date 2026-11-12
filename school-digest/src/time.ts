export interface CivilTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function assertTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    throw new Error(`Unknown timezone "${timeZone}". Use an IANA name such as America/Chicago.`);
  }
}

export function zonedParts(date: Date, timeZone: string): CivilTime {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

/** Milliseconds to add to a UTC instant to get the clock time in `timeZone`. */
export function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

export function zonedTimeToUtc(civil: CivilTime, timeZone: string): Date {
  const guess = Date.UTC(civil.year, civil.month - 1, civil.day, civil.hour, civil.minute, civil.second);
  const offset1 = timeZoneOffsetMs(new Date(guess), timeZone);
  let utc = guess - offset1;
  const offset2 = timeZoneOffsetMs(new Date(utc), timeZone);
  if (offset2 !== offset1) utc = guess - offset2;
  return new Date(utc);
}

export function weekdayShort(year: number, month: number, day: number): string {
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "Day";
}

export function formatCivil(civil: Pick<CivilTime, "year" | "month" | "day" | "hour" | "minute">, withTime: boolean): string {
  const weekday = weekdayShort(civil.year, civil.month, civil.day);
  const month = MONTHS[civil.month - 1] ?? String(civil.month);
  const base = `${weekday}, ${month} ${civil.day}`;
  if (!withTime) return base;
  const hour12 = civil.hour % 12 === 0 ? 12 : civil.hour % 12;
  const minute = String(civil.minute).padStart(2, "0");
  const suffix = civil.hour < 12 ? "AM" : "PM";
  return `${base}, ${hour12}:${minute} ${suffix}`;
}

/** Format a school-local YYYY-MM-DD or YYYY-MM-DDTHH:mm value. */
export function formatCivilLabel(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!match) return value;
  return formatCivil(
    {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: match[4] ? Number(match[4]) : 0,
      minute: match[5] ? Number(match[5]) : 0,
    },
    Boolean(match[4]),
  );
}

/** Format an ISO instant in the configured timezone. */
export function formatInstant(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = zonedParts(date, timeZone);
  return formatCivil(parts, true);
}

export function windowBounds(asOf: Date, days: number): { start: Date; end: Date } {
  return {
    start: new Date(asOf.getTime() - days * 24 * 60 * 60 * 1000),
    end: asOf,
  };
}

export function inWindow(instant: Date, bounds: { start: Date; end: Date }): boolean {
  const time = instant.getTime();
  return time >= bounds.start.getTime() && time <= bounds.end.getTime();
}

/**
 * True during the local Sunday 7 PM hour. GitHub Actions cron is UTC, so the
 * runner fires at both DST-possible UTC hours and this guard keeps one of them.
 */
export function isSundaySevenPm(now: Date, timeZone: string): boolean {
  const parts = zonedParts(now, timeZone);
  return weekdayShort(parts.year, parts.month, parts.day) === "Sun" && parts.hour === 19;
}

export function formatYmd(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}/${month}/${day}`;
}

/**
 * Gmail's `after:` operator is exclusive and date-granular. Search from the
 * calendar day before the window, then filter exactly in code.
 */
export function gmailAfterQuery(windowStart: Date, timeZone: string): string {
  const dayBefore = new Date(windowStart.getTime() - 24 * 60 * 60 * 1000);
  return `after:${formatYmd(dayBefore, timeZone)}`;
}
