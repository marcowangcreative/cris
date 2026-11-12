/** Round to the nearest cent. Half-up for positive amounts. */
export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

export function toCents(amount: number): number {
  return Math.round(roundMoney(amount) * 100);
}
