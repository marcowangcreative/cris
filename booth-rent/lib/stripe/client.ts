import Stripe from "stripe";

let stripe: Stripe | null = null;

export function stripeSecret(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key ? key : null;
}

export function stripeKeyMode(): "missing" | "test" | "live" {
  const key = stripeSecret() ?? "";
  if (!key) return "missing";
  if (key.startsWith("sk_live") || key.startsWith("rk_live")) return "live";
  return "test";
}

export function getStripe(): Stripe {
  const key = stripeSecret();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  if (!stripe) stripe = new Stripe(key, { typescript: true });
  return stripe;
}
