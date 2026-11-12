import type Stripe from "stripe";

/**
 * Stripe Connect is how Booth Rent becomes a true multi-tenant payout product.
 * Each salon would onboard a connected account and we would pass that account
 * on every customer, invoice, and setup call. Until then, billing uses the
 * single Stripe account in STRIPE_SECRET_KEY (the salon owner's own account).
 * `salons.stripe_account_id` is stored and intentionally ignored.
 */
export function connectRequestOptions(salon: {
  stripeAccountId: string | null;
}): Stripe.RequestOptions | undefined {
  if (salon.stripeAccountId) {
    console.warn(
      "This salon has stripe_account_id set, but Stripe Connect is not implemented. The invoice is created on the account in STRIPE_SECRET_KEY.",
    );
  }
  // CONNECT_STUB:
  // if (salon.stripeAccountId) return { stripeAccount: salon.stripeAccountId };
  return undefined;
}

/** Connected-account webhooks include `event.account`. That header is not applied yet. */
export function connectOptionsFromWebhookAccount(
  accountId: string | null | undefined,
): Stripe.RequestOptions | undefined {
  // CONNECT_STUB:
  // if (accountId) return { stripeAccount: accountId };
  void accountId;
  return undefined;
}
