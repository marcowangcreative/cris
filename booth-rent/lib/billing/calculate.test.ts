import { describe, expect, it } from "vitest";
import {
  CAP_COUNTING_STATUSES,
  calculateCharge,
  feeCountedThisMonth,
  netServiceRevenue,
  previewBillingRun,
  type InvoiceSnapshot,
  type StylistTerms,
} from "@/lib/billing/calculate";
import { toCents } from "@/lib/money";

const maya: StylistTerms = {
  id: "maya",
  name: "Maya Chen",
  billingModel: "rent_plus_fee",
  weeklyRent: 600,
  monthlyRent: 0,
  feeRate: 0.075,
  serviceFeeMonthlyCap: 1000,
  minimumRemit: 0,
};

function snap(partial: Partial<InvoiceSnapshot> & Pick<InvoiceSnapshot, "status" | "serviceFeeAmount" | "weekEnd">): InvoiceSnapshot {
  return {
    stylistId: "maya",
    weekStart: "2025-12-01",
    billingModel: "rent_plus_fee",
    ...partial,
  };
}

function charge(overrides: Partial<Parameters<typeof calculateCharge>[0]> = {}) {
  return calculateCharge({
    stylist: maya,
    weekStart: "2026-01-05",
    weekEnd: "2026-01-11",
    netServiceRevenue: 2000,
    history: [],
    ...overrides,
  });
}

describe("net service revenue", () => {
  it("subtracts discounts and refunds and ignores tips", () => {
    expect(
      netServiceRevenue({ serviceSales: 1000, discounts: 100, refunds: 50, tips: 200 }),
    ).toBe(850);
  });

  it("does not go below zero", () => {
    expect(netServiceRevenue({ serviceSales: 40, discounts: 100, refunds: 5 })).toBe(0);
  });
});

describe("rent + fee", () => {
  it("charges weekly rent plus 7.5% of net services", () => {
    const result = charge();
    expect(result.rentAmount).toBe(600);
    expect(result.rawServiceFee).toBe(150);
    expect(result.serviceFeeAmount).toBe(150);
    expect(result.totalAmount).toBe(750);
    expect(result.capApplied).toBe(false);
    expect(result.lineItems).toHaveLength(2);
  });

  it("caps the fee with the month the week ends in", () => {
    const result = charge({
      netServiceRevenue: 4000,
      history: [snap({ weekEnd: "2026-01-04", serviceFeeAmount: 950, status: "paid" })],
    });
    expect(result.rawServiceFee).toBe(300);
    expect(result.serviceFeeAmount).toBe(50);
    expect(result.totalAmount).toBe(650);
    expect(result.capApplied).toBe(true);
    expect(result.monthlyFeeAlreadyCounted).toBe(950);
    expect(result.lineItems[1]?.description).toContain("capped");
  });

  it("still charges rent when the cap is already used up", () => {
    const result = charge({
      history: [snap({ weekEnd: "2026-01-04", serviceFeeAmount: 1000, status: "sent" })],
    });
    expect(result.serviceFeeAmount).toBe(0);
    expect(result.rentAmount).toBe(600);
    expect(result.totalAmount).toBe(600);
    expect(result.capApplied).toBe(true);
    expect(result.lineItems).toHaveLength(1);
  });

  it("counts sent, processing, and paid fees, and ignores failed, void, and draft", () => {
    const history: InvoiceSnapshot[] = [
      snap({ weekEnd: "2026-01-04", serviceFeeAmount: 100, status: "sent" }),
      snap({ weekEnd: "2026-01-04", serviceFeeAmount: 200, status: "processing" }),
      snap({ weekEnd: "2026-01-04", serviceFeeAmount: 300, status: "paid" }),
      snap({ weekEnd: "2026-01-04", serviceFeeAmount: 900, status: "failed" }),
      snap({ weekEnd: "2026-01-04", serviceFeeAmount: 800, status: "void" }),
      snap({ weekEnd: "2026-01-04", serviceFeeAmount: 700, status: "draft" }),
    ];
    expect(feeCountedThisMonth(history, "maya", "2026-01-11")).toBe(600);
    expect(CAP_COUNTING_STATUSES).not.toContain("failed");
  });

  it("does not let another stylist's fees consume the cap", () => {
    const result = charge({
      history: [
        snap({
          stylistId: "other",
          weekEnd: "2026-01-04",
          serviceFeeAmount: 1000,
          status: "paid",
        }),
      ],
    });
    expect(result.serviceFeeAmount).toBe(150);
    expect(result.capApplied).toBe(false);
  });

  it("ignores a flat-rent invoice in the same month", () => {
    const result = charge({
      history: [
        snap({
          weekEnd: "2026-01-04",
          billingModel: "flat_weekly",
          serviceFeeAmount: 1000,
          status: "paid",
        }),
      ],
    });
    expect(result.monthlyFeeAlreadyCounted).toBe(0);
  });

  it("puts a week that spans New Year entirely in January", () => {
    const december = snap({
      weekStart: "2025-12-22",
      weekEnd: "2025-12-28",
      serviceFeeAmount: 1000,
      status: "paid",
    });
    const spanningWeek = calculateCharge({
      stylist: maya,
      weekStart: "2025-12-29",
      weekEnd: "2026-01-04",
      netServiceRevenue: 2000,
      history: [december],
    });
    expect(spanningWeek.monthlyFeeAlreadyCounted).toBe(0);
    expect(spanningWeek.serviceFeeAmount).toBe(150);

    const laterInJanuary = calculateCharge({
      stylist: maya,
      weekStart: "2026-01-05",
      weekEnd: "2026-01-11",
      netServiceRevenue: 2000,
      history: [
        december,
        snap({
          weekStart: "2025-12-29",
          weekEnd: "2026-01-04",
          serviceFeeAmount: 150,
          status: "paid",
        }),
      ],
    });
    expect(laterInJanuary.monthlyFeeAlreadyCounted).toBe(150);
    expect(laterInJanuary.serviceFeeAmount).toBe(150);
  });

  it("leaves the fee uncapped when the cap is null", () => {
    const result = charge({
      stylist: { ...maya, serviceFeeMonthlyCap: null },
      netServiceRevenue: 20000,
      history: [snap({ weekEnd: "2026-01-04", serviceFeeAmount: 5000, status: "paid" })],
    });
    expect(result.serviceFeeAmount).toBe(1500);
    expect(result.capApplied).toBe(false);
    expect(result.capRemainingBefore).toBeNull();
  });

  it("rounds the fee to cents", () => {
    const result = charge({ netServiceRevenue: 10.1 });
    expect(result.rawServiceFee).toBe(0.76);
  });
});

