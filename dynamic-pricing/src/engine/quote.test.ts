import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "./defaults";
import { quotePrice, seasonalPercent } from "./quote";
import type { HistorySignal, PricingConfig, Quote, QuoteInput } from "./types";

const NOTES_EXAMPLE: QuoteInput = {
  eventDate: "2027-10-16",
  inquiryDate: "2026-11-12",
  marketId: "houston",
  packageId: "signature",
  qualifiedInquiries: 1,
  bookedDates: 3,
  targetCapacity: 5,
  travelDaysBlocked: 1,
};

function price(input: QuoteInput, config: PricingConfig = createDefaultConfig()): Quote {
  const result = quotePrice(input, config);
  if (!result.ok) throw new Error(result.error);
  return result.quote;
}

function withObjective(objective: PricingConfig["objective"]): PricingConfig {
  return { ...createDefaultConfig(), objective };
}

describe("illustrative Houston October Saturday", () => {
  const quote = price(NOTES_EXAMPLE);

  it("matches the notes example before $50 rounding", () => {
    expect(quote.dayName).toBe("Saturday");
    expect(quote.monthName).toBe("October");
    expect(quote.demandIndex).toBe(135);
    expect(quote.daysUntilEvent).toBe(338);
    expect(quote.basePrice).toBe(10800);
    expect(quote.adjustmentBeforeObjective).toBeCloseTo(0.15, 8);
    expect(quote.unroundedQuote).toBe(12420);
    expect(quote.suggestedQuote).toBe(12400);
    expect(quote.minimumAcceptable).toBe(11800);
    expect(quote.floor).toBe(9200);
    expect(quote.ceiling).toBe(12950);
    expect(quote.clamped).toBe("none");
    expect(quote.premiumHeld).toBe(false);
  });

  it("explains each adjustment in plain language", () => {
    const ids = quote.adjustments.map((item) => item.id);
    expect(ids).toEqual(["season", "day", "lead", "inquiry", "utilization", "scarcity", "travel", "history", "objective", "corridor"]);
    for (const adjustment of quote.adjustments) {
      expect(adjustment.explanation.length).toBeGreaterThan(20);
    }
    expect(quote.adjustments[0].explanation).toContain("October");
    expect(quote.adjustments[0].explanation).toContain("+10.0%");
    expect(quote.adjustments[1].explanation).toContain("Saturday");
    expect(quote.adjustments[1].explanation).toContain("+5.0%");
    expect(quote.floorExplanation).toContain("$11,800");
  });

  it("stays at medium confidence while the weights are still assumptions", () => {
    expect(quote.confidence.score).toBe(50);
    expect(quote.confidence.level).toBe("medium");
    expect(quote.confidence.summary.toLowerCase()).toContain("medium");
  });
});

describe("corridor clamping", () => {
  it("holds a stacked peak date at the ceiling", () => {
    const quote = price(
      {
        ...NOTES_EXAMPLE,
        qualifiedInquiries: 6,
        bookedDates: 8,
        targetCapacity: 5,
        travelDaysBlocked: 4,
      },
      withObjective("maximize_revenue"),
    );
    expect(quote.adjustmentAfterObjective).toBeGreaterThan(0.2);
    expect(quote.adjustmentAfterCorridor).toBeCloseTo(0.2, 8);
    expect(quote.clamped).toBe("ceiling");
    expect(quote.suggestedQuote).toBe(12950);
    expect(quote.ceiling).toBe(12950);
    expect(quote.suggestedQuote).toBeLessThanOrEqual(quote.ceiling);
    expect(quote.adjustments.find((item) => item.id === "corridor")?.explanation).toContain("ceiling");
  });

  it("holds a soft midweek date at the floor", () => {
    const quote = price(
      {
        eventDate: "2027-08-04",
        inquiryDate: "2027-07-21",
        marketId: "houston",
        packageId: "signature",
        qualifiedInquiries: 0,
        bookedDates: 0,
        targetCapacity: 4,
        travelDaysBlocked: 1,
      },
      withObjective("fill_dates"),
    );
    expect(quote.dayName).toBe("Wednesday");
    expect(quote.demandIndex).toBe(60);
    expect(quote.adjustmentAfterObjective).toBeLessThan(-0.15);
    expect(quote.adjustmentAfterCorridor).toBeCloseTo(-0.15, 8);
    expect(quote.clamped).toBe("floor");
    expect(quote.unroundedQuote).toBe(9180);
    expect(quote.suggestedQuote).toBe(9200);
    expect(quote.minimumAcceptable).toBeLessThanOrEqual(quote.suggestedQuote);
    expect(quote.suggestedQuote).toBeGreaterThanOrEqual(quote.floor);
  });

  it("respects a tighter corridor from settings", () => {
    const config = createDefaultConfig();
    const marco = config.tiers.find((tier) => tier.id === "marco");
    if (!marco) throw new Error("missing Marco tier");
    marco.maxReduction = 0.1;
    marco.maxPremium = 0.1;
    const quote = price(NOTES_EXAMPLE, config);
    expect(quote.clamped).toBe("ceiling");
    expect(quote.ceiling).toBe(11850);
    expect(quote.suggestedQuote).toBe(11850);
    expect(quote.floor).toBe(9750);
  });
});

