import { quotePrice } from "./quote";
import type { Outcome, PricingConfig } from "./types";

/** One past inquiry, shaped so the pure engine can reprice it without reading storage. */
export interface BacktestInquiry {
  id: string;
  label: string;
  outcome: Outcome;
  sample: boolean;
  eventDate: string;
  inquiryDate: string;
  tierId: string;
  marketId: string;
  packageId: string;
  quotedPrice: number;
  qualifiedInquiries: number;
  bookedDates: number;
  targetCapacity: number;
  bookedOnDate: number;
  travelDaysBlocked: number;
  chargeStandard: boolean;
  clientBudget: number | null;
}

export interface BacktestLine {
  id: string;
  label: string;
  outcome: Outcome;
  actual: number;
  model: number | null;
  floor: number | null;
  /** Actual quote minus the current model. Null when the row cannot be priced. */
  delta: number | null;
  detail: string;
}

export interface BacktestReport {
  lines: BacktestLine[];
  bookedCount: number;
  lostCount: number;
  bookedActual: number;
  bookedModel: number;
  lostActual: number;
  lostModel: number;
}

export function backtestInquiries(rows: BacktestInquiry[], config: PricingConfig): BacktestReport {
  const lines = rows.filter((row) => !row.sample).map((row) => priceRow(row, config));
  const booked = lines.filter((line) => line.outcome === "booked" && line.model !== null);
  const lost = lines.filter((line) => line.outcome === "lost" && line.model !== null);
  return {
    lines,
    bookedCount: booked.length,
    lostCount: lost.length,
    bookedActual: sum(booked, "actual"),
    bookedModel: sum(booked, "model"),
    lostActual: sum(lost, "actual"),
    lostModel: sum(lost, "model"),
  };
}

function priceRow(row: BacktestInquiry, config: PricingConfig): BacktestLine {
  const result = quotePrice(
    {
      eventDate: row.eventDate,
      inquiryDate: row.inquiryDate,
      tierId: row.tierId,
      marketId: row.marketId,
      packageId: row.packageId,
      qualifiedInquiries: row.qualifiedInquiries,
      bookedDates: row.bookedDates,
      targetCapacity: row.targetCapacity,
      bookedOnDate: row.bookedOnDate,
      travelDaysBlocked: row.travelDaysBlocked,
      chargeStandard: row.chargeStandard,
      clientBudget: row.clientBudget,
    },
    config,
  );
  if (!result.ok) {
    return {
      id: row.id,
      label: row.label,
      outcome: row.outcome,
      actual: row.quotedPrice,
      model: null,
      floor: null,
      delta: null,
      detail: result.error,
    };
  }
  const model = result.quote.suggestedQuote;
  const delta = row.quotedPrice - model;
  return {
    id: row.id,
    label: row.label,
    outcome: row.outcome,
    actual: row.quotedPrice,
    model,
    floor: result.quote.floor,
    delta,
    detail:
      delta === 0
        ? "The sent price matches what the current model would suggest."
        : delta < 0
          ? `Sent ${formatGap(delta)} versus the current model. The sent price is unchanged.`
          : `Sent ${formatGap(delta)} versus the current model. The sent price is unchanged.`,
  };
}

function sum(lines: BacktestLine[], key: "actual" | "model"): number {
  return lines.reduce((total, line) => total + (line[key] ?? 0), 0);
}

function formatGap(delta: number): string {
  const sign = delta > 0 ? "+" : "−";
  return `${sign}$${Math.abs(delta).toLocaleString("en-US")}`;
}
