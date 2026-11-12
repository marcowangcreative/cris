import { buildSchedule, membersForDay, toDurations } from "./schedule";
import { fmtDate, fmtTime, parseTime } from "./time";
import type { PlannerEvent, Stylist } from "./types";
import { specialtyLabel } from "./types";

function slotLabel(type: string): string {
  if (type === "touchup") return "Touch-up";
  if (type === "hair") return "Hair";
  return "Makeup";
}

export function timelineText(event: PlannerEvent, stylists: readonly Stylist[]): string {
  const assigned = stylists.filter((stylist) => event.stylistIds.includes(stylist.id));
  const lines = [`${event.coupleName || "Event"} — hair & makeup timeline`];
  const place = [event.venue, event.location].filter(Boolean).join(", ");
  if (place) lines.push(place);
  if (event.room) lines.push(`Getting ready: ${event.room}`);
  lines.push("");

  for (const day of event.days) {
    const party = membersForDay(event.members, day.id, event.days.length);
    const schedule = buildSchedule(party, assigned, day.readyBy, toDurations(event), day.id, {
      callTime: day.callTime,
      travelBufferMins: day.travelBufferMins,
    });
    const heading = [day.label, day.date ? fmtDate(day.date) : ""].filter(Boolean).join(" · ");
    if (heading) lines.push(heading);
    if (day.readyBy && parseTime(day.readyBy) !== null) lines.push(`Ready by ${fmtTime(parseTime(day.readyBy)!)}`);
    if (schedule.start !== null) lines.push(`Styling begins ${fmtTime(schedule.start)}`);
    if (day.callTime) {
      const travel = day.travelBufferMins > 0 ? ` · ${day.travelBufferMins} min travel` : "";
      lines.push(`Artist call ${fmtTime(parseTime(day.callTime)!)}${travel}`);
    }
    lines.push("");
    for (const track of schedule.tracks) {
      lines.push(`${track.stylist.name} · ${specialtyLabel(track.stylist.specialty)}`);
      for (const slot of track.slots) {
        lines.push(`  ${fmtTime(slot.start)} – ${fmtTime(slot.end)}  ${slot.name} · ${slotLabel(slot.type)} (${slot.dur} min)`);
      }
      lines.push("");
    }
    for (const conflict of schedule.conflicts) lines.push(`Warning: ${conflict.message}`);
    if (schedule.conflicts.length) lines.push("");
  }

  if (event.notes) lines.push(event.notes);
  return lines.join("\n").trim();
}
