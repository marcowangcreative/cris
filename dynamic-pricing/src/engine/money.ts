export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function roundToIncrement(amount: number, increment: number): number {
  const step = toCents(increment);
  if (step <= 0) return Math.round(amount);
  const cents = toCents(amount);
  const sign = cents < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(cents) / step) * step) / 100;
}

export function roundDownToIncrement(amount: number, increment: number): number {
  const step = toCents(increment);
  if (step <= 0) return Math.round(amount);
  return (Math.floor(toCents(amount) / step) * step) / 100;
}

export function roundUpToIncrement(amount: number, increment: number): number {
  const step = toCents(increment);
  if (step <= 0) return Math.round(amount);
  return (Math.ceil(toCents(amount) / step) * step) / 100;
}

export function formatMoney(amount: number): string {
  const cents = Math.round(Math.abs(amount) * 100) % 100;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents === 0 ? 0 : 2,
    maximumFractionDigits: cents === 0 ? 0 : 2,
  });
}

export function formatPercent(fraction: number, digits = 1): string {
  const pct = fraction * 100;
  const tolerance = 0.5 / 10 ** digits;
  if (Math.abs(pct) < tolerance) return `${(0).toFixed(digits)}%`;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(digits)}%`;
}

export function formatSignedMoney(amount: number): string {
  if (Math.abs(amount) < 0.5) return formatMoney(0);
  const sign = amount > 0 ? "+" : "−";
  return `${sign}${formatMoney(Math.abs(amount))}`;
}
