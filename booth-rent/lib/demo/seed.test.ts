import { describe, expect, it } from "vitest";
import { previewBillingRun, snapshotFromInvoice, termsFromStylist } from "@/lib/billing/calculate";
import { owesRows } from "@/lib/billing/owes";
import { priorWeekRange } from "@/lib/dates";
import { DEMO_STYLIST_IDS, buildDemoState } from "@/lib/demo/seed";

describe("Lumen Room demo", () => {
  const now = new Date(2026, 10, 12, 15);
  const state = buildDemoState(now);
  const week = priorWeekRange(now);

  it("anchors the open week to Nov 2–8, 2026", () => {
    expect(state.anchorWeekStart).toBe("2026-11-02");
    expect(week).toEqual({ start: "2026-11-02", end: "2026-11-08" });
  });

  it("previews the four billing models with the cap, minimum, and monthly skip", () => {
    const preview = previewBillingRun({
      stylists: state.stylists.map(termsFromStylist),
      weekStart: week.start,
      weekEnd: week.end,
      revenueByStylist: state.suggestedRevenue,
      history: state.invoices.map(snapshotFromInvoice),
    });
    const byId = Object.fromEntries(preview.charges.map((charge) => [charge.stylistId, charge]));

    expect(byId[DEMO_STYLIST_IDS.maya]?.serviceFeeAmount).toBe(200);
    expect(byId[DEMO_STYLIST_IDS.maya]?.totalAmount).toBe(800);
    expect(byId[DEMO_STYLIST_IDS.maya]?.capApplied).toBe(true);
    expect(byId[DEMO_STYLIST_IDS.maya]?.monthlyFeeAlreadyCounted).toBe(800);
    expect(byId[DEMO_STYLIST_IDS.maya]?.retriedFailed).toBe(true);

    expect(byId[DEMO_STYLIST_IDS.andre]?.minimumApplied).toBe(true);
    expect(byId[DEMO_STYLIST_IDS.andre]?.totalAmount).toBe(600);

    expect(byId[DEMO_STYLIST_IDS.priya]?.totalAmount).toBe(750);
    expect(byId[DEMO_STYLIST_IDS.jonah]?.skipped).toBe(true);
    expect(byId[DEMO_STYLIST_IDS.sofia]?.totalAmount).toBe(680);
    expect(byId[DEMO_STYLIST_IDS.sofia]?.capApplied).toBe(false);

    expect(preview.invoiceCount).toBe(4);
    expect(preview.totalAmount).toBe(2830);
  });

  it("does not let Maya's failed invoice consume the cap on the first week of a month", () => {
    const early = buildDemoState(new Date(2026, 10, 2, 12));
    const earlyWeek = priorWeekRange(new Date(2026, 10, 2, 12));
    const preview = previewBillingRun({
      stylists: early.stylists.map(termsFromStylist),
      weekStart: earlyWeek.start,
      weekEnd: earlyWeek.end,
      revenueByStylist: early.suggestedRevenue,
      history: early.invoices.map(snapshotFromInvoice),
    });
    const maya = preview.charges.find((charge) => charge.stylistId === DEMO_STYLIST_IDS.maya);
    const jonah = preview.charges.find((charge) => charge.stylistId === DEMO_STYLIST_IDS.jonah);
    expect(earlyWeek.end).toBe("2026-11-01");
    expect(maya?.monthlyFeeAlreadyCounted).toBe(0);
    expect(maya?.serviceFeeAmount).toBe(315);
    expect(jonah?.skipped).toBe(false);
    expect(jonah?.totalAmount).toBe(2200);
  });

  it("marks Andre overdue and keeps processing off the overdue list", () => {
    const rows = owesRows(state.invoices, state.stylists, "2026-11-12");
    const andre = rows.find((row) => row.stylistId === DEMO_STYLIST_IDS.andre);
    const priya = rows.find((row) => row.stylistId === DEMO_STYLIST_IDS.priya);
    expect(andre?.overdue).toBe(true);
    expect(priya?.status).toBe("processing");
    expect(priya?.overdue).toBe(false);
  });
});
