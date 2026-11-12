import { describe, expect, it } from "vitest";
import { effectsForStripeEvent } from "@/lib/stripe/events";

describe("Stripe webhook effects", () => {
  it("marks an invoice paid and verifies the bank", () => {
    expect(
      effectsForStripeEvent({
        type: "invoice.paid",
        data: { object: { id: "in_1", object: "invoice", customer: "cus_1" } },
      }),
    ).toMatchObject({
      kind: "invoice",
      stripeInvoiceId: "in_1",
      status: "paid",
      verifyBank: true,
      customerId: "cus_1",
    });
  });

  it("records an ACH failure without treating it as paid", () => {
    expect(
      effectsForStripeEvent({
        type: "invoice.payment_failed",
        data: {
          object: {
            id: "in_2",
            object: "invoice",
            last_finalization_error: { message: "Bank account closed." },
          },
        },
      }),
    ).toMatchObject({ kind: "invoice", status: "failed", errorMessage: "Bank account closed." });
  });

  it("reads processing from a payment intent that carries our metadata", () => {
    expect(
      effectsForStripeEvent({
        type: "payment_intent.processing",
        data: {
          object: {
            id: "pi_1",
            object: "payment_intent",
            metadata: { booth_invoice_id: "inv_1", stripe_invoice_id: "in_9" },
          },
        },
      }),
    ).toEqual({
      kind: "processing",
      boothInvoiceId: "inv_1",
      stripeInvoiceId: "in_9",
      paymentIntentId: "pi_1",
    });
  });

  it("reads processing from a pending charge's payment intent", () => {
    expect(
      effectsForStripeEvent({
        type: "charge.pending",
        data: { object: { id: "ch_1", object: "charge", payment_intent: "pi_2" } },
      }),
    ).toMatchObject({ kind: "processing", paymentIntentId: "pi_2" });
  });

  it("captures a succeeded bank setup", () => {
    expect(
      effectsForStripeEvent({
        type: "setup_intent.succeeded",
        data: {
          object: { id: "seti_1", object: "setup_intent", customer: "cus_1", payment_method: "pm_1" },
        },
      }),
    ).toMatchObject({ kind: "bank", status: "verified", paymentMethodId: "pm_1", customerId: "cus_1" });
  });

  it("ignores a checkout session that is not a bank setup", () => {
    expect(
      effectsForStripeEvent({
        type: "checkout.session.completed",
        data: { object: { id: "cs_1", mode: "payment", customer: "cus_1" } },
      }),
    ).toEqual({ kind: "ignore" });
  });

  it("voids an invoice", () => {
    expect(
      effectsForStripeEvent({
        type: "invoice.voided",
        data: { object: { id: "in_3", object: "invoice" } },
      }),
    ).toMatchObject({ kind: "invoice", status: "void" });
  });
});
