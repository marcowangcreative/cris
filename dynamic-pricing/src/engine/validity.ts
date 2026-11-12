const DAY_MS = 86_400_000;

/** The sent price stays in force until this instant. It is not a new quote. */
export function quoteValidUntil(approvedAtIso: string, validDays: number): string {
  const start = new Date(approvedAtIso);
  const days = Number.isFinite(validDays) ? Math.min(365, Math.max(1, Math.round(validDays))) : 14;
  const base = Number.isNaN(start.getTime()) ? Date.now() : start.getTime();
  return new Date(base + days * DAY_MS).toISOString();
}

export function isQuoteExpired(validUntilIso: string, now = new Date()): boolean {
  const until = new Date(validUntilIso);
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() <= now.getTime();
}
