import { describe, expect, it } from "vitest";
import { matchRevenueCsv } from "@/lib/csv";
import { parseStylistInput } from "@/lib/validation";

describe("revenue CSV", () => {
  const stylists = [
    { id: "1", email: "maya.chen@lumenroom.example", name: "Maya Chen" },
    { id: "2", email: "andre.walsh@lumenroom.example", name: "Andre Walsh" },
  ];

  it("matches email, ignores a quoted comma, and reports unknown rows", () => {
    const result = matchRevenueCsv(
      'email,net_revenue\nmaya.chen@lumenroom.example,"$4,200.00"\nunknown@example.com,10\n',
      stylists,
    );
    expect(result.error).toBeNull();
    expect(result.revenue["1"]).toBe(4200);
    expect(result.unmatched).toEqual(["unknown@example.com"]);
  });

  it("requires a revenue column", () => {
    expect(matchRevenueCsv("email,notes\na@b.co,hi\n", stylists).error).toMatch(/net_revenue/);
  });
});

describe("stylist input", () => {
  it("stores the fee as a decimal and keeps an optional cap", () => {
    const parsed = parseStylistInput({
      name: "Maya Chen",
      email: "Maya@Example.com",
      billingModel: "rent_plus_fee",
      weeklyRent: 600,
      monthlyRent: 0,
      feePercent: 7.5,
      serviceFeeMonthlyCap: 1000,
      minimumRemit: 0,
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.email).toBe("maya@example.com");
      expect(parsed.value.feeRate).toBe(0.075);
      expect(parsed.value.serviceFeeMonthlyCap).toBe(1000);
    }
  });

  it("treats a blank cap as uncapped", () => {
    const parsed = parseStylistInput({
      name: "Sofia Alvarez",
      email: "sofia@example.com",
      billingModel: "rent_plus_fee",
      weeklyRent: 500,
      monthlyRent: 0,
      feePercent: 10,
      serviceFeeMonthlyCap: null,
      minimumRemit: 0,
    });
    expect(parsed.ok && parsed.value.serviceFeeMonthlyCap).toBeNull();
  });
});