describe("pricing rules", () => {
  it("orders objectives from fill dates to maximize revenue", () => {
    const fill = price(NOTES_EXAMPLE, withObjective("fill_dates")).suggestedQuote;
    const balanced = price(NOTES_EXAMPLE, withObjective("balanced")).suggestedQuote;
    const revenue = price(NOTES_EXAMPLE, withObjective("maximize_revenue")).suggestedQuote;
    expect(revenue).toBe(12850);
    expect(balanced).toBe(12400);
    expect(fill).toBe(11800);
    expect(revenue).toBeGreaterThan(balanced);
    expect(balanced).toBeGreaterThan(fill);
  });

  it("uses the market's own seasonality index", () => {
    const input: QuoteInput = {
      eventDate: "2027-01-16",
      inquiryDate: "2026-08-01",
      marketId: "houston",
      packageId: "signature",
      qualifiedInquiries: 1,
      bookedDates: 3,
      targetCapacity: 5,
      travelDaysBlocked: 1,
    };
    const houston = price(input);
    const aspen = price({ ...input, marketId: "aspen" });
    expect(houston.dayName).toBe("Saturday");
    expect(houston.demandIndex).toBe(95);
    expect(aspen.demandIndex).toBe(140);
    expect(aspen.suggestedQuote).toBeGreaterThan(houston.suggestedQuote);
    expect(houston.suggestedQuote).toBe(11200);
    expect(aspen.suggestedQuote).toBe(12550);
  });

  it("charges for extra travel days without treating them as full weddings", () => {
    const input: QuoteInput = {
      eventDate: "2027-02-04",
      inquiryDate: "2026-08-01",
      marketId: "houston",
      packageId: "signature",
      qualifiedInquiries: 1,
      bookedDates: 3,
      targetCapacity: 5,
      travelDaysBlocked: 1,
    };
    const local = price(input);
    const trip = price({ ...input, travelDaysBlocked: 3 });
    expect(local.dayName).toBe("Thursday");
    expect(local.suggestedQuote).toBe(10950);
    expect(trip.suggestedQuote).toBe(12250);
    expect(trip.adjustments.find((item) => item.id === "travel")?.percent).toBeCloseTo(0.12, 8);
    expect(trip.revenuePerBlockedDay).toBeLessThan(local.basePrice);
  });

  it("raises the quote when more inquiries compete for the date", () => {
    const input: QuoteInput = {
      eventDate: "2027-02-04",
      inquiryDate: "2026-08-01",
      marketId: "houston",
      packageId: "signature",
      qualifiedInquiries: 1,
      bookedDates: 3,
      targetCapacity: 5,
      travelDaysBlocked: 1,
    };
    const quiet = price(input);
    const busy = price({ ...input, qualifiedInquiries: 3 });
    expect(busy.suggestedQuote).toBe(11500);
    expect(busy.suggestedQuote).toBeGreaterThan(quiet.suggestedQuote);
    expect(busy.adjustments.find((item) => item.id === "inquiry")?.percent).toBeCloseTo(0.05, 8);
  });

  it("raises the quote as the month fills", () => {
    const input: QuoteInput = {
      eventDate: "2027-02-04",
      inquiryDate: "2026-08-01",
      marketId: "houston",
      packageId: "signature",
      qualifiedInquiries: 1,
      bookedDates: 3,
      targetCapacity: 5,
      travelDaysBlocked: 1,
    };
    const neutral = price(input);
    const full = price({ ...input, bookedDates: 5, targetCapacity: 5 });
    expect(full.suggestedQuote).toBe(11600);
    expect(full.suggestedQuote).toBeGreaterThan(neutral.suggestedQuote);
    expect(full.utilization).toBe(1);
  });

  it("does not quote a peak Saturday below the package base", () => {
    const quote = price({
      eventDate: "2027-03-06",
      inquiryDate: "2027-02-24",
      marketId: "houston",
      packageId: "signature",
      qualifiedInquiries: 0,
      bookedDates: 0,
      targetCapacity: 4,
      travelDaysBlocked: 1,
    });
    expect(quote.dayName).toBe("Saturday");
    expect(quote.demandIndex).toBe(120);
    expect(quote.premiumHeld).toBe(true);
    expect(quote.suggestedQuote).toBe(10800);
    expect(quote.minimumAcceptable).toBe(10800);
    expect(quote.adjustments.some((item) => item.id === "premium-hold")).toBe(true);
  });

  it("lets fill-dates soften a peak Saturday only to the configured floor", () => {
    const quote = price(
      {
        eventDate: "2027-03-06",
        inquiryDate: "2027-02-24",
        marketId: "houston",
        packageId: "signature",
        qualifiedInquiries: 0,
        bookedDates: 0,
        targetCapacity: 4,
        travelDaysBlocked: 1,
      },
      withObjective("fill_dates"),
    );
    expect(quote.premiumHeld).toBe(true);
    expect(quote.suggestedQuote).toBe(10500);
    expect(quote.minimumAcceptable).toBe(10500);
    expect(quote.suggestedQuote).toBeGreaterThanOrEqual(quote.floor);
  });

  it("ignores sample history and nudges after real wins", () => {
    const samples: HistorySignal[] = Array.from({ length: 6 }, () => ({
      marketId: "houston",
      outcome: "booked" as const,
      sample: true,
    }));
    expect(price({ ...NOTES_EXAMPLE, history: samples }).suggestedQuote).toBe(12400);

    const wins: HistorySignal[] = Array.from({ length: 4 }, () => ({
      marketId: "houston",
      outcome: "booked" as const,
    }));
    const nudged = price({ ...NOTES_EXAMPLE, history: wins });
    expect(nudged.suggestedQuote).toBe(12650);
    expect(nudged.confidence.score).toBeGreaterThan(50);

    const pending: HistorySignal[] = Array.from({ length: 4 }, () => ({
      marketId: "houston",
      outcome: "pending" as const,
    }));
    expect(price({ ...NOTES_EXAMPLE, history: pending }).suggestedQuote).toBe(12400);

    const aspenWins: HistorySignal[] = Array.from({ length: 4 }, () => ({
      marketId: "aspen",
      outcome: "booked" as const,
    }));
    expect(price({ ...NOTES_EXAMPLE, history: aspenWins }).suggestedQuote).toBe(12400);
  });

  it("keeps the same answer for the same inputs", () => {
    const first = price(NOTES_EXAMPLE);
    const second = price(NOTES_EXAMPLE);
    expect(second).toEqual(first);
  });

  it("rounds every suggested quote to the increment and keeps the minimum inside it", () => {
    const cases: QuoteInput[] = [
      NOTES_EXAMPLE,
      { ...NOTES_EXAMPLE, packageId: "petite", travelDaysBlocked: 3, qualifiedInquiries: 4 },
      { ...NOTES_EXAMPLE, marketId: "carmel", eventDate: "2027-08-04", inquiryDate: "2027-07-01" },
      { ...NOTES_EXAMPLE, eventDate: "2027-07-08", inquiryDate: "2027-07-01", bookedDates: 0, targetCapacity: 4 },
    ];
    for (const input of cases) {
      for (const objective of ["balanced", "maximize_revenue", "fill_dates"] as const) {
        const quote = price(input, withObjective(objective));
        expect(quote.suggestedQuote % 50).toBe(0);
        expect(quote.minimumAcceptable % 50).toBe(0);
        expect(quote.minimumAcceptable).toBeLessThanOrEqual(quote.suggestedQuote);
        expect(quote.suggestedQuote).toBeGreaterThanOrEqual(quote.floor);
        expect(quote.suggestedQuote).toBeLessThanOrEqual(quote.ceiling);
      }
    }
  });
});

