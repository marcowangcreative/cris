import type { Adjustment, ConfidenceLevel, Outcome } from "./engine";

export interface QuoteSnapshot {
  suggestedQuote: number;
  minimumAcceptable: number;
  unroundedQuote: number;
  adjustmentAfterCorridor: number;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  confidenceSummary: string;
  explanations: Adjustment[];
}

/** A quote Marco has approved, or a row imported from his history. The price does not recalculate. */
export interface BookingRecord {
  id: string;
  couple: string;
  eventDate: string;
  inquiryDate: string;
  marketId: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  quotedPrice: number;
  outcome: Outcome;
  notes: string;
  travelDaysBlocked: number;
  qualifiedInquiries: number;
  bookedDates: number;
  targetCapacity: number;
  sample: boolean;
  approvedAt: string;
  /** Demand-model price before a standard-rate hold or manual price. */
  modelQuote: number;
  chargeStandard: boolean;
  clientBudget: number | null;
  manualPrice: number | null;
  /** quotedPrice minus modelQuote, when the recorded price was higher. */
  discountAvoided: number;
  snapshot: QuoteSnapshot;
}

export function normalizeRecord(record: BookingRecord): BookingRecord {
  const modelQuote = typeof record.modelQuote === "number" && Number.isFinite(record.modelQuote)
    ? record.modelQuote
    : record.quotedPrice;
  const discountAvoided = typeof record.discountAvoided === "number" && Number.isFinite(record.discountAvoided)
    ? record.discountAvoided
    : Math.max(0, Math.round(record.quotedPrice - modelQuote));
  return {
    ...record,
    modelQuote,
    chargeStandard: record.chargeStandard === true,
    clientBudget: typeof record.clientBudget === "number" ? record.clientBudget : null,
    manualPrice: typeof record.manualPrice === "number" ? record.manualPrice : null,
    discountAvoided,
  };
}

export function isBookingRecord(value: unknown): value is BookingRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<BookingRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.eventDate === "string" &&
    typeof record.inquiryDate === "string" &&
    typeof record.marketId === "string" &&
    typeof record.packageName === "string" &&
    typeof record.quotedPrice === "number" &&
    (record.outcome === "booked" || record.outcome === "lost" || record.outcome === "pending") &&
    typeof record.sample === "boolean" &&
    typeof record.snapshot === "object" &&
    record.snapshot !== null
  );
}
