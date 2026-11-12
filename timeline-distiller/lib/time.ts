/** Minutes from midnight, or null when the string is not a clock time. */
export function parseClock(input: string): number | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute > 59 || hour > 24) {
    return null;
  }
  const meridian = match[3]?.toLowerCase().replace(/\./g, "");
  if (meridian === "pm" && hour < 12) hour += 12;
  if (meridian === "am" && hour === 12) hour = 0;
  if (!meridian && hour >= 24) return null;
  if (hour === 24) return minute === 0 ? 0 : null;
  if (hour > 23) return null;
  return hour * 60 + minute;
}

export function parseRange(
  time: string,
  endTime: string,
): { start: number | null; end: number | null } {
  const end = endTime.trim();
  if (!end) {
    const range = time
      .trim()
      .match(/^(.+?)\s*(?:–|—|-|to)\s*(.+)$/i);
    if (range) {
      return { start: parseClock(range[1]), end: parseClock(range[2]) };
    }
  }
  return { start: parseClock(time), end: end ? parseClock(end) : null };
}

export function formatClock(minutes: number): string {
  const day = 24 * 60;
  const normalized = ((Math.round(minutes) % day) + day) % day;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const meridian = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridian}`;
}

export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes * 10) / 10;
  if (rounded < 60) return `${trimNumber(rounded)} min`;
  const hours = Math.floor(rounded / 60);
  const rest = Math.round(rounded - hours * 60);
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

const MONTHS: Record<string, string> = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sept: "09",
  sep: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12",
};

/** ISO date `YYYY-MM-DD`, or null. US slash dates are month/day/year. */
export function parseDateToIso(input: string): string | null {
  const iso = input.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = input.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${slash[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const named = input
    .toLowerCase()
    .match(
      /\b(january|february|march|april|may|june|july|august|september|sept|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/,
    );
  if (!named) return null;
  const month = MONTHS[named[1]];
  const day = Number(named[2]);
  if (!month || day < 1 || day > 31) return null;
  return `${named[3]}-${month}-${String(day).padStart(2, "0")}`;
}

export function isoToIcsDate(iso: string): string | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return `${match[1]}${match[2]}${match[3]}`;
}

export function clockToIcs(minutes: number): string {
  const day = 24 * 60;
  const normalized = ((Math.round(minutes) % day) + day) % day;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;
}
