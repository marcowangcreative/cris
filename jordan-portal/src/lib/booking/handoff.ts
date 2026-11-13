import { DateTime } from "luxon";
import { RULES } from "@/lib/rules";
import type { AvailabilityDay } from "./types";

export const FAKE_CONFIRMATION =
  "Fake confirmation. Calendly is not connected, and no deposit was charged.";

/** Editorial palette, without the leading hash, for a Calendly embed. */
export const EDITORIAL_CALENDLY_COLORS = {
  background: "f4efe6",
  text: "1a1612",
  primary: "4a0e14",
} as const;

export function chooseOpenDate(
  days: AvailabilityDay[],
  date: string,
): { ok: true; date: string; times: string[] } | { ok: false; error: string } {
  const day = days.find((item) => item.date === date);
  if (!day) return { ok: false, error: "That date is not in this release." };
  if (day.status !== "open" || day.times.length === 0) {
    return { ok: false, error: "That date is held." };
  }
  return { ok: true, date: day.date, times: day.times };
}

export interface BookingSummary {
  date: string;
  time: string;
  minimumCents: number;
  depositCents: number;
}

export function summarizeSelection(date: string, time: string): BookingSummary {
  return {
    date,
    time,
    minimumCents: RULES.transformationMinimumCents,
    depositCents: RULES.depositCents,
  };
}

export type Handoff =
  | { mode: "mock"; label: string; summary: BookingSummary }
  | { mode: "live"; url: string; summary: BookingSummary };

/**
 * Mock mode never builds a Calendly URL. Live mode is a slot link with the
 * Editorial colors, used by the popup widget or opened directly.
 */
export function buildHandoff(input: {
  live: boolean;
  eventUrl: string;
  date: string;
  time: string;
}): Handoff {
  const summary = summarizeSelection(input.date, input.time);
  if (!input.live) {
    return { mode: "mock", label: FAKE_CONFIRMATION, summary };
  }
  const local = DateTime.fromISO(`${input.date}T${input.time}`, {
    zone: "America/Chicago",
  });
  const iso = local.toFormat("yyyy-MM-dd'T'HH:mm:ssZZ");
  const base = input.eventUrl.replace(/\/$/, "");
  const url = new URL(`${base}/${iso}`);
  url.searchParams.set("background_color", EDITORIAL_CALENDLY_COLORS.background);
  url.searchParams.set("text_color", EDITORIAL_CALENDLY_COLORS.text);
  url.searchParams.set("primary_color", EDITORIAL_CALENDLY_COLORS.primary);
  return { mode: "live", url: url.toString(), summary };
}