describe("seasonalPercent", () => {
  it("turns Houston's October index into a 10% premium", () => {
    const config = createDefaultConfig();
    expect(seasonalPercent(135, config.weights)).toBeCloseTo(0.1, 8);
    expect(seasonalPercent(100, config.weights)).toBeCloseTo(0, 8);
    expect(seasonalPercent(60, config.weights)).toBeCloseTo(-40 / 35 / 10, 8);
  });
});

const LOW_SEASON: QuoteInput = {
  eventDate: "2027-08-04",
  inquiryDate: "2027-02-04",
  marketId: "houston",
  packageId: "signature",
  qualifiedInquiries: 1,
  bookedDates: 3,
  targetCapacity: 5,
  travelDaysBlocked: 1,
};

describe("standard rate, budget, and manual price", () => {
  it("discounts a low-season date when nobody has said they can pay the base", () => {
    const quote = price(LOW_SEASON);
    expect(quote.dayName).toBe("Wednesday");
    expect(quote.demandIndex).toBe(60);
    expect(quote.modelQuote).toBe(9350);
    expect(quote.suggestedQuote).toBe(9350);
    expect(quote.suggestedQuote).toBeLessThan(quote.basePrice);
    expect(quote.standardRateHeld).toBe(false);
    expect(quote.budgetSupportsStandard).toBe(false);
    expect(quote.standardRateNote).toBeNull();
    expect(quote.discountAvoided).toBe(0);
    expect(quote.smallerPackage).toBeNull();
  });

  it("holds a charge-standard quote at the base or higher and drops the seasonal discount", () => {
    const quote = price({ ...LOW_SEASON, chargeStandard: true });
    expect(quote.suggestedQuote).toBe(10800);
    expect(quote.suggestedQuote).toBeGreaterThanOrEqual(quote.basePrice);
    expect(quote.minimumAcceptable).toBeGreaterThanOrEqual(quote.basePrice);
    expect(quote.modelQuote).toBe(9350);
    expect(quote.discountAvoided).toBe(1450);
    expect(quote.standardRateHeld).toBe(true);
    expect(quote.adjustments.find((item) => item.id === "charge-standard")?.explanation).toContain("Charge standard");
  });

  it("keeps a peak premium when charge standard only removes discounts", () => {
    const quiet = price(NOTES_EXAMPLE);
    const held = price({ ...NOTES_EXAMPLE, chargeStandard: true });
    expect(held.suggestedQuote).toBe(quiet.suggestedQuote);
    expect(held.suggestedQuote).toBeGreaterThan(held.basePrice);
    expect(held.discountAvoided).toBe(0);

    const shortNotice = price({
      ...NOTES_EXAMPLE,
      inquiryDate: "2027-10-06",
      chargeStandard: true,
    });
    expect(shortNotice.daysUntilEvent).toBe(10);
    expect(shortNotice.modelQuote).toBe(12150);
    expect(shortNotice.suggestedQuote).toBe(12400);
    expect(shortNotice.discountAvoided).toBe(250);
    expect(shortNotice.suggestedQuote).toBeGreaterThan(shortNotice.basePrice);
  });

  it("flags a budget at or above base and does not apply the seasonal discount", () => {
    const covered = price({ ...LOW_SEASON, clientBudget: 15000 });
    expect(covered.budgetSupportsStandard).toBe(true);
    expect(covered.standardRateNote).toBe("budget supports standard rate, discount not needed");
    expect(covered.adjustments.find((item) => item.id === "budget")?.explanation).toContain(
      "budget supports standard rate, discount not needed",
    );
    expect(covered.suggestedQuote).toBe(10800);
    expect(covered.modelQuote).toBe(9350);
    expect(covered.discountAvoided).toBe(1450);
    expect(covered.minimumAcceptable).toBeGreaterThanOrEqual(covered.basePrice);

    const exact = price({ ...LOW_SEASON, clientBudget: 10800 });
    expect(exact.suggestedQuote).toBe(10800);
    expect(exact.standardRateNote).toBe("budget supports standard rate, discount not needed");

    const tight = price({ ...LOW_SEASON, clientBudget: 9000 });
    expect(tight.suggestedQuote).toBe(9350);
    expect(tight.budgetSupportsStandard).toBe(false);
    expect(tight.standardRateNote).toBeNull();
    expect(tight.discountAvoided).toBe(0);
  });

  it("does not pull a peak quote down just because a budget was stated", () => {
    const quote = price({ ...NOTES_EXAMPLE, clientBudget: 20000 });
    expect(quote.suggestedQuote).toBe(12400);
    expect(quote.discountAvoided).toBe(0);
    expect(quote.standardRateNote).toBe("budget supports standard rate, discount not needed");
  });

  it("uses a manual price at or above the base, and raises one that is below it", () => {
    const above = price({ ...LOW_SEASON, manualPrice: 12500 });
    expect(above.suggestedQuote).toBe(12500);
    expect(above.manualPrice).toBe(12500);
    expect(above.modelQuote).toBe(9350);
    expect(above.discountAvoided).toBe(3150);
    expect(above.standardRateHeld).toBe(true);

    const below = price({ ...LOW_SEASON, manualPrice: 9000 });
    expect(below.suggestedQuote).toBe(10800);
    expect(below.manualPrice).toBe(9000);
    expect(below.discountAvoided).toBe(1450);
    expect(below.adjustments.find((item) => item.id === "manual-price")?.explanation).toContain("below the package base");
  });

  it("rejects a negative budget", () => {
    const result = quotePrice({ ...LOW_SEASON, clientBudget: -1 }, createDefaultConfig());
    expect(result.ok).toBe(false);
  });
});

