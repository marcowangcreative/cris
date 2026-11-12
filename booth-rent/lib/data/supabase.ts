import type { SupabaseClient } from "@supabase/supabase-js";
import { canTransition, statusesThatCanBecome } from "@/lib/billing/status";
import type {
  AdminRepo,
  InvoiceDraft,
  InvoicePatch,
  Repo,
  StripeCustomerPatch,
} from "@/lib/data/types";
import type {
  BillingModel,
  Invoice,
  InvoiceStatus,
  PaymentMethodStatus,
  Salon,
  Stylist,
} from "@/lib/domain";
import type { StylistInput } from "@/lib/validation";

type Row = Record<string, unknown>;

export function createUserRepo(client: SupabaseClient): Repo {
  return {
    async getSalonByOwner(ownerId) {
      const { data, error } = await client
        .from("salons")
        .select("*")
        .eq("owner_id", ownerId)
        .limit(1);
      raise(error);
      return data?.[0] ? mapSalon(data[0]) : null;
    },
    async createSalon(input) {
      const { data, error } = await client
        .from("salons")
        .insert({ owner_id: input.ownerId, name: input.name })
        .select("*")
        .single();
      raise(error);
      return mapSalon(data);
    },
    async updateSalon(salonId, ownerId, name) {
      const { data, error } = await client
        .from("salons")
        .update({ name })
        .eq("id", salonId)
        .eq("owner_id", ownerId)
        .select("*")
        .single();
      raise(error);
      return mapSalon(data);
    },
    async listStylists(salonId) {
      const { data, error } = await client
        .from("stylists")
        .select("*")
        .eq("salon_id", salonId)
        .order("name");
      raise(error);
      return (data ?? []).map(mapStylist);
    },
    async getStylist(salonId, stylistId) {
      const { data, error } = await client
        .from("stylists")
        .select("*")
        .eq("salon_id", salonId)
        .eq("id", stylistId)
        .maybeSingle();
      raise(error);
      return data ? mapStylist(data) : null;
    },
    async createStylist(salonId, input) {
      const { data, error } = await client
        .from("stylists")
        .insert(stylistPayload(salonId, input))
        .select("*")
        .single();
      raise(error);
      return mapStylist(data);
    },
    async updateStylist(salonId, stylistId, input) {
      const { data, error } = await client
        .from("stylists")
        .update({ ...stylistPayload(salonId, input), updated_at: now() })
        .eq("salon_id", salonId)
        .eq("id", stylistId)
        .select("*")
        .single();
      raise(error);
      return mapStylist(data);
    },
    async setStylistStripe(salonId, stylistId, patch) {
      const { error } = await client
        .from("stylists")
        .update({ ...stripePayload(patch), updated_at: now() })
        .eq("salon_id", salonId)
        .eq("id", stylistId);
      raise(error);
    },
    async listInvoices(salonId) {
      const { data, error } = await client
        .from("invoices")
        .select("*")
        .eq("salon_id", salonId)
        .order("created_at", { ascending: false });
      raise(error);
      return (data ?? []).map(mapInvoice);
    },
    async getInvoice(salonId, invoiceId) {
      const { data, error } = await client
        .from("invoices")
        .select("*")
        .eq("salon_id", salonId)
        .eq("id", invoiceId)
        .maybeSingle();
      raise(error);
      return data ? mapInvoice(data) : null;
    },
    async insertInvoice(input) {
      const { data, error } = await client
        .from("invoices")
        .insert(invoicePayload(input))
        .select("*")
        .single();
      raise(error);
      return mapInvoice(data);
    },
    async updateInvoice(salonId, invoiceId, patch) {
      const existing = await this.getInvoice(salonId, invoiceId);
      if (!existing) throw new Error("Invoice not found.");
      if (patch.status && patch.status !== existing.status && !canTransition(existing.status, patch.status)) {
        throw new Error(`Cannot change an invoice from ${existing.status} to ${patch.status}.`);
      }
      const { data, error } = await client
        .from("invoices")
        .update({ ...invoicePatch(patch), updated_at: now() })
        .eq("salon_id", salonId)
        .eq("id", invoiceId)
        .select("*")
        .single();
      raise(error);
      return mapInvoice(data);
    },
  };
}

