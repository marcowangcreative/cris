const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseISODate(value: string): Date | null {
  const match = ISO_DATE.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function daysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / 86_400_000);
}

export function monthName(index: number): string {
  return MONTHS[index] ?? "Unknown";
}

export function dayName(index: number): string {
  return DAYS[index] ?? "Unknown";
}

export function shortMonth(index: number): string {
  return monthName(index).slice(0, 3);
}

export function formatISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Thursday of the same weekend. Null when the event is already Monday through Thursday. */
export function weekdayAlternative(event: Date): Date | null {
  const day = event.getDay();
  if (day >= 1 && day <= 4) return null;
  let shift = 4 - day;
  if (shift > 3) shift -= 7;
  if (shift < -3) shift += 7;
  return new Date(event.getFullYear(), event.getMonth(), event.getDate() + shift);
}

/** Same weekday in the softest month of the index. Null when the event is already that month. */
export function offPeakAlternative(event: Date, demandIndex: number[]): Date | null {
  if (demandIndex.length !== 12) return null;
  let lowest = 0;
  for (let month = 1; month < 12; month += 1) {
    if (demandIndex[month] < demandIndex[lowest]) lowest = month;
  }
  if (lowest === event.getMonth()) return null;
  const day = event.getDay();
  for (let date = 1; date <= 28; date += 1) {
    const candidate = new Date(event.getFullYear(), lowest, date);
    if (candidate.getDay() === day) return candidate;
  }
  return null;
}

export function todayISO(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLongDate(iso: string): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  return `${dayName(date.getDay())}, ${monthName(date.getMonth())} ${date.getDate()}, ${date.getFullYear()}`;
}
