import { formatMonth, formatWeekLabel, monthRangeContaining } from "@/lib/dates";
import type { BillingModel, Invoice, InvoiceStatus, Stylist } from "@/lib/domain";
import { formatMoney, formatPercent } from "@/lib/format";
import { roundMoney, toCents } from "@/lib/money";

/**
 * Booth rent rules.
 *
 * A week belongs to the calendar month of its end date. A week that starts in
 * December and ends in January counts entirely toward January.
 *
 * rent + fee: weekly rent plus a percentage of net service revenue. The
 * percentage can have a monthly cap. The cap counts invoices in sent,
 * processing, or paid. Failed and voided invoices do not use the cap.
 *
 * % chair rent: the greater of (percentage of net revenue) and a weekly
 * minimum. The two are not added together.
 *
 * Flat weekly rent is charged every week. Flat monthly rent is charged once
 * per calendar month, on the first run whose week ends in that month. A failed
 * monthly invoice does not count, so a later week can bill it again.
 *
 * Net service revenue is service sales minus discounts and refunds. Tips are
 * not service revenue.
 */
export const DAYS_UNTIL_DUE = 2;

export const CAP_COUNTING_STATUSES: readonly InvoiceStatus[] = ["sent", "processing", "paid"];

const BLOCKING_STATUSES: readonly InvoiceStatus[] = ["draft", "sent", "processing", "paid"];

export type StylistTerms = {
  id: string;
  name: string;
  billingModel: BillingModel;
  weeklyRent: number;
  monthlyRent: number;
  feeRate: number;
  serviceFeeMonthlyCap: number | null;
  minimumRemit: number;
};

export type InvoiceSnapshot = {
  stylistId: string;
  weekStart: string;
  weekEnd: string;
  billingModel: BillingModel;
  serviceFeeAmount: number;
  status: InvoiceStatus;
};

export type LineItem = {
  amountCents: number;
  description: string;
};

export type ChargeResult = {
  stylistId: string;
  stylistName: string;
  billingModel: BillingModel;
  weekStart: string;
  weekEnd: string;
  netServiceRevenue: number;
  rentAmount: number;
  serviceFeeRate: number;
  rawServiceFee: number;
  serviceFeeAmount: number;
  totalAmount: number;
  minimumApplied: boolean;
  capApplied: boolean;
  monthlyFeeAlreadyCounted: number;
  capRemainingBefore: number | null;
  blocked: boolean;
  retriedFailed: boolean;
  skipped: boolean;
  skipReason: string | null;
  note: string;
  lineItems: LineItem[];
};

export type BillingPreview = {
  charges: ChargeResult[];
  invoiceCount: number;
  skippedCount: number;
  totalAmount: number;
};

export function termsFromStylist(stylist: Stylist): StylistTerms {
  return {
    id: stylist.id,
    name: stylist.name,
    billingModel: stylist.billingModel,
    weeklyRent: stylist.weeklyRent,
    monthlyRent: stylist.monthlyRent,
    feeRate: stylist.feeRate,
    serviceFeeMonthlyCap: stylist.serviceFeeMonthlyCap,
    minimumRemit: stylist.minimumRemit,
  };
}

export function snapshotFromInvoice(invoice: Invoice): InvoiceSnapshot {
  return {
    stylistId: invoice.stylistId,
    weekStart: invoice.weekStart,
    weekEnd: invoice.weekEnd,
    billingModel: invoice.billingModel,
    serviceFeeAmount: invoice.serviceFeeAmount,
    status: invoice.status,
  };
}

export function netServiceRevenue(parts: {
  serviceSales: number;
  discounts: number;
  refunds: number;
  /** Ignored. Tips are excluded from net service revenue. */
  tips?: number;
}): number {
  void parts.tips;
  const net = finite(parts.serviceSales) - finite(parts.discounts) - finite(parts.refunds);
  return roundMoney(Math.max(0, net));
}

export function countsTowardCap(status: InvoiceStatus): boolean {
  return CAP_COUNTING_STATUSES.includes(status);
}

export function feeCountedThisMonth(
  history: InvoiceSnapshot[],
  stylistId: string,
  weekEnd: string,
): number {
  const { monthStart, nextMonthStart } = monthRangeContaining(weekEnd);
  return history.reduce((sum, invoice) => {
    if (invoice.stylistId !== stylistId) return sum;
    if (invoice.billingModel !== "rent_plus_fee") return sum;
    if (!countsTowardCap(invoice.status)) return sum;
    if (invoice.weekEnd < monthStart || invoice.weekEnd >= nextMonthStart) return sum;
    return roundMoney(sum + finite(invoice.serviceFeeAmount));
  }, 0);
}

