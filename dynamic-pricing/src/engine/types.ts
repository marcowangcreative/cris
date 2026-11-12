export type Objective = "maximize_revenue" | "balanced" | "fill_dates";

export type Outcome = "booked" | "lost" | "pending";

export type ConfidenceLevel = "low" | "medium" | "high";

export interface PackageDef {
  id: string;
  name: string;
  /** Package price in dollars. */
  price: number;
  detail: string;
}

export interface MarketDef {
  id: string;
  name: string;
  region: string;
  /**
   * January through December. 100 is baseline demand.
   * Higher values support a stronger price.
   */
  demandIndex: number[];
  /** Calendar days a typical job in this market blocks, including travel. */
  typicalTravelDays: number;
  note: string;
}

export interface LeadBand {
  /** Inclusive upper bound on days from inquiry to event. */
  maxDays: number;
  /** Fraction. Negative is a discount. */
  adjustment: number;
  label: string;
}

export interface PricingWeights {
  /** Price fraction added when the demand index is 35 points above 100. */
  seasonalityPer35Points: number;
  saturday: number;
  friday: number;
  sunday: number;
  thursday: number;
  /** Monday, Tuesday, and Wednesday. */
  weekday: number;
  /** Added for each qualified inquiry beyond the first. */
  inquiryStep: number;
  inquiryCap: number;
  /** Applied when the date has zero qualified inquiries. */
  inquiryNone: number;
  /** Utilization rate that does not move the price. 0.6 = 60%. */
  utilizationNeutral: number;
  /** Price change when utilization moves from neutral to 100%. */
  utilizationFull: number;
  utilizationCap: number;
  /** Premium for each blocked day beyond the shoot day. */
  travelDay: number;
  leadBands: LeadBand[];
  /** Remaining share of a negative lead-time adjustment on a peak Saturday. */
  premiumDateDiscountDampener: number;
  /** Utilization at or above this also dampens a lead-time discount. */
  busyUtilization: number;
  busyCalendarDiscountDampener: number;
  /** Saturday plus an index at or above this is a protected peak date. */
  premiumIndexThreshold: number;
  /** Lowest suggested quote, as a fraction of base, for a protected Saturday. */
  premiumSaturdayFloorRatio: number;
  /** Same floor when the objective is to fill dates. */
  fillDatesPremiumFloorRatio: number;
  roomMaximize: number;
  roomBalanced: number;
  roomFill: number;
  revenuePremiumScale: number;
  revenueDiscountScale: number;
  revenueBias: number;
  fillPremiumScale: number;
  fillDiscountScale: number;
  fillBias: number;
  historyMinSamples: number;
  historyHighWinRate: number;
  historyLowWinRate: number;
  historyNudge: number;
}

export interface PricingConfig {
  version: 1;
  packages: PackageDef[];
  markets: MarketDef[];
  homeMarketId: string;
  defaultPackageId: string;
  /** 0.15 means the quote may fall to 15% below the package base. */
  maxReduction: number;
  /** 0.20 means the quote may rise to 20% above the package base. */
  maxPremium: number;
  objective: Objective;
  /** Suggested quotes and floors round to this dollar increment. */
  roundTo: number;
  defaultTargetCapacity: number;
  weights: PricingWeights;
}

export interface HistorySignal {
  marketId: string;
  outcome: Outcome;
  /** Sample rows are demo data and never move the price. */
  sample?: boolean;
}

export interface QuoteInput {
  eventDate: string;
  inquiryDate: string;
  marketId: string;
  packageId: string;
  /** Qualified inquiries for this date, including the couple being quoted. */
  qualifiedInquiries: number;
  bookedDates: number;
  targetCapacity: number;
  /** Calendar days the job blocks, including travel. 1 is a local shoot day. */
  travelDaysBlocked: number;
  history?: HistorySignal[];
  /**
   * What the couple said they can spend. When this is at or above the package
   * base, the quote is not discounted below that base.
   */
  clientBudget?: number | null;
  /**
   * Charge the standard rate. Negative adjustments, including a soft demand
   * index, cannot pull the quote below the package base. Premiums can stay.
   */
  chargeStandard?: boolean;
  /**
   * Price Marco wants to send instead of the model. It is kept at the package
   * base or higher.
   */
  manualPrice?: number | null;
}

export interface Adjustment {
  id: string;
  label: string;
  /** Signed fraction of the package base. */
  percent: number;
  explanation: string;
}

/** A cheaper package offered only when the selected one hits its floor. */
export interface SmallerPackageOption {
  packageId: string;
  packageName: string;
  basePrice: number;
  /** Demand-model quote for that package, before any standard-rate hold. */
  suggestedQuote: number;
  explanation: string;
}

export interface Quote {
  packageId: string;
  packageName: string;
  packageDetail: string;
  basePrice: number;
  marketId: string;
  marketName: string;
  marketRegion: string;
  month: number;
  monthName: string;
  demandIndex: number;
  dayOfWeek: number;
  dayName: string;
  daysUntilEvent: number;
  utilization: number | null;
  travelDaysBlocked: number;
  suggestedQuote: number;
  /** Price after the corridor and peak-Saturday hold, before increment rounding. */
  unroundedQuote: number;
  minimumAcceptable: number;
  floor: number;
  ceiling: number;
  adjustmentBeforeObjective: number;
  adjustmentAfterObjective: number;
  adjustmentAfterCorridor: number;
  clamped: "none" | "floor" | "ceiling";
  premiumHeld: boolean;
  adjustments: Adjustment[];
  floorExplanation: string;
  confidence: {
    score: number;
    level: ConfidenceLevel;
    summary: string;
    reasons: string[];
  };
  revenuePerBlockedDay: number;
  /** Rounded demand-model quote, before a standard-rate hold or manual price. */
  modelQuote: number;
  clientBudget: number | null;
  chargeStandard: boolean;
  /** What was typed, even when it was raised to the package base. */
  manualPrice: number | null;
  /** Toggle, budget, or manual price kept this quote at the base or higher. */
  standardRateHeld: boolean;
  budgetSupportsStandard: boolean;
  /**
   * Exact flag when a stated budget covers the package base.
   * Null when the budget is missing or below base.
   */
  standardRateNote: string | null;
  /** Dollars kept versus the discounted model. Zero when the quote did not rise. */
  discountAvoided: number;
  /** Secondary. Null unless the demand model hit the floor and a cheaper package exists. */
  smallerPackage: SmallerPackageOption | null;
}

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; error: string };
