import type Stripe from "stripe";
import { connectRequestOptions } from "@/lib/stripe/connect";
import { getStripe } from "@/lib/stripe/client";
import type { LineItem } from "@/lib/billing/calculate";

type SalonRef = { name: string; stripeAccountId: string | null };

export async function ensureStripeCustomer(input: {
  salon: SalonRef;
  stylistId: string;
  name: string;
  email: string;
  existingCustomerId: string | null;
}): Promise<string> {
  if (input.existingCustomerId) return input.existingCustomerId;
  const stripe = getStripe();
  const customer = await stripe.customers.create(
    {
      name: input.name,
      email: input.email,
      metadata: {
        product: "booth-rent",
        booth_stylist_id: input.stylistId,
      },
    },
    withKey(connectRequestOptions(input.salon), `booth-customer-${input.stylistId}`),
  );
  return customer.id;
}

export async function createBankSetupLink(input: {
  salon: SalonRef;
  customerId: string;
  stylistId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "setup",
      customer: input.customerId,
      currency: "usd",
      payment_method_types: ["us_bank_account"],
      payment_method_options: {
        us_bank_account: {
          financial_connections: { permissions: ["payment_method"] },
          verification_method: "automatic",
        },
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: { product: "booth-rent", booth_stylist_id: input.stylistId },
    },
    connectRequestOptions(input.salon),
  );
  if (!session.url) throw new Error("Stripe did not return a setup link.");
  return session.url;
}

export async function createHostedAchInvoice(input: {
  salon: SalonRef & { id: string };
  customerId: string;
  boothInvoiceId: string;
  stylistId: string;
  weekStart: string;
  weekEnd: string;
  billingModel: string;
  description: string;
  lineItems: LineItem[];
}): Promise<{
  stripeInvoiceId: string;
  hostedInvoiceUrl: string | null;
  paymentIntentId: string | null;
  dueOn: string | null;
}> {
  const stripe = getStripe();
  const options = connectRequestOptions(input.salon);
  const draft = await stripe.invoices.create(
    {
      customer: input.customerId,
      collection_method: "send_invoice",
      days_until_due: 2,
      auto_advance: false,
      pending_invoice_items_behavior: "exclude",
      currency: "usd",
      description: input.description,
      payment_settings: { payment_method_types: ["us_bank_account"] },
      metadata: {
        product: "booth-rent",
        booth_invoice_id: input.boothInvoiceId,
        salon_id: input.salon.id,
        stylist_id: input.stylistId,
        week_start: input.weekStart,
        week_end: input.weekEnd,
        billing_model: input.billingModel,
      },
    },
    withKey(options, `booth-invoice-${input.boothInvoiceId}`),
  );

  for (const [index, item] of input.lineItems.entries()) {
    await stripe.invoiceItems.create(
      {
        customer: input.customerId,
        invoice: draft.id,
        amount: item.amountCents,
        currency: "usd",
        description: item.description,
      },
      withKey(options, `booth-invoice-${input.boothInvoiceId}-item-${index}`),
    );
  }

  const finalized = await stripe.invoices.finalizeInvoice(
    draft.id,
    { expand: ["payments"] },
    withKey(options, `booth-invoice-${input.boothInvoiceId}-finalize`),
  );

  const paymentIntentId = await paymentIntentIdFor(stripe, finalized, options);
  if (paymentIntentId) {
    try {
      await stripe.paymentIntents.update(
        paymentIntentId,
        {
          metadata: {
            product: "booth-rent",
            booth_invoice_id: input.boothInvoiceId,
            stripe_invoice_id: finalized.id,
          },
        },
        options,
      );
    } catch (error) {
      console.warn("Could not copy invoice metadata onto the PaymentIntent.", error);
    }
  }

  const sent = await stripe.invoices.sendInvoice(
    finalized.id,
    {},
    withKey(options, `booth-invoice-${input.boothInvoiceId}-send`),
  );

  return {
    stripeInvoiceId: sent.id,
    hostedInvoiceUrl: sent.hosted_invoice_url ?? null,
    paymentIntentId,
    dueOn: sent.due_date ? new Date(sent.due_date * 1000).toISOString().slice(0, 10) : null,
  };
}

export async function setDefaultPaymentMethod(input: {
  salon: SalonRef;
  customerId: string;
  paymentMethodId: string;
}): Promise<void> {
  const stripe = getStripe();
  await stripe.customers.update(
    input.customerId,
    { invoice_settings: { default_payment_method: input.paymentMethodId } },
    connectRequestOptions(input.salon),
  );
}

export async function retrieveSetupIntent(input: {
  salon: SalonRef;
  setupIntentId: string;
}): Promise<{ paymentMethodId: string | null; succeeded: boolean }> {
  const stripe = getStripe();
  const intent = await stripe.setupIntents.retrieve(input.setupIntentId, connectRequestOptions(input.salon));
  const paymentMethod = intent.payment_method;
  const paymentMethodId =
    typeof paymentMethod === "string" ? paymentMethod : paymentMethod?.id ?? null;
  return { paymentMethodId, succeeded: intent.status === "succeeded" };
}

async function paymentIntentIdFor(
  stripe: Stripe,
  invoice: Stripe.Invoice,
  options: Stripe.RequestOptions | undefined,
): Promise<string | null> {
  const expanded = invoice.payments?.data?.[0]?.payment.payment_intent;
  const direct = idOf(expanded);
  if (direct) return direct;
  const listed = await stripe.invoicePayments.list({ invoice: invoice.id, limit: 1 }, options);
  return idOf(listed.data[0]?.payment.payment_intent);
}

function idOf(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function withKey(
  options: Stripe.RequestOptions | undefined,
  idempotencyKey: string,
): Stripe.RequestOptions {
  return { ...options, idempotencyKey };
}
