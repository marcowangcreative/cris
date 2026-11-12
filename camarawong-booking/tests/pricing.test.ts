import { describe, expect, it } from "vitest";
import { PricingError } from "@/lib/errors";
import { quote } from "@/lib/pricing";

describe("pricing", () => {
  it("charges the corporate station in full at the placeholder price", () => {
    const priced = quote("corporate", []);
    expect(priced.totalCents).toBe(150_000);
    expect(priced.dueNowCents).toBe(150_000);
    expect(priced.balanceDueCents).toBe(0);
    expect(priced.paymentMode).toBe("full");
    expect(priced.durationMinutes).toBe(90);
    expect(priced.includesPlaceholderPrice).toBe(true);
  });

  it("adds placeholder extra hours and keeps the full amount due today", () => {
    const one = quote("corporate", [{ id: "extra-hour", quantity: 1 }]);
    expect(one.totalCents).toBe(250_000);
    expect(one.dueNowCents).toBe(250_000);
    expect(one.durationMinutes).toBe(150);
    expect(one.lineItems.map((item) => item.amountCents)).toEqual([150_000, 100_000]);

    const two = quote("corporate", [{ id: "extra-hour", quantity: 2 }]);
    expect(two.totalCents).toBe(350_000);
    expect(two.durationMinutes).toBe(210);
  });

  it("ignores a zero quantity and rejects too many, duplicates, and unknown add-ons", () => {
    expect(quote("corporate", [{ id: "extra-hour", quantity: 0 }]).totalCents).toBe(150_000);
    expect(() => quote("corporate", [{ id: "extra-hour", quantity: 3 }])).toThrow(PricingError);
    expect(() => quote("corporate", [{ id: "extra-hour", quantity: -1 }])).toThrow(PricingError);
    expect(() =>
      quote("corporate", [
        { id: "extra-hour", quantity: 1 },
        { id: "extra-hour", quantity: 1 },
      ]),
    ).toThrow(PricingError);
    expect(() => quote("digital", [{ id: "extra-hour", quantity: 1 }])).toThrow(PricingError);
    expect(() => quote("missing", [])).toThrow(PricingError);
  });

  it("takes a 50% deposit on Digital, Printed, and Custom", () => {
    const digital = quote("digital", []);
    expect(digital.totalCents).toBe(300_000);
    expect(digital.dueNowCents).toBe(150_000);
    expect(digital.balanceDueCents).toBe(150_000);
    expect(digital.depositPercent).toBe(50);
    expect(digital.includesPlaceholderPrice).toBe(false);

    const printed = quote("printed", []);
    expect(printed.totalCents).toBe(600_000);
    expect(printed.dueNowCents).toBe(300_000);
    expect(printed.balanceDueCents).toBe(300_000);
    expect(printed.durationMinutes).toBe(180);

    const custom = quote("custom", []);
    expect(custom.totalCents).toBe(900_000);
    expect(custom.dueNowCents).toBe(450_000);
    expect(custom.balanceDueCents).toBe(450_000);
    expect(custom.durationMinutes).toBe(240);
  });

  it("keeps due today and the balance equal to the investment", () => {
    for (const id of ["corporate", "digital", "printed", "custom"]) {
      const priced = quote(id, id === "corporate" ? [{ id: "extra-hour", quantity: 1 }] : []);
      expect(priced.dueNowCents + priced.balanceDueCents).toBe(priced.totalCents);
      expect(priced.lineItems.reduce((sum, item) => sum + item.amountCents, 0)).toBe(priced.totalCents);
    }
  });
});
