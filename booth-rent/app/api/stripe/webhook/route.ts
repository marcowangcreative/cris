import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { isDemoMode } from "@/lib/config";
import { getAdminRepo } from "@/lib/auth";
import { connectOptionsFromWebhookAccount } from "@/lib/stripe/connect";
import { effectsForStripeEvent, type WebhookEffect } from "@/lib/stripe/events";
import { getStripe } from "@/lib/stripe/client";
import { retrieveSetupIntent, setDefaultPaymentMethod } from "@/lib/stripe/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: "Demo mode does not accept Stripe webhooks. Use the status buttons in the demo salon." },
      { status: 400 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing Stripe webhook signature." }, { status: 400 });
  }

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const effect = effectsForStripeEvent({
    type: event.type,
    data: { object: event.data.object as unknown as Record<string, unknown> },
  });

  try {
    await applyEffect(event, effect);
  } catch (error) {
    console.error("Stripe webhook failed", error);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function applyEffect(event: Stripe.Event, effect: WebhookEffect) {
  const admin = getAdminRepo();
  const accountId = event.account ?? null;
  // CONNECT_STUB: connected-account events would be retrieved with this account.
  connectOptionsFromWebhookAccount(accountId);
  const salon = { name: "Booth Rent", stripeAccountId: accountId };

  if (effect.kind === "invoice") {
    await admin.applyInvoiceStatus({
      stripeInvoiceId: effect.stripeInvoiceId,
      status: effect.status,
      errorMessage: effect.errorMessage,
    });
    if (effect.verifyBank && effect.customerId) {
      await admin.setBankByCustomer({
        stripeCustomerId: effect.customerId,
        paymentMethodId: null,
        status: "verified",
      });
    }
    return;
  }

  if (effect.kind === "processing") {
    await admin.applyInvoiceStatus({
      boothInvoiceId: effect.boothInvoiceId,
      stripeInvoiceId: effect.boothInvoiceId ? null : effect.stripeInvoiceId,
      paymentIntentId: effect.boothInvoiceId || effect.stripeInvoiceId ? null : effect.paymentIntentId,
      status: "processing",
      errorMessage: null,
    });
    return;
  }

  if (effect.kind === "bank") {
    let paymentMethodId = effect.paymentMethodId;
    let status = effect.status;
    if (effect.setupIntentId && effect.kind === "bank") {
      try {
        const setup = await retrieveSetupIntent({ salon, setupIntentId: effect.setupIntentId });
        paymentMethodId = setup.paymentMethodId ?? paymentMethodId;
        if (setup.succeeded) status = "verified";
      } catch (error) {
        console.warn("Could not read the setup intent from Stripe.", error);
      }
    }
    if (status === "verified" && paymentMethodId) {
      try {
        await setDefaultPaymentMethod({ salon, customerId: effect.customerId, paymentMethodId });
      } catch (error) {
        console.warn("Could not set the default payment method.", error);
      }
    }
    await admin.setBankByCustomer({
      stripeCustomerId: effect.customerId,
      paymentMethodId,
      status,
    });
  }
}
