import { describe, expect, it } from "vitest";
import { addDays, formatWeekLabel, isMonday, monthRangeContaining, priorWeekRange, weekContaining } from "@/lib/dates";

describe("weeks", () => {
  it("uses the previous Monday–Sunday week for Thursday Nov 12, 2026", () => {
    expect(priorWeekRange(new Date(2026, 10, 12, 15))).toEqual({
      start: "2026-11-02",
      end: "2026-11-08",
    });
  });

  it("uses the previous week when the reference day is itself a Monday", () => {
    expect(priorWeekRange(new Date(2026, 10, 9, 12))).toEqual({
      start: "2026-11-02",
      end: "2026-11-08",
    });
  });

  it("steps back a full week on Sunday", () => {
    expect(priorWeekRange(new Date(2026, 10, 8, 12))).toEqual({
      start: "2026-10-26",
      end: "2026-11-01",
    });
  });

  it("snaps a mid-week date to the Monday of that week", () => {
    expect(weekContaining("2026-11-12")).toEqual({
      start: "2026-11-09",
      end: "2026-11-15",
    });
    expect(isMonday("2026-11-09")).toBe(true);
    expect(isMonday("2026-11-12")).toBe(false);
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2025-12-29", 6)).toBe("2026-01-04");
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("labels a week without shifting the calendar day", () => {
    expect(formatWeekLabel("2026-11-02", "2026-11-08")).toBe("Nov 2 – Nov 8, 2026");
  });
});

describe("months", () => {
  it("returns a half-open month range, including December into January", () => {
    expect(monthRangeContaining("2026-01-04")).toEqual({
      monthStart: "2026-01-01",
      nextMonthStart: "2026-02-01",
    });
    expect(monthRangeContaining("2025-12-31")).toEqual({
      monthStart: "2025-12-01",
      nextMonthStart: "2026-01-01",
    });
  });
});
