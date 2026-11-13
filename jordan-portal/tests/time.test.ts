import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { isTenAmChicago, monthOpenedOn, suggestedReleaseInstant } from "@/lib/domain/time";

describe("10:00 a.m. America/Chicago across DST", () => {
  it("accepts 10:00 local and rejects the same UTC hour on the other side of DST", () => {
    expect(isTenAmChicago("2026-01-15T16:00:00.000Z")).toBe(true);
    expect(isTenAmChicago("2026-01-15T15:00:00.000Z")).toBe(false);
    expect(isTenAmChicago("2026-07-15T15:00:00.000Z")).toBe(true);
    expect(isTenAmChicago("2026-07-15T16:00:00.000Z")).toBe(false);
    expect(isTenAmChicago("2026-03-08T15:00:00.000Z")).toBe(true);
    expect(isTenAmChicago("2026-03-08T16:00:00.000Z")).toBe(false);
    expect(isTenAmChicago("2026-11-01T16:00:00.000Z")).toBe(true);
    expect(isTenAmChicago("2026-11-01T15:00:00.000Z")).toBe(false);
    expect(isTenAmChicago("2026-01-15T16:30:00.000Z")).toBe(false);
  });

  it("opens the month two months ahead, February 1 to April", () => {
    const febFirst = DateTime.fromObject(
      { year: 2026, month: 2, day: 1, hour: 9 },
      { zone: "America/Chicago" },
    );
    expect(monthOpenedOn(febFirst)).toEqual({ year: 2026, month: 4 });
  });

  it("places a 9:00 a.m. release on November 1 in standard time", () => {
    const instant = suggestedReleaseInstant(2027, 1);
    expect(instant.year).toBe(2026);
    expect(instant.month).toBe(11);
    expect(instant.day).toBe(1);
    expect(instant.hour).toBe(9);
    expect(instant.minute).toBe(0);
    expect(instant.offset).toBe(-360);
  });
});