export function createAdminRepo(client: SupabaseClient): AdminRepo {
  return {
    async applyInvoiceStatus(input) {
      let query = client.from("invoices").update({
        status: input.status,
        error_message: input.status === "paid" ? null : (input.errorMessage ?? null),
        updated_at: now(),
      });
      if (input.boothInvoiceId) query = query.eq("id", input.boothInvoiceId);
      else if (input.stripeInvoiceId) query = query.eq("stripe_invoice_id", input.stripeInvoiceId);
      else if (input.paymentIntentId) query = query.eq("stripe_payment_intent_id", input.paymentIntentId);
      else return false;

      const { data, error } = await query
        .in("status", statusesThatCanBecome(input.status))
        .select("id");
      raise(error);
      if ((data ?? []).length > 0) return true;

      const current = await findInvoice(client, input);
      return current?.status === input.status;
    },
    async setBankByCustomer(input) {
      const { data, error } = await client
        .from("stylists")
        .select("id, payment_method_status")
        .eq("stripe_customer_id", input.stripeCustomerId)
        .limit(1);
      raise(error);
      const row = data?.[0] as { id: string; payment_method_status: PaymentMethodStatus } | undefined;
      if (!row) return;
      if (row.payment_method_status === "verified" && input.status === "pending") return;
      const payload: Record<string, string | null> = {
        payment_method_status: input.status,
        updated_at: now(),
      };
      if (input.paymentMethodId) payload.payment_method_id = input.paymentMethodId;
      const { error: updateError } = await client.from("stylists").update(payload).eq("id", row.id);
      raise(updateError);
    },
  };
}

async function findInvoice(
  client: SupabaseClient,
  input: {
    boothInvoiceId?: string | null;
    stripeInvoiceId?: string | null;
    paymentIntentId?: string | null;
  },
): Promise<{ status: InvoiceStatus } | null> {
  let query = client.from("invoices").select("status").limit(1);
  if (input.boothInvoiceId) query = query.eq("id", input.boothInvoiceId);
  else if (input.stripeInvoiceId) query = query.eq("stripe_invoice_id", input.stripeInvoiceId);
  else if (input.paymentIntentId) query = query.eq("stripe_payment_intent_id", input.paymentIntentId);
  else return null;
  const { data, error } = await query;
  raise(error);
  const row = data?.[0] as { status: InvoiceStatus } | undefined;
  return row ?? null;
}

function raise(error: { message: string; code?: string } | null): void {
  if (!error) return;
  const wrapped = new Error(error.message);
  if (error.code === "23505") wrapped.name = "Conflict";
  throw wrapped;
}

function now(): string {
  return new Date().toISOString();
}

function mapSalon(row: Row): Salon {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    name: String(row.name),
    stripeAccountId: row.stripe_account_id ? String(row.stripe_account_id) : null,
  };
}

function mapStylist(row: Row): Stylist {
  return {
    id: String(row.id),
    salonId: String(row.salon_id),
    name: String(row.name),
    email: String(row.email),
    active: Boolean(row.active),
    billingModel: String(row.billing_model) as BillingModel,
    weeklyRent: num(row.weekly_rent),
    monthlyRent: num(row.monthly_rent),
    feeRate: num(row.fee_rate),
    serviceFeeMonthlyCap: row.service_fee_monthly_cap == null ? null : num(row.service_fee_monthly_cap),
    minimumRemit: num(row.minimum_remit),
    stripeCustomerId: row.stripe_customer_id ? String(row.stripe_customer_id) : null,
    paymentMethodId: row.payment_method_id ? String(row.payment_method_id) : null,
    paymentMethodStatus: String(row.payment_method_status) as PaymentMethodStatus,
  };
}

