export type BillingModel = "flat_weekly" | "flat_monthly" | "rent_plus_fee" | "percent_rent";

export type InvoiceStatus = "draft" | "sent" | "processing" | "paid" | "failed" | "void";

export type PaymentMethodStatus = "none" | "pending" | "verified";

export type Salon = {
  id: string;
  ownerId: string;
  name: string;
  /** Reserved for Stripe Connect. Unused until connected accounts are implemented. */
  stripeAccountId: string | null;
};

export type Stylist = {
  id: string;
  salonId: string;
  name: string;
  email: string;
  active: boolean;
  billingModel: BillingModel;
  weeklyRent: number;
  monthlyRent: number;
  /** Decimal rate. 0.075 is 7.5%. */
  feeRate: number;
  /** Null means the rent + fee percentage is not capped. */
  serviceFeeMonthlyCap: number | null;
  minimumRemit: number;
  stripeCustomerId: string | null;
  paymentMethodId: string | null;
  paymentMethodStatus: PaymentMethodStatus;
};

export type Invoice = {
  id: string;
  salonId: string;
  stylistId: string;
  weekStart: string;
  weekEnd: string;
  netServiceRevenue: number;
  rentAmount: number;
  serviceFeeRate: number;
  serviceFeeAmount: number;
  totalAmount: number;
  billingModel: BillingModel;
  minimumApplied: boolean;
  capApplied: boolean;
  stripeInvoiceId: string | null;
  stripeInvoiceUrl: string | null;
  stripePaymentIntentId: string | null;
  status: InvoiceStatus;
  errorMessage: string | null;
  dueOn: string | null;
  sentAt: string | null;
  createdAt: string;
};

export const BILLING_MODELS: BillingModel[] = [
  "flat_weekly",
  "flat_monthly",
  "rent_plus_fee",
  "percent_rent",
];

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft",
  "sent",
  "processing",
  "paid",
  "failed",
  "void",
];
