import type { FormalGroup, FormalSlot, SlotResult } from "./types";
import { formatClock, formatDuration } from "./time";

export type SlotOptions = {
  baseMinutes: number;
  largeGroupThreshold: number;
  extraMinutesPerPerson: number;
};

export const DEFAULT_SLOT_OPTIONS: SlotOptions = {
  baseMinutes: 2,
  largeGroupThreshold: 6,
  extraMinutesPerPerson: 0.5,
};

export function groupMinutes(count: number, options: SlotOptions): number {
  const people = Math.max(1, count);
  const extra = Math.max(0, people - options.largeGroupThreshold);
  const raw = options.baseMinutes + extra * options.extraMinutesPerPerson;
  return Math.round(raw * 2) / 2;
}

export function slotFormals(
  groups: FormalGroup[],
  window: { start: number; end: number } | null,
  options: SlotOptions = DEFAULT_SLOT_OPTIONS,
): SlotResult {
  let cursor = window?.start ?? null;
  const slots: FormalSlot[] = groups.map((group) => {
    const minutes = groupMinutes(group.count, options);
    if (cursor == null || window == null) {
      return { ...group, minutes, start: null, end: null, overflows: false };
    }
    const start = cursor;
    const end = cursor + minutes;
    cursor = end;
    return {
      ...group,
      minutes,
      start,
      end,
      overflows: end > window.end,
    };
  });

  const totalMinutes = slots.reduce((sum, slot) => sum + slot.minutes, 0);
  const windowMinutes = window ? window.end - window.start : null;
  let warning: string | null = null;
  if (groups.length && windowMinutes == null) {
    warning = `No family-formals window on the timeline. ${groups.length} groups need about ${formatDuration(totalMinutes)}.`;
  } else if (windowMinutes != null && totalMinutes > windowMinutes) {
    warning = `${groups.length} groups need ${formatDuration(totalMinutes)} and the window is ${formatDuration(windowMinutes)}. Ask the planner for ${formatDuration(totalMinutes - windowMinutes)} more, or cut groups.`;
  }

  return {
    slots,
    totalMinutes,
    windowMinutes,
    windowStart: window?.start ?? null,
    windowEnd: window?.end ?? null,
    warning,
  };
}

export function formatSlotClock(slot: FormalSlot): string {
  if (slot.start == null) return `${trimMinutes(slot.minutes)} min`;
  const start = formatClock(slot.start);
  return `${start} · ${trimMinutes(slot.minutes)} min`;
}

function trimMinutes(minutes: number): string {
  return Number.isInteger(minutes) ? String(minutes) : String(minutes);
}