describe("percent chair rent", () => {
  const andre: StylistTerms = {
    id: "andre",
    name: "Andre Walsh",
    billingModel: "percent_rent",
    weeklyRent: 0,
    monthlyRent: 0,
    feeRate: 0.35,
    serviceFeeMonthlyCap: 1000,
    minimumRemit: 600,
  };

  it("charges the percentage when it clears the weekly minimum", () => {
    const result = calculateCharge({
      stylist: andre,
      weekStart: "2026-11-02",
      weekEnd: "2026-11-08",
      netServiceRevenue: 2000,
      history: [],
    });
    expect(result.totalAmount).toBe(700);
    expect(result.rentAmount).toBe(0);
    expect(result.minimumApplied).toBe(false);
    expect(result.serviceFeeAmount).toBe(700);
  });

  it("charges the minimum when the percentage is lower, and does not add them", () => {
    const result = calculateCharge({
      stylist: andre,
      weekStart: "2026-11-02",
      weekEnd: "2026-11-08",
      netServiceRevenue: 1200,
      history: [],
    });
    expect(result.rawServiceFee).toBe(420);
    expect(result.totalAmount).toBe(600);
    expect(result.minimumApplied).toBe(true);
    expect(result.note).toContain("minimum");
  });

  it("does not flag the minimum when the percentage lands on it", () => {
    const result = calculateCharge({
      stylist: { ...andre, feeRate: 0.5, minimumRemit: 600 },
      weekStart: "2026-11-02",
      weekEnd: "2026-11-08",
      netServiceRevenue: 1200,
      history: [],
    });
    expect(result.rawServiceFee).toBe(600);
    expect(result.minimumApplied).toBe(false);
    expect(result.totalAmount).toBe(600);
  });

  it("does not apply the rent + fee cap", () => {
    const result = calculateCharge({
      stylist: andre,
      weekStart: "2026-11-02",
      weekEnd: "2026-11-08",
      netServiceRevenue: 10000,
      history: [snap({ stylistId: "andre", weekEnd: "2026-11-01", serviceFeeAmount: 1000, status: "paid", billingModel: "percent_rent" })],
    });
    expect(result.totalAmount).toBe(3500);
    expect(result.capApplied).toBe(false);
  });
});

