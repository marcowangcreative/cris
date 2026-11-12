import { timingSafeEqual } from "node:crypto";

const UNLOCK_MS = 12 * 60 * 60 * 1000;

export function passwordsMatch(given: string, expected: string): boolean {
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Compares a submitted password with the environment value. The value is never stored in source. */
export function checkPricingPassword(
  password: string,
  configured: string | undefined,
): { status: number; body: { ok: boolean; error?: string; unlockedForMs?: number } } {
  if (!configured) {
    return { status: 503, body: { ok: false, error: "PRICING_PASSWORD is not set." } };
  }
  if (!password || !passwordsMatch(password, configured)) {
    return { status: 401, body: { ok: false, error: "That password does not match." } };
  }
  return { status: 200, body: { ok: true, unlockedForMs: UNLOCK_MS } };
}
