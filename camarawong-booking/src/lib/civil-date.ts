import { studio } from "@/lib/config";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function isRealDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isRealMonth(month: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(month)) return false;
  const value = Number(month.slice(5));
  return value >= 1 && value <= 12;
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function weekdayName(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/** Sunday = 0. Uses the civil date, not the server's local zone. */
export function sundayIndex(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function chicagoToday(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: studio.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function daysInMonth(month: string): string[] {
  if (!isRealMonth(month)) throw new Error("Invalid month");
  const [year, monthNumber] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const days: string[] = [];
  for (let day = 1; day <= count; day += 1) {
    days.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  return days;
}

export function shiftMonth(month: string, delta: number): string {
  if (!isRealMonth(month)) throw new Error("Invalid month");
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function firstBookableMonth(now: Date): string {
  return addDays(chicagoToday(now), studio.leadDays).slice(0, 7);
}

export function lastBookableMonth(now: Date): string {
  return addDays(chicagoToday(now), studio.horizonDays).slice(0, 7);
}

export function nextOpenDate(now: Date, minimumDays: number, taken: readonly string[] = []): string {
  let iso = addDays(chicagoToday(now), minimumDays);
  for (let i = 0; i < 70; i += 1) {
    const closed = studio.closedWeekdays.includes(weekdayName(iso) as (typeof studio.closedWeekdays)[number]);
    if (!closed && !taken.includes(iso)) return iso;
    iso = addDays(iso, 1);
  }
  throw new Error("No open date");
}

export function daysBetween(laterISO: string, earlierISO: string): number {
  const later = Date.parse(`${laterISO}T00:00:00Z`);
  const earlier = Date.parse(`${earlierISO}T00:00:00Z`);
  return Math.round((later - earlier) / 86_400_000);
}
