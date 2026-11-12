import { describe, expect, it } from "vitest";
import { isQuoteExpired, quoteValidUntil } from "./validity";

describe("quote validity", () => {
  it("keeps a sent quote for the configured number of days", () => {
    expect(quoteValidUntil("2026-01-20T15:00:00.000Z", 14)).toBe("2026-02-03T15:00:00.000Z");
  });

  it("does not treat expiry as a new price", () => {
    const until = quoteValidUntil("2026-01-01T00:00:00.000Z", 14);
    expect(isQuoteExpired(until, new Date("2026-01-14T00:00:00.000Z"))).toBe(false);
    expect(isQuoteExpired(until, new Date("2026-01-15T00:00:00.000Z"))).toBe(true);
  });
});
