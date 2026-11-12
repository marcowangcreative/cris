import type { StylistTerms } from "@/lib/billing/calculate";
import type { BillingModel, PaymentMethodStatus } from "@/lib/domain";
import { formatMoney, formatPercent } from "@/lib/format";

export function modelLabel(model: BillingModel): string {
  switch (model) {
    case "flat_weekly":
      return "Flat weekly";
    case "flat_monthly":
      return "Flat monthly";
    case "rent_plus_fee":
      return "Rent + fee";
    case "percent_rent":
      return "% chair rent";
  }
}

export function termsLabel(terms: StylistTerms): string {
  switch (terms.billingModel) {
    case "flat_weekly":
      return `${formatMoney(terms.weeklyRent)} / week`;
    case "flat_monthly":
      return `${formatMoney(terms.monthlyRent)} / month`;
    case "rent_plus_fee": {
      const cap =
        terms.serviceFeeMonthlyCap == null
          ? "no cap"
          : `cap ${formatMoney(terms.serviceFeeMonthlyCap)}/mo`;
      return `${formatMoney(terms.weeklyRent)} / week + ${formatPercent(terms.feeRate)}, ${cap}`;
    }
    case "percent_rent":
      return `${formatPercent(terms.feeRate)} or ${formatMoney(terms.minimumRemit)} minimum`;
  }
}

export function bankLabel(status: PaymentMethodStatus): string {
  switch (status) {
    case "none":
      return "No bank linked";
    case "pending":
      return "Bank setup started";
    case "verified":
      return "Bank linked";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "sent":
      return "Sent";
    case "processing":
      return "Processing";
    case "paid":
      return "Paid";
    case "failed":
      return "Failed";
    case "void":
      return "Void";
    case "draft":
      return "Draft";
    default:
      return status;
  }
}
