import { DateTime } from "luxon";
import type { Database } from "@/lib/types";
import { commitmentIsActive } from "./availability";

function icsStamp(dt: DateTime): string {
  return dt.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
}

/** Sanitized conflict feed. No names, notes, venues, or contact details. */
export function buildConflictIcs(db: Database, now: DateTime): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jordan Wang Demo//Conflicts//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Studio unavailable",
  ];
  for (const commitment of db.commitments) {
    if (!commitmentIsActive(commitment, now)) continue;
    const start = DateTime.fromISO(commitment.starts_at, { setZone: true });
    const end = DateTime.fromISO(commitment.ends_at, { setZone: true });
    if (!start.isValid || !end.isValid) continue;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${commitment.id}@conflicts.jordanwangco.example`);
    lines.push(`DTSTAMP:${icsStamp(now)}`);
    lines.push(`DTSTART:${icsStamp(start)}`);
    lines.push(`DTEND:${icsStamp(end)}`);
    lines.push("SUMMARY:Unavailable");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
