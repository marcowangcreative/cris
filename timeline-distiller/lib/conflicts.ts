import { samePlace } from "./formals";
import type { Beat, Gap, SlotResult } from "./types";
import { formatClock, formatDuration, parseRange } from "./time";

export function formalsWindowFromBeats(beats: Beat[]): { start: number; end: number } | null {
  const beat = beats.find((item) => item.kind === "family-formals");
  if (!beat) return null;
  const { start, end } = parseRange(beat.time, beat.endTime);
  if (start == null || end == null || end <= start) return null;
  return { start, end };
}

export function detectConflicts(input: {
  beats: Beat[];
  slotted: SlotResult;
  travelBufferMinutes: number;
}): Gap[] {
  const gaps: Gap[] = [];
  if (input.slotted.warning) {
    const formal = input.beats.find((beat) => beat.kind === "family-formals");
    gaps.push(
      gap("formals-window", input.slotted.warning, "ask", formal?.sourceLine ?? null, formal?.sourceExcerpt ?? "", false),
    );
  }

  if (!input.beats.some((beat) => beat.kind === "ceremony")) {
    gaps.push(
      gap(
        "missing-ceremony",
        "No ceremony start on the sheet. Ask the planner what time the processional begins.",
        "ask",
        null,
        "",
        true,
      ),
    );
  }

  const prepPlaces = uniquePlaces(
    input.beats.filter((beat) => beat.kind === "getting-ready").map((beat) => beat.location),
  );
  if (prepPlaces.length >= 2) {
    gaps.push(
      gap(
        "split-prep",
        `Getting ready is in more than one place (${prepPlaces.join(" and ")}). Plan the second shooter, or ask which room the lead covers.`,
        "ask",
        null,
        "",
        true,
      ),
    );
  }

  const timed = input.beats
    .map((beat) => ({ beat, interval: intervalOf(beat) }))
    .filter((item): item is { beat: Beat; interval: { start: number; end: number } } => item.interval != null)
    .toSorted((a, b) => a.interval.start - b.interval.start || a.interval.end - b.interval.end);

  for (let index = 0; index < timed.length - 1; index += 1) {
    const current = timed[index];
    const next = timed[index + 1];
    if (next.interval.start < current.interval.end) {
      gaps.push(
        gap(
          `overlap-${index}`,
          `“${current.beat.title}” (${span(current.interval)}) overlaps “${next.beat.title}” (${span(next.interval)}).`,
          "warning",
          next.beat.sourceLine,
          next.beat.sourceExcerpt,
          false,
        ),
      );
      continue;
    }
    const between = next.interval.start - current.interval.end;
    const left = current.beat.location.trim();
    const right = next.beat.location.trim();
    if (!left || !right || samePlace(left, right)) continue;
    if (between < input.travelBufferMinutes) {
      gaps.push(
        gap(
          `travel-${index}`,
          `${formatDuration(between)} between “${current.beat.title}” (${left}) and “${next.beat.title}” (${right}). The travel buffer is ${formatDuration(input.travelBufferMinutes)}. Ask the planner for the real drive.`,
          "warning",
          next.beat.sourceLine,
          next.beat.sourceExcerpt,
          false,
        ),
      );
    }
  }

  return gaps;
}

function intervalOf(beat: Beat): { start: number; end: number } | null {
  const { start, end } = parseRange(beat.time, beat.endTime);
  if (start == null) return null;
  if (end != null && end > start) return { start, end };
  return { start, end: start };
}

function span(interval: { start: number; end: number }): string {
  if (interval.end === interval.start) return formatClock(interval.start);
  return `${formatClock(interval.start)}–${formatClock(interval.end)}`;
}

function uniquePlaces(places: string[]): string[] {
  const kept: string[] = [];
  for (const place of places) {
    const trimmed = place.trim();
    if (!trimmed) continue;
    if (kept.some((existing) => samePlace(existing, trimmed))) continue;
    kept.push(trimmed);
  }
  return kept;
}

function gap(
  id: string,
  text: string,
  severity: Gap["severity"],
  sourceLine: number | null,
  sourceExcerpt: string,
  inferred: boolean,
): Gap {
  return {
    id,
    text,
    severity,
    source: "detector",
    sourceLine,
    sourceExcerpt,
    inferred,
  };
}