describe("flat rent", () => {
  it("charges weekly rent and ignores revenue", () => {
    const result = calculateCharge({
      stylist: {
        id: "priya",
        name: "Priya Shah",
        billingModel: "flat_weekly",
        weeklyRent: 750,
        monthlyRent: 0,
        feeRate: 0,
        serviceFeeMonthlyCap: null,
        minimumRemit: 0,
      },
      weekStart: "2026-11-02",
      weekEnd: "2026-11-08",
      netServiceRevenue: 3100,
      history: [],
    });
    expect(result.totalAmount).toBe(750);
    expect(result.rentAmount).toBe(750);
    expect(result.serviceFeeAmount).toBe(0);
  });

  it("bills monthly rent once for the month the week ends in", () => {
    const jonah: StylistTerms = {
      id: "jonah",
      name: "Jonah Ellis",
      billingModel: "flat_monthly",
      weeklyRent: 0,
      monthlyRent: 2200,
      feeRate: 0,
      serviceFeeMonthlyCap: null,
      minimumRemit: 0,
    };
    const first = calculateCharge({
      stylist: jonah,
      weekStart: "2026-11-02",
      weekEnd: "2026-11-08",
      netServiceRevenue: 0,
      history: [],
    });
    expect(first.totalAmount).toBe(2200);
    expect(first.skipped).toBe(false);

    const second = calculateCharge({
      stylist: jonah,
      weekStart: "2026-11-09",
      weekEnd: "2026-11-15",
      netServiceRevenue: 0,
      history: [
        {
          stylistId: "jonah",
          weekStart: "2026-11-02",
          weekEnd: "2026-11-08",
          billingModel: "flat_monthly",
          serviceFeeAmount: 0,
          status: "paid",
        },
      ],
    });
    expect(second.skipped).toBe(true);
    expect(second.totalAmount).toBe(0);

    const afterFailure = calculateCharge({
      stylist: jonah,
      weekStart: "2026-11-09",
      weekEnd: "2026-11-15",
      netServiceRevenue: 0,
      history: [
        {
          stylistId: "jonah",
          weekStart: "2026-11-02",
          weekEnd: "2026-11-08",
          billingModel: "flat_monthly",
          serviceFeeAmount: 0,
          status: "failed",
        },
      ],
    });
    expect(afterFailure.skipped).toBe(false);
    expect(afterFailure.totalAmount).toBe(2200);
    expect(afterFailure.note).toContain("failed");
  });
});

describe("rebills and previews", () => {
  it("blocks a week that already has a sent invoice and allows a retry after failure", () => {
    const sent = charge({
      history: [
        snap({
          weekStart: "2026-01-05",
          weekEnd: "2026-01-11",
          serviceFeeAmount: 10,
          status: "sent",
        }),
      ],
    });
    expect(sent.blocked).toBe(true);
    expect(sent.skipped).toBe(true);

    const retry = charge({
      netServiceRevenue: 4200,
      history: [
        snap({
          weekStart: "2026-01-05",
          weekEnd: "2026-01-11",
          serviceFeeAmount: 900,
          status: "failed",
        }),
      ],
    });
    expect(retry.blocked).toBe(false);
    expect(retry.retriedFailed).toBe(true);
    expect(retry.serviceFeeAmount).toBe(315);
    expect(retry.monthlyFeeAlreadyCounted).toBe(0);
  });

  it("sums a mixed preview and keeps line items in cents", () => {
    const preview = previewBillingRun({
      weekStart: "2026-11-02",
      weekEnd: "2026-11-08",
      stylists: [
        maya,
        {
          id: "andre",
          name: "Andre",
          billingModel: "percent_rent",
          weeklyRent: 0,
          monthlyRent: 0,
          feeRate: 0.35,
          serviceFeeMonthlyCap: null,
          minimumRemit: 600,
        },
      ],
      revenueByStylist: { maya: 2000, andre: 1000 },
      history: [],
    });
    expect(preview.invoiceCount).toBe(2);
    expect(preview.totalAmount).toBe(750 + 600);
    for (const row of preview.charges) {
      const cents = row.lineItems.reduce((sum, item) => sum + item.amountCents, 0);
      expect(cents).toBe(toCents(row.totalAmount));
    }
  });

  it("treats a non-numeric revenue as zero", () => {
    const result = charge({ netServiceRevenue: Number.NaN });
    expect(result.netServiceRevenue).toBe(0);
    expect(result.serviceFeeAmount).toBe(0);
    expect(result.totalAmount).toBe(600);
  });
});
