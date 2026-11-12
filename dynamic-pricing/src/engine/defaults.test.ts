import { describe, expect, it } from "vitest";
import { createDefaultConfig, sanitizeConfig } from "./defaults";

describe("sanitizeConfig", () => {
  it("returns the testing defaults for garbage", () => {
    const config = sanitizeConfig(null);
    expect(config.homeMarketId).toBe("houston");
    expect(config.packages.find((item) => item.id === "signature")?.price).toBe(10800);
    expect(config.markets.find((item) => item.id === "houston")?.demandIndex[9]).toBe(135);
    expect(config.maxReduction).toBe(0.15);
    expect(config.maxPremium).toBe(0.2);
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
    expect(edited.maxPremium).toBe(0.3);
    expect(edited.objective).toBe("maximize_revenue");
    expect(edited.markets[0].id).toBe("houston");
    expect(edited.markets[0].demandIndex).toHaveLength(12);
    expect(edited.markets[0].demandIndex[9]).toBe(135);
  });

  it("does not let callers mutate the next default config", () => {
    const first = createDefaultConfig();
    first.packages[2].price = 1;
    expect(createDefaultConfig().packages[2].price).toBe(10800);
  });
});