describe("smaller package fallback", () => {
  const floored: QuoteInput = {
    eventDate: "2027-08-04",
    inquiryDate: "2027-07-21",
    marketId: "houston",
    packageId: "signature",
    qualifiedInquiries: 0,
    bookedDates: 0,
    targetCapacity: 4,
    travelDaysBlocked: 1,
  };

  it("offers the next package down only as a secondary option when the floor binds", () => {
    const quote = price(floored);
    expect(quote.clamped).toBe("floor");
    expect(quote.suggestedQuote).toBe(9200);
    expect(quote.smallerPackage?.packageId).toBe("classic");
    expect(quote.smallerPackage?.basePrice).toBe(7200);
    expect(quote.smallerPackage?.explanation.toLowerCase()).toContain("secondary");
    expect(quote.smallerPackage?.suggestedQuote).toBeLessThan(quote.smallerPackage?.basePrice ?? 0);
  });

  it("keeps the standard rate primary when a budget covers the base", () => {
    const quote = price({ ...floored, clientBudget: 15000, chargeStandard: true });
    expect(quote.suggestedQuote).toBeGreaterThanOrEqual(quote.basePrice);
    expect(quote.suggestedQuote).not.toBe(quote.smallerPackage?.suggestedQuote);
    expect(quote.smallerPackage?.packageId).toBe("classic");
    expect(quote.standardRateNote).toBe("budget supports standard rate, discount not needed");
    expect(quote.discountAvoided).toBe(quote.suggestedQuote - quote.modelQuote);
  });

  it("has nothing to step down to on the smallest package", () => {
    const quote = price({ ...floored, packageId: "petite" });
    expect(quote.clamped).toBe("floor");
    expect(quote.smallerPackage).toBeNull();
  });
});

