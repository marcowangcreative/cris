import { roundMoney } from "@/lib/money";

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(roundMoney(amount));
}

/** 0.075 → "7.5%", 0.35 → "35%". */
export function formatPercent(rate: number): string {
  const percent = roundMoney(rate * 100);
  const text = percent.toFixed(2).replace(/\.?0+$/, "");
  return `${text}%`;
}
