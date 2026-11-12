import { getPackage, studio } from "@/lib/config";
import { PricingError } from "@/lib/errors";
import type { AddonSelection, Quote } from "@/lib/types";

export function quote(packageId: string, addons: AddonSelection[]): Quote {
  const pkg = getPackage(packageId);
  if (!pkg) throw new PricingError("That collection is not on the menu.");

  const lineItems: Quote["lineItems"] = [
    {
      id: pkg.id,
      label: pkg.name,
      amountCents: pkg.priceCents,
      placeholder: pkg.priceIsPlaceholder,
    },
  ];

  let durationMinutes = pkg.durationMinutes;
  const seen = new Set<string>();

  for (const selection of addons) {
    if (selection.quantity === 0) continue;
    if (!Number.isInteger(selection.quantity) || selection.quantity < 0) {
      throw new PricingError("Add-on quantity has to be a whole number.");
    }
    if (seen.has(selection.id)) throw new PricingError("That add-on was listed twice.");
    seen.add(selection.id);

    const addon = pkg.addons.find((item) => item.id === selection.id);
    if (!addon) throw new PricingError(`${pkg.name} does not include that add-on.`);
    if (selection.quantity > addon.maxQuantity) {
      throw new PricingError(`${addon.name} can be added at most ${addon.maxQuantity} times.`);
    }

    lineItems.push({
      id: addon.id,
      label: selection.quantity > 1 ? `${addon.name} × ${selection.quantity}` : addon.name,
      amountCents: addon.priceCents * selection.quantity,
      placeholder: addon.priceIsPlaceholder,
    });
    durationMinutes += addon.additionalMinutes * selection.quantity;
  }

  const totalCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  const depositPercent = pkg.paymentMode === "full" ? 100 : studio.depositPercent;
  const dueNowCents =
    pkg.paymentMode === "full" ? totalCents : Math.round((totalCents * studio.depositPercent) / 100);

  return {
    packageId: pkg.id,
    packageName: pkg.name,
    currency: studio.currency,
    durationMinutes,
    paymentMode: pkg.paymentMode,
    depositPercent,
    lineItems,
    totalCents,
    dueNowCents,
    balanceDueCents: totalCents - dueNowCents,
    includesPlaceholderPrice: lineItems.some((item) => item.placeholder),
  };
}
