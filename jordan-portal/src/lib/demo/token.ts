import { createHmac, timingSafeEqual } from "node:crypto";
import { getConfig } from "@/lib/rules";
import type { Actor } from "@/lib/types";

type SessionPayload = Actor & { exp: number };
type MagicPayload = { purpose: "magic"; email: string; exp: number };

function sign(body: string): string {
  const encoded = Buffer.from(body).toString("base64url");
  const signature = createHmac("sha256", getConfig().sessionSecret)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

function read(token: string): string | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", getConfig().sessionSecret)
    .update(encoded)
    .digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return Buffer.from(encoded, "base64url").toString("utf8");
}

export function signSession(actor: Actor, nowMs = Date.now()): string {
  const payload: SessionPayload = {
    ...actor,
    exp: nowMs + 1000 * 60 * 60 * 24 * 14,
  };
  return sign(JSON.stringify(payload));
}

export function readSession(token: string | undefined, nowMs = Date.now()): Actor | null {
  if (!token) return null;
  const raw = read(token);
  if (!raw) return null;
  const payload = JSON.parse(raw) as SessionPayload;
  if (!payload.exp || payload.exp < nowMs) return null;
  if (payload.role === "admin" && payload.staffId) {
    return { role: "admin", staffId: payload.staffId };
  }
  if (payload.role === "client" && payload.clientId) {
    return { role: "client", clientId: payload.clientId };
  }
  return null;
}

export function signMagicLink(email: string, nowMs = Date.now()): string {
  const payload: MagicPayload = {
    purpose: "magic",
    email: email.toLowerCase(),
    exp: nowMs + 1000 * 60 * 30,
  };
  return sign(JSON.stringify(payload));
}

export function readMagicLink(token: string, nowMs = Date.now()): string | null {
  const raw = read(token);
  if (!raw) return null;
  const payload = JSON.parse(raw) as MagicPayload;
  if (payload.purpose !== "magic" || !payload.email || payload.exp < nowMs) {
    return null;
  }
  return payload.email;
}