export function monthlyRentAlreadyBilled(
  history: InvoiceSnapshot[],
  stylistId: string,
  weekEnd: string,
): boolean {
  const { monthStart, nextMonthStart } = monthRangeContaining(weekEnd);
  return history.some((invoice) => {
    if (invoice.stylistId !== stylistId) return false;
    if (invoice.billingModel !== "flat_monthly") return false;
    if (!countsTowardCap(invoice.status)) return false;
    return invoice.weekEnd >= monthStart && invoice.weekEnd < nextMonthStart;
  });
}

export function isSendable(charge: ChargeResult): boolean {
  return !charge.skipped && !charge.blocked && charge.totalAmount > 0 && charge.lineItems.length > 0;
}

export function previewBillingRun(input: {
  stylists: StylistTerms[];
  weekStart: string;
  weekEnd: string;
  revenueByStylist: Record<string, number>;
  history: InvoiceSnapshot[];
}): BillingPreview {
  const charges = input.stylists.map((stylist) =>
    calculateCharge({
      stylist,
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      netServiceRevenue: input.revenueByStylist[stylist.id] ?? 0,
      history: input.history,
    }),
  );
  const sendable = charges.filter(isSendable);
  return {
    charges,
    invoiceCount: sendable.length,
    skippedCount: charges.length - sendable.length,
    totalAmount: roundMoney(sendable.reduce((sum, charge) => sum + charge.totalAmount, 0)),
  };
}

export function calculateCharge(input: {
  stylist: StylistTerms;
  weekStart: string;
  weekEnd: string;
  netServiceRevenue: number;
  history: InvoiceSnapshot[];
}): ChargeResult {
  const revenue = roundMoney(Math.max(0, finite(input.netServiceRevenue)));
  const sameWeek = input.history.filter(
    (invoice) => invoice.stylistId === input.stylist.id && invoice.weekStart === input.weekStart,
  );
  const blocking = sameWeek.find((invoice) => BLOCKING_STATUSES.includes(invoice.status));
  const retriedFailed = sameWeek.some((invoice) => invoice.status === "failed");

  const base: ChargeResult = {
    stylistId: input.stylist.id,
    stylistName: input.stylist.name,
    billingModel: input.stylist.billingModel,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    netServiceRevenue: revenue,
    rentAmount: 0,
    serviceFeeRate: 0,
    rawServiceFee: 0,
    serviceFeeAmount: 0,
    totalAmount: 0,
    minimumApplied: false,
    capApplied: false,
    monthlyFeeAlreadyCounted: 0,
    capRemainingBefore: null,
    blocked: false,
    retriedFailed,
    skipped: false,
    skipReason: null,
    note: "",
    lineItems: [],
  };

  if (blocking) {
    const reason = `Already ${blocking.status} for this week.`;
    return { ...base, blocked: true, skipped: true, skipReason: reason, note: reason };
  }

  switch (input.stylist.billingModel) {
    case "flat_weekly":
      return finish(flatWeekly(base, input.stylist));
    case "flat_monthly":
      return finish(flatMonthly(base, input.stylist, input.history));
    case "percent_rent":
      return finish(percentRent(base, input.stylist));
    case "rent_plus_fee":
      return finish(rentPlusFee(base, input.stylist, input.history));
    default: {
      const unknown: never = input.stylist.billingModel;
      throw new Error(`Unknown billing model ${unknown}`);
    }
  }
}

function flatWeekly(base: ChargeResult, stylist: StylistTerms): ChargeResult {
  const rent = nonNegative(stylist.weeklyRent);
  return {
    ...base,
    rentAmount: rent,
    totalAmount: rent,
    note: "Flat weekly rent. Revenue is recorded and does not change the amount.",
    lineItems: rent
      ? [
          {
            amountCents: toCents(rent),
            description: `Weekly chair rent — ${weekPhrase(base.weekStart, base.weekEnd)}`,
          },
        ]
      : [],
  };
}

function flatMonthly(
  base: ChargeResult,
  stylist: StylistTerms,
  history: InvoiceSnapshot[],
): ChargeResult {
  const rent = nonNegative(stylist.monthlyRent);
  const month = formatMonth(base.weekEnd);
  if (monthlyRentAlreadyBilled(history, stylist.id, base.weekEnd)) {
    const reason = `${month} rent was already billed.`;
    return {
      ...base,
      skipped: true,
      skipReason: reason,
      note: `${month} rent was already billed on an earlier week. Nothing due this week.`,
    };
  }
  const failedEarlier = history.some((invoice) => {
    if (invoice.stylistId !== stylist.id || invoice.billingModel !== "flat_monthly") return false;
    if (invoice.status !== "failed") return false;
    const { monthStart, nextMonthStart } = monthRangeContaining(base.weekEnd);
    return invoice.weekEnd >= monthStart && invoice.weekEnd < nextMonthStart;
  });
  return {
    ...base,
    rentAmount: rent,
    totalAmount: rent,
    note: failedEarlier
      ? `The earlier ${month} invoice failed, so it does not count. Billing ${formatMoney(rent)} again.`
      : `Flat monthly rent for ${month}, billed on the first week you run that ends in ${month}.`,
    lineItems: rent
      ? [{ amountCents: toCents(rent), description: `Monthly chair rent — ${month}` }]
      : [],
  };
}

