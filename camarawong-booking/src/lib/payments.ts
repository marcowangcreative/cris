import { PaymentError } from "@/lib/errors";
import { displayStatus } from "@/lib/status";
import type { Store } from "@/lib/store/types";
import type { Booking, CheckoutSessionSnapshot } from "@/lib/types";
import { sendConfirmation, type Mailer } from "@/lib/email";

const PAID_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

export type PaymentApplication = {
  booking: Booking;
  outcome: "paid" | "already_paid" | "ignored";
};

function paymentIntentId(value: CheckoutSessionSnapshot["payment_intent"]): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

export function applyCheckoutCompleted(
  booking: Booking,
  session: CheckoutSessionSnapshot,
  now: Date,
): PaymentApplication {
  if (session.metadata?.bookingId !== booking.id) {
    throw new PaymentError("not_payable", "Booking does not match this payment.");
  }
  if (booking.payment.status === "paid") return { booking, outcome: "already_paid" };
  if (session.payment_status !== "paid") return { booking, outcome: "ignored" };
  if (session.amount_total !== booking.quote.dueNowCents) {
    throw new PaymentError("amount_mismatch", "Paid amount does not match the amount due today.");
  }
  if (booking.status !== "pending_payment" || !booking.contract) {
    throw new PaymentError("not_payable", "This reservation is not awaiting payment.");
  }
  if (displayStatus(booking, now) === "expired") {
    throw new PaymentError("not_payable", "The payment window expired before the card was confirmed.");
  }

  return {
    outcome: "paid",
    booking: {
      ...booking,
      status: "paid",
      updatedAt: now.toISOString(),
      payment: {
        provider: "stripe",
        status: "paid",
        amountCents: booking.quote.dueNowCents,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId(session.payment_intent),
        paidAt: now.toISOString(),
      },
    },
  };
}

export function applyDemoPayment(booking: Booking, now: Date): PaymentApplication {
  if (booking.payment.status === "paid") return { booking, outcome: "already_paid" };
  if (booking.status !== "pending_payment" || !booking.contract) {
    throw new PaymentError("not_payable", "Sign the agreement before paying.");
  }
  if (displayStatus(booking, now) === "expired") {
    throw new PaymentError("not_payable", "The payment window has expired. Choose the time again.");
  }
  return {
    outcome: "paid",
    booking: {
      ...booking,
      status: "paid",
      updatedAt: now.toISOString(),
      payment: {
        provider: "demo",
        status: "paid",
        amountCents: booking.quote.dueNowCents,
        paidAt: now.toISOString(),
      },
    },
  };
}

export async function fulfillIfPaid(store: Store, bookingId: string, mailer?: Mailer): Promise<Booking> {
  const booking = await store.getBooking(bookingId);
  if (!booking) throw new PaymentError("not_payable", "Booking not found.");
  if (booking.payment.status !== "paid" || booking.confirmationEmailSentAt || !booking.intake) return booking;

  try {
    await sendConfirmation(booking, mailer);
  } catch (error) {
    console.error("[camarawong] confirmation email failed", error);
    return booking;
  }

  return store.updateBooking(booking.id, (current) => {
    if (current.confirmationEmailSentAt) return current;
    return { ...current, confirmationEmailSentAt: new Date().toISOString() };
  });
}

export async function processStripeWebhookEvent(args: {
  store: Store;
  event: { type: string; data: { object: CheckoutSessionSnapshot } };
  now?: Date;
  mailer?: Mailer;
}): Promise<{ outcome: "ignored" | "paid" | "already_paid" }> {
  if (!PAID_EVENTS.has(args.event.type)) return { outcome: "ignored" };
  const session = args.event.data.object;
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) throw new PaymentError("not_payable", "Checkout session is missing a booking id.");

  const now = args.now ?? new Date();
  const applied: { outcome: PaymentApplication["outcome"] } = { outcome: "ignored" };
  await args.store.updateBooking(bookingId, (current) => {
    const next = applyCheckoutCompleted(current, session, now);
    applied.outcome = next.outcome;
    return next.booking;
  });

  if (applied.outcome === "paid") await fulfillIfPaid(args.store, bookingId, args.mailer);
  return { outcome: applied.outcome };
}

type WebhookClient = {
  webhooks: {
    constructEvent: (
      payload: string,
      signature: string,
      secret: string,
    ) => { type: string; data: { object: unknown } };
  };
};

export async function handleWebhookPayload(args: {
  store: Store;
  payload: string;
  signature: string;
  secret: string;
  stripe: WebhookClient;
  now?: Date;
  mailer?: Mailer;
}): Promise<{ outcome: "ignored" | "paid" | "already_paid" }> {
  let event: { type: string; data: { object: unknown } };
  try {
    event = args.stripe.webhooks.constructEvent(args.payload, args.signature, args.secret);
  } catch {
    throw new PaymentError("invalid_signature", "Invalid signature.");
  }
  return processStripeWebhookEvent({
    store: args.store,
    event: {
      type: event.type,
      data: { object: event.data.object as CheckoutSessionSnapshot },
    },
    now: args.now,
    mailer: args.mailer,
  });
}
