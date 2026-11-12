import type { InvoiceStatus } from "@/lib/domain";

export type WebhookEffect =
  | { kind: "ignore" }
  | {
      kind: "invoice";
      stripeInvoiceId: string;
      status: Extract<InvoiceStatus, "sent" | "processing" | "paid" | "failed" | "void">;
      errorMessage: string | null;
      customerId: string | null;
      verifyBank: boolean;
    }
  | {
      kind: "processing";
      boothInvoiceId: string | null;
      stripeInvoiceId: string | null;
      paymentIntentId: string | null;
    }
  | {
      kind: "bank";
      customerId: string;
      paymentMethodId: string | null;
      setupIntentId: string | null;
      status: "pending" | "verified";
    };

type LooseEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

export function effectsForStripeEvent(event: LooseEvent): WebhookEffect {
  const object = event.data.object;
  switch (event.type) {
    case "invoice.sent":
      return invoiceEffect(object, "sent", null, false);
    case "invoice.paid":
    case "invoice.payment_succeeded":
      return invoiceEffect(object, "paid", null, true);
    case "invoice.payment_failed":
      return invoiceEffect(object, "failed", failureMessage(object), false);
    case "invoice.voided":
      return invoiceEffect(object, "void", null, false);
    case "invoice.marked_uncollectible":
      return invoiceEffect(object, "failed", "Marked uncollectible.", false);
    case "payment_intent.processing":
    case "charge.pending":
      return {
        kind: "processing",
        boothInvoiceId: metadata(object).booth_invoice_id ?? null,
        stripeInvoiceId: metadata(object).stripe_invoice_id ?? idOf(object.invoice),
        paymentIntentId:
          object.object === "payment_intent" ? idOf(object.id) : idOf(object.payment_intent),
      };
    case "setup_intent.succeeded":
      return bankEffect(object, "verified");
    case "setup_intent.requires_action":
      return bankEffect(object, "pending");
    case "checkout.session.completed": {
      if (object.mode !== "setup") return { kind: "ignore" };
      const customerId = idOf(object.customer);
      if (!customerId) return { kind: "ignore" };
      return {
        kind: "bank",
        customerId,
        paymentMethodId: null,
        setupIntentId: idOf(object.setup_intent),
        status: "pending",
      };
    }
    default:
      return { kind: "ignore" };
  }
}

function invoiceEffect(
  object: Record<string, unknown>,
  status: Extract<InvoiceStatus, "sent" | "processing" | "paid" | "failed" | "void">,
  errorMessage: string | null,
  verifyBank: boolean,
): WebhookEffect {
  const stripeInvoiceId = idOf(object.id);
  if (!stripeInvoiceId) return { kind: "ignore" };
  return {
    kind: "invoice",
    stripeInvoiceId,
    status,
    errorMessage,
    customerId: idOf(object.customer),
    verifyBank,
  };
}

function bankEffect(object: Record<string, unknown>, status: "pending" | "verified"): WebhookEffect {
  const customerId = idOf(object.customer);
  if (!customerId) return { kind: "ignore" };
  return {
    kind: "bank",
    customerId,
    paymentMethodId: idOf(object.payment_method),
    setupIntentId: idOf(object.id),
    status,
  };
}

function failureMessage(object: Record<string, unknown>): string {
  const finalization = nestedMessage(object.last_finalization_error);
  return finalization ?? "ACH payment failed.";
}

function nestedMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const message = (value as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : null;
}

function metadata(object: Record<string, unknown>): Record<string, string> {
  if (!object.metadata || typeof object.metadata !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(object.metadata)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

function idOf(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}
