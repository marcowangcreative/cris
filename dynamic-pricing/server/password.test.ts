import { describe, expect, it } from "vitest";
import { checkPricingPassword, passwordsMatch } from "./password";

describe("pricing password", () => {
  it("matches only the configured value", () => {
    expect(passwordsMatch("correct horse", "correct horse")).toBe(true);
    expect(passwordsMatch("wrong", "correct horse")).toBe(false);
    expect(passwordsMatch("correct horse", "correct horses")).toBe(false);
  });

  it("stays locked when the environment variable is missing", () => {
    expect(checkPricingPassword("anything", undefined).status).toBe(503);
    expect(checkPricingPassword("secret", "secret").status).toBe(200);
    expect(checkPricingPassword("nope", "secret").status).toBe(401);
  });
});
