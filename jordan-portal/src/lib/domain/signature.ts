import { createHmac, timingSafeEqual } from "node:crypto";

export function signCalendly(
  rawBody: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): string {
  const v1 = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

export function verifyCalendlySignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowMs = Date.now(),
  toleranceSec = 300,
): boolean {
  if (!header) return false;
  const parts = new Map<string, string>();
  for (const piece of header.split(",")) {
    const index = piece.indexOf("=");
    if (index === -1) continue;
    parts.set(piece.slice(0, index).trim(), piece.slice(index + 1).trim());
  }
  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  const skew = Math.abs(nowMs / 1000 - Number(timestamp));
  if (skew > toleranceSec) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
