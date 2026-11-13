import { DateTime } from "luxon";
import type { AvailabilityDay } from "./types";

const AVAILABLE_TIMES = "https://api.calendly.com/event_type_available_times";

export interface CalendlyTime {
  startTime: string;
}

/**
 * One Calendly window. The API allows at most seven days between start_time and end_time.
 * The token is sent as a header and is never written into the URL or the result.
 */
export async function fetchCalendlyAvailableTimes(options: {
  token: string;
  eventTypeUri: string;
  startTime: string;
  endTime: string;
  fetchImpl?: typeof fetch;
}): Promise<CalendlyTime[]> {
  const url = new URL(AVAILABLE_TIMES);
  url.searchParams.set("event_type", options.eventTypeUri);
  url.searchParams.set("start_time", options.startTime);
  url.searchParams.set("end_time", options.endTime);
  const response = await (options.fetchImpl ?? fetch)(url, {
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Calendly availability failed (${response.status}).`);
  }
  const body = (await response.json()) as {
    collection?: Array<{ start_time?: string }>;
  };
  return (body.collection ?? [])
    .map((item) => item.start_time)
    .filter((value): value is string => Boolean(value))
    .map((startTime) => ({ startTime }));
}

/** Split a range into windows of at most seven days, which is Calendly's limit. */
export function sevenDayWindows(
  start: DateTime,
  end: DateTime,
): Array<{ start: string; end: string }> {
  const windows: Array<{ start: string; end: string }> = [];
  let cursor = start;
  while (cursor < end) {
    const next = cursor.plus({ days: 7 }) < end ? cursor.plus({ days: 7 }) : end;
    const startIso = cursor.toUTC().toISO();
    const endIso = next.toUTC().toISO();
    if (startIso && endIso) windows.push({ start: startIso, end: endIso });
    cursor = next;
  }
  return windows;
}

export function timesToDays(
  starts: string[],
  zone = "America/Chicago",
): AvailabilityDay[] {
  const byDate = new Map<string, string[]>();
  for (const start of starts) {
    const local = DateTime.fromISO(start, { setZone: true }).setZone(zone);
    const date = local.toISODate();
    if (!date || !local.isValid) continue;
    const time = local.toFormat("HH:mm");
    const list = byDate.get(date) ?? [];
    if (!list.includes(time)) list.push(time);
    byDate.set(date, list.sort());
  }
  return [...byDate.entries()].map(([date, times]) => ({
    date,
    status: "open" as const,
    times,
  }));
}

export async function listCalendlyDays(options: {
  token: string;
  eventTypeUri: string;
  start: DateTime;
  end: DateTime;
  fetchImpl?: typeof fetch;
}): Promise<AvailabilityDay[]> {
  const starts: string[] = [];
  for (const window of sevenDayWindows(options.start, options.end)) {
    const times = await fetchCalendlyAvailableTimes({
      token: options.token,
      eventTypeUri: options.eventTypeUri,
      startTime: window.start,
      endTime: window.end,
      fetchImpl: options.fetchImpl,
    });
    starts.push(...times.map((item) => item.startTime));
  }
  return timesToDays(starts);
}
