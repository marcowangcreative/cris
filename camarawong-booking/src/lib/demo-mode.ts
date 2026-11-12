import "server-only";

export function paymentsAreSimulated() {
  return !process.env.STRIPE_SECRET_KEY;
}