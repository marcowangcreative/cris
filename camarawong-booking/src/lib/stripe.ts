import Stripe from "stripe";

let client: Stripe | undefined;
let keyUsed = "";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured.");
  if (!client || keyUsed !== key) {
    client = new Stripe(key);
    keyUsed = key;
  }
  return client;
}

export function checkoutCopy(booking: { date: string; startTime: string; quote: { paymentMode: string; depositPercent: number } }): string {
  const when = `${booking.date} at ${booking.startTime}`;
  if (booking.quote.paymentMode === "full") return `Paid in full for ${when}.`;
  return `${booking.quote.depositPercent}% deposit to reserve ${when}. The balance is due before the event.`;
}
