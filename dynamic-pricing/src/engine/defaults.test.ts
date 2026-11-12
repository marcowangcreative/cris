import { describe, expect, it } from "vitest";
import { createDefaultConfig, sanitizeConfig } from "./defaults";

describe("sanitizeConfig", () => {
  it("returns the testing defaults for garbage", () => {
    const config = sanitizeConfig(null);
    expect(config.homeMarketId).toBe("houston");
    const marco = config.tiers.find((tier) => tier.id === "marco");
    const associate = config.tiers.find((tier) => tier.id === "associate");
    expect(marco?.packages.find((item) => item.id === "signature")?.price).toBe(10800);
    expect(marco?.packages.find((item) => item.id === "signature")).toMatchObject({ hours: 9, photographers: 2 });
    expect(marco?.packages.find((item) => item.id === "classic")).toMatchObject({ hours: 6, photographers: 1 });
    expect(marco?.dateCapacity).toBe(1);
    expect(associate?.placeholder).toBe(true);
    expect(associate?.dateCapacity).toBe(4);
    expect(associate?.packages.find((item) => item.id === "associate-signature")?.price).toBe(6400);
    expect(config.markets.find((item) => item.id === "houston")?.demandIndex[9]).toBe(135);
    expect(marco?.maxReduction).toBe(0.15);
    expect(marco?.maxPremium).toBe(0.2);
    expect(config.objective).toBe("balanced");
  });

  it("keeps a valid corridor edit and restores a broken market index", () => {
    const edited = sanitizeConfig({
      maxPremium: 0.3,
      objective: "maximize_revenue",
      markets: [
        {
          id: "houston",
          name: "Houston",
          region: "Texas",
          demandIndex: [1, 2, 3],
          typicalTravelDays: 1,
        },
      ],
    });
    expect(edited.tiers.find((tier) => tier.id === "marco")?.maxPremium).toBe(0.3);
    expect(edited.objective).toBe("maximize_revenue");
    expect(edited.markets[0].id).toBe("houston");
    expect(edited.markets[0].demandIndex).toHaveLength(12);
    expect(edited.markets[0].demandIndex[9]).toBe(135);
  });

  it("does not let callers mutate the next default config", () => {
    const first = createDefaultConfig();
    first.tiers[0].packages[2].price = 1;
    expect(createDefaultConfig().tiers[0].packages[2].price).toBe(10800);
  });
});
