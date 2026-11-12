import type { AppConfig } from "./types";
import { zonedParts, zonedTimeToUtc, type CivilTime } from "./time";

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH_RE =
  /\b(?:(?:mon|tues|tue|wed|thurs|thu|fri|sat|sun)\w*,?\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i;
const ISO_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
const NUMERIC_RE = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\b/;
const NUMERIC_SHORT_RE = /\b(\d{1,2})\/(\d{1,2})\b/;
const TIME_RE = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?\b/i;

export function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function expandYear(year: number): number {
  if (year >= 100) return year;
  return year < 70 ? 2000 + year : 1900 + year;
}

export function inferYear(month: number, day: number, asOf: Date, timeZone: string): number {
  const current = zonedParts(asOf, timeZone).year;
  const deltaDays = (year: number) => {
    if (!isValidYmd(year, month, day)) return Number.POSITIVE_INFINITY;
    const instant = zonedTimeToUtc({ year, month, day, hour: 12, minute: 0, second: 0 }, timeZone);
    return (instant.getTime() - asOf.getTime()) / 86_400_000;
  };
  const delta = deltaDays(current);
  if (delta < -180) return current + 1;
  if (delta > 180) return current - 1;
  return current;
}

export function resolveMonthDay(
  first: number,
  second: number,
  order: "MDY" | "DMY",
): { month: number; day: number } | null {
  if (first > 12 && second > 12) return null;
  if (first > 12) return { month: second, day: first };
  if (second > 12) return { month: first, day: second };
  return order === "MDY" ? { month: first, day: second } : { month: second, day: first };
}

export function parseClock(raw: string): Pick<CivilTime, "hour" | "minute" | "second"> | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AaPp])\.?[Mm]\.?)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] ? Number(match[3]) : 0;
  const ap = match[4]?.toLowerCase();
  if (minute > 59 || second > 59) return null;
  if (ap) {
    if (hour < 1 || hour > 12) return null;
    if (ap === "p" && hour !== 12) hour += 12;
    if (ap === "a" && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }
  return { hour, minute, second };
}

function clockFromProse(text: string): { hour: number; minute: number } | null {
  const match = text.match(TIME_RE);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (hour < 1 || hour > 12 || minute > 59) return null;
  const ap = match[3].toLowerCase();
  if (ap === "p" && hour !== 12) hour += 12;
  if (ap === "a" && hour === 12) hour = 0;
  return { hour, minute };
}

function toLabel(year: number, month: number, day: number, time: { hour: number; minute: number } | null): string | null {
  if (!isValidYmd(year, month, day)) return null;
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  if (!time) return `${y}-${m}-${d}`;
  return `${y}-${m}-${d}T${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}

/**
 * First school date in a block, as a timezone-local civil label.
 * Returns null when the text has no date.
 */
export function parseLooseDate(
  text: string,
  asOf: Date,
  timeZone: string,
  order: AppConfig["date_order"],
): string | null {
  const time = clockFromProse(text);
  const monthMatch = text.match(MONTH_RE);
  if (monthMatch) {
    const month = MONTH_INDEX[monthMatch[1].toLowerCase().replace(".", "")];
    const day = Number(monthMatch[2]);
    const year = monthMatch[3] ? Number(monthMatch[3]) : inferYear(month, day, asOf, timeZone);
    return toLabel(year, month, day, time);
  }

  const iso = text.match(ISO_RE);
  if (iso) return toLabel(Number(iso[1]), Number(iso[2]), Number(iso[3]), time);

  const numeric = text.match(NUMERIC_RE);
  if (numeric) {
    const resolved = resolveMonthDay(Number(numeric[1]), Number(numeric[2]), order);
    if (!resolved) return null;
    const year = expandYear(Number(numeric[3]));
    return toLabel(year, resolved.month, resolved.day, time);
  }

  const short = text.match(NUMERIC_SHORT_RE);
  if (short) {
    const resolved = resolveMonthDay(Number(short[1]), Number(short[2]), order);
    if (!resolved) return null;
    const year = inferYear(resolved.month, resolved.day, asOf, timeZone);
    return toLabel(year, resolved.month, resolved.day, time);
  }

  return null;
}

export function parseStamp(
  dateRaw: string,
  timeRaw: string,
  timeZone: string,
  order: AppConfig["date_order"],
): Date | null {
  const clock = parseClock(timeRaw);
  if (!clock) return null;

  let year: number;
  let month: number;
  let day: number;
  const iso = dateRaw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    const numeric = dateRaw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (!numeric) return null;
    const resolved = resolveMonthDay(Number(numeric[1]), Number(numeric[2]), order);
    if (!resolved) return null;
    month = resolved.month;
    day = resolved.day;
    year = expandYear(Number(numeric[3]));
  }
  if (!isValidYmd(year, month, day)) return null;
  return zonedTimeToUtc({ year, month, day, ...clock }, timeZone);
}

const DEADLINE_RE = /\b(due|deadline|closes|close|by)\b/i;
const EVENT_DAY_RE = /\b(no school|closed|early release|late start|concert|fair|opens|dismissal)\b/i;

export function assignDateFields(text: string, parsed: string | null): { date: string | null; deadline: string | null } {
  if (!parsed) return { date: null, deadline: null };
  const deadlineLike = DEADLINE_RE.test(text);
  const eventDay = EVENT_DAY_RE.test(text);
  if (deadlineLike && !eventDay) return { date: null, deadline: parsed };
  return { date: parsed, deadline: null };
}