function percentRent(base: ChargeResult, stylist: StylistTerms): ChargeResult {
  const feeRate = clampRate(stylist.feeRate);
  const minimum = nonNegative(stylist.minimumRemit);
  const raw = roundMoney(base.netServiceRevenue * feeRate);
  const minimumApplied = raw < minimum;
  const total = minimumApplied ? minimum : raw;
  const percent = formatPercent(feeRate);
  const description = minimumApplied
    ? `Chair rent — ${weekPhrase(base.weekStart, base.weekEnd)} (${percent} of ${formatMoney(base.netServiceRevenue)} is ${formatMoney(raw)}; ${formatMoney(minimum)} weekly minimum applied)`
    : `Chair rent (${percent} of ${formatMoney(base.netServiceRevenue)} net services) — ${weekPhrase(base.weekStart, base.weekEnd)}`;
  return {
    ...base,
    serviceFeeRate: feeRate,
    rawServiceFee: raw,
    serviceFeeAmount: total,
    totalAmount: total,
    minimumApplied,
    note: minimumApplied
      ? `${percent} is ${formatMoney(raw)}, so the ${formatMoney(minimum)} weekly minimum applies.`
      : `${percent} of net services is ${formatMoney(raw)}, above the ${formatMoney(minimum)} minimum.`,
    lineItems: total ? [{ amountCents: toCents(total), description }] : [],
  };
}

function rentPlusFee(
  base: ChargeResult,
  stylist: StylistTerms,
  history: InvoiceSnapshot[],
): ChargeResult {
  const feeRate = clampRate(stylist.feeRate);
  const rent = nonNegative(stylist.weeklyRent);
  const rawFee = roundMoney(base.netServiceRevenue * feeRate);
  const counted = feeCountedThisMonth(history, stylist.id, base.weekEnd);
  const cap =
    stylist.serviceFeeMonthlyCap == null ? null : nonNegative(stylist.serviceFeeMonthlyCap);
  const remaining = cap == null ? null : roundMoney(Math.max(0, cap - counted));
  const fee = remaining == null ? rawFee : Math.min(rawFee, remaining);
  const capApplied = remaining != null && fee + 0.001 < rawFee;
  const total = roundMoney(rent + fee);
  const percent = formatPercent(feeRate);
  const lineItems: LineItem[] = [];
  if (rent > 0) {
    lineItems.push({
      amountCents: toCents(rent),
      description: `Weekly chair rent — ${weekPhrase(base.weekStart, base.weekEnd)}`,
    });
  }
  if (fee > 0) {
    lineItems.push({
      amountCents: toCents(fee),
      description:
        capApplied && cap != null
          ? `Service fee (capped at ${formatMoney(cap)}/mo — ${formatMoney(fee)} of ${formatMoney(rawFee)} due) — ${weekPhrase(base.weekStart, base.weekEnd)}`
          : `Service fee (${percent} of ${formatMoney(base.netServiceRevenue)} net services) — ${weekPhrase(base.weekStart, base.weekEnd)}`,
    });
  }
  const note =
    cap == null
      ? `${formatMoney(rent)} rent + ${percent} fee (${formatMoney(rawFee)}).`
      : capApplied
        ? `${formatMoney(counted)} of the ${formatMoney(cap)} monthly fee cap is already used. ${formatMoney(fee)} of the ${formatMoney(rawFee)} fee is billed.`
        : `${formatMoney(counted)} of the ${formatMoney(cap)} monthly fee cap is already used. This fee fits.`;
  return {
    ...base,
    rentAmount: rent,
    serviceFeeRate: feeRate,
    rawServiceFee: rawFee,
    serviceFeeAmount: fee,
    totalAmount: total,
    capApplied,
    monthlyFeeAlreadyCounted: counted,
    capRemainingBefore: remaining,
    note,
    lineItems,
  };
}

function finish(result: ChargeResult): ChargeResult {
  let next = result;
  if (next.retriedFailed && !next.blocked && !next.skipped) {
    next = {
      ...next,
      note: next.note
        ? `An earlier invoice for this week failed and does not count. ${next.note}`
        : "An earlier invoice for this week failed and does not count.",
    };
  }
  if (next.totalAmount <= 0 && !next.blocked) {
    return {
      ...next,
      skipped: true,
      skipReason: next.skipReason ?? "Nothing to invoice.",
    };
  }
  return next;
}

function weekPhrase(weekStart: string, weekEnd: string): string {
  return `week of ${formatWeekLabel(weekStart, weekEnd)}`;
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function nonNegative(value: number): number {
  return roundMoney(Math.max(0, finite(value)));
}

function clampRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
