import { DateTime } from "luxon";
import type { Booking } from "@/lib/types";

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts = [line.slice(0, 73)];
  let rest = line.slice(73);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 72)}`);
    rest = rest.slice(72);
  }
  return parts.join("\r\n");
}

export function buildIcs(booking: Booking, now = new Date()): string {
  const start = DateTime.fromISO(`${booking.date}T${booking.startTime}`, { zone: booking.timezone });
  if (!start.isValid) throw new Error("Invalid event time");
  const end = start.plus({ minutes: booking.quote.durationMinutes });
  const stamp = DateTime.fromJSDate(now).toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
  const asUtc = (value: DateTime) => value.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
  const summary = `Camara Wong · ${booking.intake?.eventName ?? booking.quote.packageName}`;
  const description = [
    booking.quote.packageName,
    booking.intake?.venueAddress ?? "",
    booking.intake ? `Gallery: ${booking.intake.galleryEmail}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Camara Wong//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@camarawong.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${asUtc(start)}`,
    `DTEND:${asUtc(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(booking.intake?.venueAddress ?? "Houston")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(fold).join("\r\n")}\r\n`;
}
