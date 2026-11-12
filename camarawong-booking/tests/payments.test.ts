import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError, PaymentError } from "@/lib/errors";
import type { Mailer } from "@/lib/email";
import { applyCheckoutCompleted, applyDemoPayment, handleWebhookPayload } from "@/lib/payments";
import { planIntake, planSignature } from "@/lib/transitions";
import type { Booking } from "@/lib/types";
import { NOW, sampleIntake, testStore } from "./helpers";

const stripe = new Stripe("sk_test_placeholder");
const secret = "whsec_test_secret";

async function pendingDigital() {
  const store = testStore();
  const held = await store.createHold({
    packageId: "digital",
    date: "2026-11-18",
    startTime: "16:00",
    addons: [],
    now: NOW,
  });
  await store.updateBooking(held.id, (current) => planIntake(current, sampleIntake(), NOW));
  const signed = await store.updateBooking(held.id, (current) => planSignature(current, "Jordan Blake", true, NOW));
  return { store, signed };
}

function sessionFor(booking: Booking, overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_1",
    object: "checkout.session",
    amount_total: booking.quote.dueNowCents,
    payment_status: "paid",
    metadata: { bookingId: booking.id },
    payment_intent: "pi_test_1",
    ...overrides,
  };
}

function payload(session: object, type = "checkout.session.completed") {
  return JSON.stringify({ id: "evt_test_1", object: "event", type, data: { object: session } });
}

describe("payment webhook", () => {
  const sent: string[] = [];
  const mailer: Mailer = async (message) => {
    sent.push(`${message.to}:${message.subject}`);
  };

  beforeEach(() => {
    sent.length = 0;
  });

  it("marks the deposit paid from a signed Stripe event and emails once", async () => {
    const { store, signed } = await pendingDigital();
    expect(signed.quote.totalCents).toBe(300_000);
    expect(signed.quote.dueNowCents).toBe(150_000);
    const body = payload(sessionFor(signed));
    const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

    const result = await handleWebhookPayload({
      store,
      payload: body,
      signature: header,
      secret,
      stripe,
      now: NOW,
      mailer,
    });

    expect(result.outcome).toBe("paid");
    const saved = await store.getBooking(signed.id);
    expect(saved?.status).toBe("paid");
    expect(saved?.payment).toMatchObject({
      provider: "stripe",
      status: "paid",
      amountCents: 150_000,
      stripeSessionId: "cs_test_1",
      stripePaymentIntentId: "pi_test_1",
    });
    expect(saved?.confirmationEmailSentAt).toBeTruthy();
    const mailed = sent.length;
    expect(mailed).toBeGreaterThan(0);

    const again = await handleWebhookPayload({
      store,
      payload: body,
      signature: header,
      secret,
      stripe,
      now: NOW,
      mailer,
    });
    expect(again.outcome).toBe("already_paid");
    expect(sent.length).toBe(mailed);
  });

  it("rejects a bad signature and does not mark the booking paid", async () => {
    const { store, signed } = await pendingDigital();
    await expect(
      handleWebhookPayload({
        store,
        payload: payload(sessionFor(signed)),
        signature: "t=1,v1=deadbeef",
        secret,
        stripe,
        now: NOW,
        mailer,
      }),
    ).rejects.toMatchObject({ code: "invalid_signature" });
    expect((await store.getBooking(signed.id))?.status).toBe("pending_payment");
    expect(sent).toEqual([]);
  });

  it("refuses the full package price when only the deposit is due", async () => {
    const { store, signed } = await pendingDigital();
    const body = payload(sessionFor(signed, { amount_total: signed.quote.totalCents }));
    const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
    await expect(
      handleWebhookPayload({ store, payload: body, signature: header, secret, stripe, now: NOW, mailer }),
    ).rejects.toBeInstanceOf(PaymentError);
    expect((await store.getBooking(signed.id))?.payment.status).toBe("unpaid");
  });

  it("ignores unpaid sessions and unrelated events", async () => {
    const { store, signed } = await pendingDigital();
    const unpaid = payload(sessionFor(signed, { payment_status: "unpaid" }));
    const header = stripe.webhooks.generateTestHeaderString({ payload: unpaid, secret });
    const ignored = await handleWebhookPayload({
      store,
      payload: unpaid,
      signature: header,
      secret,
      stripe,
      now: NOW,
      mailer,
    });
    expect(ignored.outcome).toBe("ignored");

    const other = payload(sessionFor(signed), "charge.succeeded");
    const otherHeader = stripe.webhooks.generateTestHeaderString({ payload: other, secret });
    const skipped = await handleWebhookPayload({
      store,
      payload: other,
      signature: otherHeader,
      secret,
      stripe,
      now: NOW,
      mailer,
    });
    expect(skipped.outcome).toBe("ignored");
    expect((await store.getBooking(signed.id))?.status).toBe("pending_payment");
  });

  it("rejects a session for a different booking and a missing booking", async () => {
    const { signed } = await pendingDigital();
    expect(() => applyCheckoutCompleted(signed, sessionFor(signed, { metadata: { bookingId: "other" } }), NOW)).toThrow(
      PaymentError,
    );

    const store = testStore();
    const body = payload(sessionFor(signed));
    const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
    await expect(
      handleWebhookPayload({ store, payload: body, signature: header, secret, stripe, now: NOW, mailer }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("does not collect an expired payment window", async () => {
    const { signed } = await pendingDigital();
    const expired = { ...signed, holdExpiresAt: new Date(NOW.getTime() - 1000).toISOString() };
    expect(() => applyCheckoutCompleted(expired, sessionFor(expired), NOW)).toThrow(/expired/);
  });

  it("simulates payment in demo mode with the same amount due today", async () => {
    const { store, signed } = await pendingDigital();
    const applied = applyDemoPayment(signed, NOW);
    expect(applied.outcome).toBe("paid");
    expect(applied.booking.payment.provider).toBe("demo");
    expect(applied.booking.payment.amountCents).toBe(signed.quote.dueNowCents);
    const saved = await store.updateBooking(signed.id, () => applied.booking);
    expect(saved.status).toBe("paid");
    expect(applyDemoPayment(saved, NOW).outcome).toBe("already_paid");
  });
});
