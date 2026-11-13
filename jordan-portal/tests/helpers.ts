import { DateTime } from "luxon";
import { createSeedDatabase } from "@/lib/demo/seed";
import type { Database } from "@/lib/types";

export function cloneSeed(): Database {
  return structuredClone(createSeedDatabase());
}

export const STUDIO_NOW = DateTime.fromISO("2026-11-13T18:00:00.000Z", {
  setZone: true,
});

export const STUDIO_NOW_ISO = "2026-11-13T18:00:00.000Z";