describe("budget fit", () => {
  it("leaves the quote alone when the budget covers the suggestion", () => {
    const quote = price({ ...NOTES_EXAMPLE, clientBudget: 15000 });
    expect(quote.suggestedQuote).toBe(12400);
    expect(quote.budgetFit).toEqual({ status: "covers", budget: 15000 });
  });

  it("shows the drop when the budget sits between the floor and the quote", () => {
    const quote = price({ ...NOTES_EXAMPLE, clientBudget: 11000 });
    expect(quote.suggestedQuote).toBe(12400);
    expect(quote.suggestedQuote).toBeGreaterThanOrEqual(quote.floor);
    expect(quote.budgetFit).toMatchObject({
      status: "between",
      budget: 11000,
      drop: 1400,
      withinCorridor: true,
      floor: 9200,
      ceiling: 12950,
    });
    expect(quote.adjustments.find((item) => item.id === "budget-fit")?.explanation).toContain("inside the corridor");
  });

  it("never quotes below the floor when the budget does", () => {
    const quote = price({ ...LOW_SEASON, clientBudget: 8000 });
    expect(quote.modelQuote).toBe(9350);
    expect(quote.suggestedQuote).toBe(9350);
    expect(quote.suggestedQuote).toBeGreaterThanOrEqual(quote.floor);
    expect(quote.suggestedQuote).toBeGreaterThan(8000);
    expect(quote.budgetFit.status).toBe("below_floor");
    if (quote.budgetFit.status !== "below_floor") return;
    expect(quote.budgetFit.quotedPrice).toBe(quote.suggestedQuote);
    expect(quote.budgetFit.floor).toBe(9200);
    expect(quote.budgetFit.alternatives.length).toBeGreaterThan(0);
    for (const alternative of quote.budgetFit.alternatives) {
      expect(alternative.suggestedQuote).toBeLessThanOrEqual(8000);
      expect(alternative.suggestedQuote).toBeGreaterThan(0);
    }
    const onePhotographer = quote.budgetFit.alternatives.find((item) => item.photographers === 1);
    expect(onePhotographer?.hours).toBeLessThan(9);
    expect(quote.adjustments.find((item) => item.id === "budget-fit")?.explanation).toContain("not cut to the budget");
  });

  it("prices a weekday and an off-peak date when a peak Saturday is under the floor", () => {
    const quote = price({ ...NOTES_EXAMPLE, clientBudget: 8000 });
    expect(quote.suggestedQuote).toBe(12400);
    expect(quote.suggestedQuote).toBeGreaterThanOrEqual(quote.floor);
    if (quote.budgetFit.status !== "below_floor") throw new Error(quote.budgetFit.status);
    const kinds = quote.budgetFit.alternatives.map((item) => item.kind);
    expect(kinds).toContain("package");
    expect(kinds).toContain("weekday");
    expect(kinds).toContain("off_peak");
    const weekday = quote.budgetFit.alternatives.find((item) => item.kind === "weekday");
    const offPeak = quote.budgetFit.alternatives.find((item) => item.kind === "off_peak");
    expect(weekday?.dayName).toBe("Thursday");
    expect(weekday?.eventDate).toBe("2027-10-14");
    expect(offPeak?.eventDate.startsWith("2027-08-")).toBe(true);
    expect(offPeak?.dayName).toBe("Saturday");
    for (const alternative of quote.budgetFit.alternatives) {
      expect(alternative.suggestedQuote).toBeLessThanOrEqual(8000);
    }
  });

  it("uses the packages configured in settings, including hours and photographers", () => {
    const config = createDefaultConfig();
    const marco = config.tiers.find((tier) => tier.id === "marco");
    if (!marco) throw new Error("missing Marco tier");
    marco.packages = [
      { id: "signature", name: "Signature", price: 10800, detail: "9 hours, 2 photographers", hours: 9, photographers: 2 },
      { id: "solo", name: "Solo afternoon", price: 3600, detail: "", hours: 3, photographers: 1 },
    ];
    marco.defaultPackageId = "signature";
    const quote = price({ ...LOW_SEASON, clientBudget: 4000 }, config);
    expect(quote.suggestedQuote).toBeGreaterThanOrEqual(quote.floor);
    if (quote.budgetFit.status !== "below_floor") throw new Error(quote.budgetFit.status);
    const solo = quote.budgetFit.alternatives.find((item) => item.packageId === "solo");
    expect(solo?.hours).toBe(3);
    expect(solo?.photographers).toBe(1);
    expect(solo?.suggestedQuote).toBeLessThanOrEqual(4000);
    expect(quote.budgetFit.alternatives.some((item) => item.packageId === "classic")).toBe(false);
  });

  it("says so when even the smallest package is above the budget", () => {
    const quote = price({ ...LOW_SEASON, clientBudget: 1000 });
    expect(quote.suggestedQuote).toBeGreaterThanOrEqual(quote.floor);
    if (quote.budgetFit.status !== "below_floor") throw new Error(quote.budgetFit.status);
    expect(quote.budgetFit.alternatives).toEqual([]);
    expect(quote.budgetFit.gapNote).toContain("No package");
    expect(quote.budgetFit.gapNote).toContain("$1,000");
  });
});

