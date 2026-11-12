import type { EventDay, Stylist } from "./types";
import type { Slot } from "./schedule";

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Floating local time so the artist's calendar shows the venue clock, not UTC. */
export function icsStamp(date: string, minutes: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const base = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  const shift = Math.floor(minutes / 1440);
  const within = minutes - shift * 1440;
  base.setUTCDate(base.getUTCDate() + shift);
  const hours = Math.floor(within / 60);
  const mins = within % 60;
  return `${base.getUTCFullYear()}${pad(base.getUTCMonth() + 1)}${pad(base.getUTCDate())}T${pad(hours)}${pad(mins)}00`;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function artistDayIcs(input: {
  stylist: Pick<Stylist, "id" | "name">;
  day: Pick<EventDay, "date" | "label">;
  coupleName: string;
  location: string;
  slots: readonly Slot[];
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Flowed//Beauty Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  const date = input.day.date || "19700101";
  input.slots.forEach((slot, index) => {
    const summary = `${slot.name} · ${slot.type === "touchup" ? "Touch-up" : slot.type === "hair" ? "Hair" : "Makeup"}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${input.stylist.id}-${slot.memberId}-${slot.type}-${date}-${index}@flowed`,
      `DTSTAMP:${icsStamp(input.day.date || "1970-01-01", 0)}`,
      `DTSTART:${icsStamp(input.day.date || "1970-01-01", slot.start)}`,
      `DTEND:${icsStamp(input.day.date || "1970-01-01", slot.end)}`,
      `SUMMARY:${escapeText(summary)}`,
      `LOCATION:${escapeText(input.location)}`,
      `DESCRIPTION:${escapeText(`${input.coupleName} · ${input.day.label} · ${input.stylist.name}`)}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
