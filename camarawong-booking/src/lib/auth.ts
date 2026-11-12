import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "cw_admin";
const MAX_AGE_MS = 1000 * 60 * 60 * 14;

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sessionKey(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return process.env.ADMIN_SESSION_SECRET || password;
}

export function passwordsMatch(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !input) return false;
  const actual = createHash("sha256").update(input).digest();
  const target = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actual, target);
}

export function createSessionToken(now = Date.now()): string {
  const key = sessionKey();
  if (!key) throw new Error("ADMIN_PASSWORD is not set");
  const payload = `v1.${now + MAX_AGE_MS}`;
  const signature = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const key = sessionKey();
  if (!key) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = createHmac("sha256", key).update(payload).digest("base64url");
  const actual = Buffer.from(parts[2]);
  const target = Buffer.from(expected);
  if (actual.length !== target.length || !timingSafeEqual(actual, target)) return false;
  const expires = Number(parts[1]);
  return Number.isFinite(expires) && expires > now;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_MS / 1000,
  };
}
