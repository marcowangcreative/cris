import { allGaps, visibleTo } from "./assemble";
import { formatSlotClock } from "./slotting";
import type { DaySheet, View } from "./types";
import { KIND_LABEL, SEGMENT_LABEL, SEGMENTS } from "./types";
import { formatClock } from "./time";

export function sheetToText(sheet: DaySheet, view: View): string {
  const lines: string[] = [];
  lines.push(sheet.couple || "Wedding");
  if (sheet.date) lines.push(sheet.date);
  lines.push(`Sunset: check sunset${sheet.sunsetNote ? ` — ${sheet.sunsetNote}` : ""}`);
  lines.push(`View: ${viewLabel(view)}`);
  lines.push("");

  if (sheet.contacts.length) {
    lines.push("CONTACTS");
    for (const contact of sheet.contacts) {
      lines.push([contact.role, contact.name, contact.phone].filter(Boolean).join(" — "));
    }
    lines.push("");
  }

  if (sheet.constraints.length) {
    lines.push("HARD RULES");
    for (const constraint of sheet.constraints) lines.push(`- ${constraint.text}`);
    lines.push("");
  }

  if (sheet.locations.length) {
    lines.push("PLACES");
    for (const location of sheet.locations) {
      lines.push(`- ${[location.role, location.name, location.address].filter(Boolean).join(" — ")}`);
    }
    lines.push("");
  }

  lines.push("TIMELINE");
  const beats = sheet.beats.filter((beat) => visibleTo(beat.assignee, view));
  if (!beats.length) lines.push("(Nothing on this view.)");
  for (const beat of beats) {
    const when = [beat.time, beat.endTime].filter(Boolean).join("–");
    const who = beat.assignee === "both" ? "both" : beat.assignee;
    lines.push(`${when || "Time TBD"}  ${beat.title}  [${who}]`);
    if (beat.location) lines.push(`  ${beat.location}`);
    if (beat.whatToShoot) lines.push(`  Shoot: ${beat.whatToShoot}`);
    if (beat.people) lines.push(`  People: ${beat.people}`);
    if (beat.inferred) lines.push("  (inferred)");
    if (beat.sourceLine) lines.push(`  source line ${beat.sourceLine}`);
  }
  lines.push("");

  if (view !== "second" && sheet.formalSlots.slots.length) {
    lines.push("FAMILY FORMALS");
    if (sheet.formalSlots.windowStart != null && sheet.formalSlots.windowEnd != null) {
      lines.push(
        `${formatClock(sheet.formalSlots.windowStart)}–${formatClock(sheet.formalSlots.windowEnd)}`,
      );
    }
    sheet.formalSlots.slots.forEach((slot, index) => {
      const flag = slot.overflows ? "  PAST WINDOW" : "";
      lines.push(`${index + 1}. ${formatSlotClock(slot)}  ${slot.label} (${slot.count}) — ${slot.people}${flag}`);
    });
    if (sheet.formalSlots.warning) lines.push(sheet.formalSlots.warning);
    lines.push("");
  }

  const gaps = allGaps(sheet);
  if (gaps.length) {
    lines.push("ASK THE PLANNER");
    for (const item of gaps) lines.push(`- ${item.text}`);
    lines.push("");
  }

  lines.push("MUST-HAVES");
  for (const segment of SEGMENTS) {
    const items = sheet.checklist.filter(
      (item) => item.segment === segment && visibleTo(item.assignee, view),
    );
    if (!items.length) continue;
    lines.push(SEGMENT_LABEL[segment]);
    for (const item of items) lines.push(`${item.done ? "[x]" : "[ ]"} ${item.text}`);
  }

  if (sheet.notes.trim()) {
    lines.push("");
    lines.push("NOTES");
    lines.push(sheet.notes.trim());
  }

  lines.push("");
  lines.push(`${sheet.demo ? "Demo. " : ""}Small groups ${sheet.baseMinutes} min; groups over 6 get +30 sec per person.`);
  return lines.join("\n");
}

export function viewLabel(view: View): string {
  if (view === "lead") return "Lead";
  if (view === "second") return "Second / associate";
  return "Full sheet";
}

export function beatKindLabel(kind: keyof typeof KIND_LABEL): string {
  return KIND_LABEL[kind];
}
