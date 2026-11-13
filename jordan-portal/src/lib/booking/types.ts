/** A day the studio can show on its own calendar. Shared by every concept. */
export interface AvailabilityDay {
  /** Calendar date in America/Chicago, YYYY-MM-DD. */
  date: string;
  status: "open" | "held";
  /** Local times as HH:mm. Open days from the mock adapter are 10:00 only. */
  times: string[];
}

export interface AvailabilityResult {
  source: "mock" | "calendly";
  days: AvailabilityDay[];
}