describe("offering tiers", () => {
  it("prices the associate placeholder on its own base and corridor", () => {
    const quote = price({ ...LOW_SEASON, tierId: "associate", packageId: "associate-signature" });
    expect(quote.tierName).toBe("Associate");
    expect(quote.tierPlaceholder).toBe(true);
    expect(quote.basePrice).toBe(6400);
    expect(quote.dateCapacity).toBe(4);
    expect(quote.suggestedQuote).toBe(5550);
    expect(quote.floor).toBe(5150);
    expect(quote.ceiling).toBe(7350);
  });

  it("holds charge standard at the associate base", () => {
    const quote = price({
      ...LOW_SEASON,
      tierId: "associate",
      packageId: "associate-signature",
      chargeStandard: true,
    });
    expect(quote.suggestedQuote).toBe(6400);
    expect(quote.minimumAcceptable).toBeGreaterThanOrEqual(6400);
    expect(quote.standardRateHeld).toBe(true);
    expect(quote.suggestedQuote).not.toBe(10800);
  });

  it("calculates monthly fill and same-date scarcity separately for each tier", () => {
    const shared = {
      eventDate: "2027-02-04",
      inquiryDate: "2026-08-01",
      marketId: "houston",
      qualifiedInquiries: 1,
      bookedDates: 3,
      travelDaysBlocked: 1,
      bookedOnDate: 1,
    };
    const marco = price({ ...shared, tierId: "marco", packageId: "signature", targetCapacity: 4 });
    const associate = price({
      ...shared,
      tierId: "associate",
      packageId: "associate-signature",
      targetCapacity: 16,
    });
    expect(marco.utilization).toBeCloseTo(0.75, 5);
    expect(associate.utilization).toBeCloseTo(3 / 16, 5);
    expect(marco.adjustments.find((item) => item.id === "scarcity")?.percent).toBeCloseTo(0.06, 5);
    expect(associate.adjustments.find((item) => item.id === "scarcity")?.percent).toBeCloseTo(0.015, 5);
    expect(marco.adjustments.find((item) => item.id === "scarcity")?.explanation).toContain("Marco (lead)");
    expect(associate.adjustments.find((item) => item.id === "scarcity")?.explanation).toContain("Associate");
    expect(marco.suggestedQuote).not.toBe(associate.suggestedQuote);
  });

  it("does not let Marco's decided quotes nudge an associate price", () => {
    const wins = Array.from({ length: 4 }, () => ({
      marketId: "houston",
      outcome: "booked" as const,
      tierId: "marco",
    }));
    expect(price({ ...NOTES_EXAMPLE, history: wins }).suggestedQuote).toBe(12650);
    const associate = price({
      ...NOTES_EXAMPLE,
      tierId: "associate",
      packageId: "associate-signature",
      history: wins,
    });
    expect(associate.adjustments.find((item) => item.id === "history")?.percent).toBe(0);
  });
});

describe("quotePrice errors", () => {
  it("rejects a bad date, an unknown package, and a negative inquiry count", () => {
    expect(quotePrice({ ...NOTES_EXAMPLE, eventDate: "2027-02-31" }, createDefaultConfig()).ok).toBe(false);
    expect(quotePrice({ ...NOTES_EXAMPLE, packageId: "missing" }, createDefaultConfig()).ok).toBe(false);
    expect(quotePrice({ ...NOTES_EXAMPLE, qualifiedInquiries: -1 }, createDefaultConfig()).ok).toBe(false);
  });
});
