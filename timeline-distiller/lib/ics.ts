import { visibleTo } from "./assemble";
import type { Beat, DaySheet, View } from "./types";
import { clockToIcs, isoToIcsDate, parseDateToIso, parseRange } from "./time";

export function sheetToIcs(sheet: DaySheet, view: View): string | null {
  const iso = parseDateToIso(sheet.date);
  const stamp = iso ? isoToIcsDate(iso) : null;
  if (!stamp) return null;

  const events = sheet.beats.filter((beat) => visibleTo(beat.assignee, view)).flatMap((beat) => {
    const event = beatToEvent(beat, stamp, sheet.couple);
    return event ? [event] : [];
  });
  if (!events.length) return null;

  const name = icsEscape(sheet.couple ? `${sheet.couple} — photo timeline` : "Photo timeline");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Marco Wang Photography//Timeline Distiller//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${name}`,
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function beatToEvent(beat: Beat, day: string, couple: string): string | null {
  const { start, end } = parseRange(beat.time, beat.endTime);
  if (start == null) return null;
  const finish = end != null && end > start ? end : start + 30;
  const summary = icsEscape([beat.title, couple].filter(Boolean).join(" — "));
  const description = icsEscape(
    [beat.whatToShoot, beat.people && `People: ${beat.people}`, beat.inferred ? "Inferred." : ""]
      .filter(Boolean)
      .join("\n"),
  );
  const location = icsEscape([beat.location, beat.address].filter(Boolean).join(", "));
  return [
    "BEGIN:VEVENT",
    `UID:${beat.id}@timeline-distiller`,
    `DTSTAMP:${day}T000000`,
    `DTSTART:${day}T${clockToIcs(start)}`,
    `DTEND:${day}T${clockToIcs(finish)}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : "",
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
