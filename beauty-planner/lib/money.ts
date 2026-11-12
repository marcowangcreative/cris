import type { Member } from "./types";

export function quoteTotal(members: readonly Pick<Member, "price">[]): number {
  return members.reduce((sum, member) => sum + (Number.isFinite(member.price) ? member.price : 0), 0);
}

export function formatMoney(amount: number): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: hasCents ? 2 : 0,
    minimumFractionDigits: hasCents ? 2 : 0,
  }).format(amount);
}
