import { DateTime } from "luxon";
import { evaluateReleaseDates } from "@/lib/domain/availability";
import type { Database } from "@/lib/types";
import type { AvailabilityDay } from "./types";

/** Fake calendar. Open days are the published release; held days are already taken. */
export function mockAvailability(db: Database, now: DateTime): AvailabilityDay[] {
  const batch = db.release_batches.find((item) => item.status === "published");
  if (!batch) return [];
  return evaluateReleaseDates(db, batch.id, now).map((item) => ({
    date: item.date,
    status: item.available ? "open" : "held",
    times: item.available ? ["10:00"] : [],
  }));
}