function mapInvoice(row: Row): Invoice {
  return {
    id: String(row.id),
    salonId: String(row.salon_id),
    stylistId: String(row.stylist_id),
    weekStart: dateOnly(row.week_start),
    weekEnd: dateOnly(row.week_end),
    netServiceRevenue: num(row.net_service_revenue),
    rentAmount: num(row.rent_amount),
    serviceFeeRate: num(row.service_fee_rate),
    serviceFeeAmount: num(row.service_fee_amount),
    totalAmount: num(row.total_amount),
    billingModel: String(row.billing_model) as BillingModel,
    minimumApplied: Boolean(row.minimum_applied),
    capApplied: Boolean(row.cap_applied),
    stripeInvoiceId: row.stripe_invoice_id ? String(row.stripe_invoice_id) : null,
    stripeInvoiceUrl: row.stripe_invoice_url ? String(row.stripe_invoice_url) : null,
    stripePaymentIntentId: row.stripe_payment_intent_id ? String(row.stripe_payment_intent_id) : null,
    status: String(row.status) as InvoiceStatus,
    errorMessage: row.error_message ? String(row.error_message) : null,
    dueOn: row.due_on ? dateOnly(row.due_on) : null,
    sentAt: row.sent_at ? String(row.sent_at) : null,
    createdAt: String(row.created_at),
  };
}

function stylistPayload(salonId: string, input: StylistInput) {
  return {
    salon_id: salonId,
    name: input.name,
    email: input.email,
    active: input.active,
    billing_model: input.billingModel,
    weekly_rent: input.weeklyRent,
    monthly_rent: input.monthlyRent,
    fee_rate: input.feeRate,
    service_fee_monthly_cap: input.serviceFeeMonthlyCap,
    minimum_remit: input.minimumRemit,
  };
}

function stripePayload(patch: StripeCustomerPatch) {
  const payload: Record<string, string | null> = {};
  if (patch.stripeCustomerId !== undefined) payload.stripe_customer_id = patch.stripeCustomerId;
  if (patch.paymentMethodId !== undefined) payload.payment_method_id = patch.paymentMethodId;
  if (patch.paymentMethodStatus) payload.payment_method_status = patch.paymentMethodStatus;
  return payload;
}

function invoicePayload(input: InvoiceDraft) {
  return {
    salon_id: input.salonId,
    stylist_id: input.stylistId,
    week_start: input.weekStart,
    week_end: input.weekEnd,
    net_service_revenue: input.netServiceRevenue,
    rent_amount: input.rentAmount,
    service_fee_rate: input.serviceFeeRate,
    service_fee_amount: input.serviceFeeAmount,
    total_amount: input.totalAmount,
    billing_model: input.billingModel,
    minimum_applied: input.minimumApplied,
    cap_applied: input.capApplied,
    stripe_invoice_id: input.stripeInvoiceId,
    stripe_invoice_url: input.stripeInvoiceUrl,
    stripe_payment_intent_id: input.stripePaymentIntentId,
    status: "draft",
    error_message: input.errorMessage,
    due_on: input.dueOn,
    sent_at: input.sentAt,
  };
}

function invoicePatch(patch: InvoicePatch) {
  const payload: Record<string, string | null> = {};
  if (patch.status) payload.status = patch.status;
  if (patch.stripeInvoiceId !== undefined) payload.stripe_invoice_id = patch.stripeInvoiceId;
  if (patch.stripeInvoiceUrl !== undefined) payload.stripe_invoice_url = patch.stripeInvoiceUrl;
  if (patch.stripePaymentIntentId !== undefined) {
    payload.stripe_payment_intent_id = patch.stripePaymentIntentId;
  }
  if (patch.errorMessage !== undefined) payload.error_message = patch.errorMessage;
  if (patch.dueOn !== undefined) payload.due_on = patch.dueOn;
  if (patch.sentAt !== undefined) payload.sent_at = patch.sentAt;
  return payload;
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateOnly(value: unknown): string {
  return String(value).slice(0, 10);
}
