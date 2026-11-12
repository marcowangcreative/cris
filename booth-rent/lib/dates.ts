export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

function parts(iso: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    throw new Error(`Expected a YYYY-MM-DD date, received "${iso}".`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function isISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const { year, month, day } = parts(iso);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

/** Monday = 1 … Sunday = 0, from the calendar date itself. */
export function weekday(iso: string): number {
  const { year, month, day } = parts(iso);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isMonday(iso: string): boolean {
  return isISODate(iso) && weekday(iso) === 1;
}

export function addDays(iso: string, days: number): string {
  const { year, month, day } = parts(iso);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** The Monday–Sunday week that already finished before `reference`. */
export function priorWeekRange(reference: Date = new Date()): { start: string; end: string } {
  const iso = toISODate(reference);
  const daysSinceMonday = (weekday(iso) + 6) % 7;
  const thisMonday = addDays(iso, -daysSinceMonday);
  const start = addDays(thisMonday, -7);
  return { start, end: addDays(start, 6) };
}

/** Snap any calendar date to the Monday–Sunday week that contains it. */
export function weekContaining(iso: string): { start: string; end: string } {
  if (!isISODate(iso)) {
    throw new Error(`Expected a YYYY-MM-DD date, received "${iso}".`);
  }
  const start = addDays(iso, -((weekday(iso) + 6) % 7));
  return { start, end: addDays(start, 6) };
}

export function weekRangeFromMonday(start: string): { start: string; end: string } | null {
  if (!isMonday(start)) return null;
  return { start, end: addDays(start, 6) };
}

/**
 * Calendar month of an ISO date, as a half-open range [monthStart, nextMonthStart).
 * Billing weeks are assigned to the month they end in.
 */
export function monthRangeContaining(isoDate: string): {
  monthStart: string;
  nextMonthStart: string;
} {
  const { year, month } = parts(isoDate);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { monthStart, nextMonthStart };
}

export function parseISODate(iso: string): Date {
  const { year, month, day } = parts(iso);
  return new Date(year, month - 1, day);
}

export function formatWeekLabel(start: string, end: string): string {
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const left = startDate.toLocaleDateString("en-US", options);
  const right = endDate.toLocaleDateString("en-US", options);
  return `${left} – ${right}, ${endDate.getFullYear()}`;
}

export function formatMonth(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function unixToISODate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}
