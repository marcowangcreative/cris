import { describe, expect, it } from "vitest";
import { backtestInquiries } from "./backtest";
import { createDefaultConfig } from "./defaults";
import type { BacktestInquiry } from "./backtest";

const OCTOBER: BacktestInquiry = {
  id: "oct",
  label: "October Saturday",
  outcome: "booked",
  sample: false,
  eventDate: "2027-10-16",
  inquiryDate: "2026-11-12",
  tierId: "marco",
  marketId: "houston",
  packageId: "signature",
  quotedPrice: 10800,
  qualifiedInquiries: 1,
  bookedDates: 3,
  targetCapacity: 5,
  bookedOnDate: 0,
  travelDaysBlocked: 1,
  chargeStandard: false,
  clientBudget: null,
};

describe("backtest", () => {
  it("compares a sent price with the current model and leaves the sent price in place", () => {
    const report = backtestInquiries([OCTOBER], createDefaultConfig());
    expect(report.lines[0].actual).toBe(10800);
    expect(report.lines[0].model).toBe(12400);
    expect(report.lines[0].delta).toBe(-1600);
    expect(report.lines[0].detail).toContain("unchanged");
    expect(report.bookedCount).toBe(1);
    expect(report.bookedActual).toBe(10800);
    expect(report.bookedModel).toBe(12400);
  });

  it("totals booked and lost rows separately and skips sample rows", () => {
    const lost: BacktestInquiry = { ...OCTOBER, id: "lost", outcome: "lost", quotedPrice: 14000 };
    const sample: BacktestInquiry = { ...OCTOBER, id: "sample", sample: true, quotedPrice: 1 };
    const report = backtestInquiries([OCTOBER, lost, sample], createDefaultConfig());
    expect(report.lines.map((line) => line.id)).toEqual(["oct", "lost"]);
    expect(report.lostCount).toBe(1);
    expect(report.lostActual).toBe(14000);
    expect(report.lostModel).toBe(12400);
    expect(report.bookedActual).toBe(10800);
  });

  it("reports a row the engine cannot price", () => {
    const report = backtestInquiries([{ ...OCTOBER, eventDate: "2027-02-31" }], createDefaultConfig());
    expect(report.lines[0].model).toBeNull();
    expect(report.lines[0].actual).toBe(10800);
    expect(report.bookedCount).toBe(0);
  });
});
