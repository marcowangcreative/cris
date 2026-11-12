/** Clock helpers. Minutes are counted from midnight and may be negative (previous day). */

export function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function fmtTime(mins: number): string {
  const day = Math.floor(mins / 1440);
  const within = mins - day * 1440;
  const hours = Math.floor(within / 60);
  const minutes = within % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const label = `${hour12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
  if (day < 0) return `${label} (−${-day}d)`;
  if (day > 0) return `${label} (+${day}d)`;
  return label;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Whole days from the local calendar date until `iso` (YYYY-MM-DD). */
export function daysUntil(iso: string | null | undefined, today = new Date()): number | null {
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  const target = new Date(year, month - 1, day);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}
