import type {
  Invoice,
  InvoiceStatus,
  PaymentMethodStatus,
  Salon,
  Stylist,
} from "@/lib/domain";
import type { StylistInput } from "@/lib/validation";

export type InvoiceDraft = Omit<Invoice, "id" | "createdAt">;

export type InvoicePatch = {
  status?: InvoiceStatus;
  stripeInvoiceId?: string | null;
  stripeInvoiceUrl?: string | null;
  stripePaymentIntentId?: string | null;
  errorMessage?: string | null;
  dueOn?: string | null;
  sentAt?: string | null;
};

export type StripeCustomerPatch = {
  stripeCustomerId?: string | null;
  paymentMethodId?: string | null;
  paymentMethodStatus?: PaymentMethodStatus;
};

export interface Repo {
  getSalonByOwner(ownerId: string): Promise<Salon | null>;
  createSalon(input: { ownerId: string; name: string }): Promise<Salon>;
  updateSalon(salonId: string, ownerId: string, name: string): Promise<Salon>;
  listStylists(salonId: string): Promise<Stylist[]>;
  getStylist(salonId: string, stylistId: string): Promise<Stylist | null>;
  createStylist(salonId: string, input: StylistInput): Promise<Stylist>;
  updateStylist(salonId: string, stylistId: string, input: StylistInput): Promise<Stylist>;
  setStylistStripe(salonId: string, stylistId: string, patch: StripeCustomerPatch): Promise<void>;
  listInvoices(salonId: string): Promise<Invoice[]>;
  getInvoice(salonId: string, invoiceId: string): Promise<Invoice | null>;
  insertInvoice(input: InvoiceDraft): Promise<Invoice>;
  updateInvoice(salonId: string, invoiceId: string, patch: InvoicePatch): Promise<Invoice>;
}

export interface AdminRepo {
  applyInvoiceStatus(input: {
    boothInvoiceId?: string | null;
    stripeInvoiceId?: string | null;
    paymentIntentId?: string | null;
    status: InvoiceStatus;
    errorMessage?: string | null;
  }): Promise<boolean>;
  setBankByCustomer(input: {
    stripeCustomerId: string;
    paymentMethodId: string | null;
    status: "pending" | "verified";
  }): Promise<void>;
}

export function isConflict(error: unknown): boolean {
  return error instanceof Error && error.name === "Conflict";
}
