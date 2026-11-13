import { DateTime } from "luxon";
import { readDemoDb } from "@/lib/demo/store";
import { listCalendlyDays } from "./calendly-adapter";
import { mockAvailability } from "./mock-adapter";
import type { AvailabilityResult } from "./types";

export function availabilitySource(
  env: Record<string, string | undefined> = process.env,
): "mock" | "calendly" {
  if (env.CALENDLY_TOKEN && env.CALENDLY_EVENT_TYPE_URI) return "calendly";
  return "mock";
}

/** Default is the fake calendar. Calendly is used only when both server env vars are set. */
export async function loadAvailability(
  env: Record<string, string | undefined> = process.env,
  fetchImpl?: typeof fetch,
): Promise<AvailabilityResult> {
  const source = availabilitySource(env);
  if (source === "mock") {
    return { source, days: mockAvailability(readDemoDb(), DateTime.now()) };
  }
  const start = DateTime.now().plus({ minutes: 5 }).setZone("America/Chicago");
  const end = start.plus({ days: 28 });
  const days = await listCalendlyDays({
    token: env.CALENDLY_TOKEN ?? "",
    eventTypeUri: env.CALENDLY_EVENT_TYPE_URI ?? "",
    start,
    end,
    fetchImpl,
  });
  return { source: "calendly", days };
}
