/**
 * Pure wedding-quote model for an internal desk.
 *
 * Price starts at the package base. Season, day of week, lead time, inquiry
 * pressure, calendar utilization, destination travel days, and a small history
 * nudge are added as percentages. The objective tilts that total, the corridor
 * clamps it, and a peak Saturday is not quoted below the package base.
 *
 * A stated budget at or above the base, the "charge standard" toggle, or a
 * manual price then refuses to discount below the package base. A soft demand
 * index does not cut the price for a couple who can pay the standard rate.
 * If the demand model instead hits the corridor floor, a cheaper package is
 * suggested only as a secondary option. A stated budget under that floor never
 * lowers the quote. The desk offers smaller packages, a weekday, or an
 * off-peak date that fit the budget instead. The desk rounds to the configured
 * increment.
 *
 * This module does not read storage, the clock, or the network. Approved
 * quotes stay at the number that was recorded.
 */
import { dayName, daysBetween, formatISODate, monthName, offPeakAlternative, parseISODate, weekdayAlternative } from "./dates";
import { clamp, formatMoney, formatPercent, roundDownToIncrement, roundToIncrement, roundUpToIncrement } from "./money";
import type {
  Adjustment,
  BudgetAlternative,
  BudgetFit,
  ConfidenceLevel,
  HistorySignal,
  PackageDef,
  PricingConfig,
  PricingWeights,
  Quote,
  QuoteInput,
  QuoteResult,
  SmallerPackageOption,
} from "./types";

export interface CorridorBounds {
  floorExact: number;
  ceilingExact: number;
  floor: number;
  ceiling: number;
}

export function seasonalPercent(index: number, weights: PricingWeights): number {
  return ((index - 100) / 35) * weights.seasonalityPer35Points;
}

export function corridorBounds(base: number, config: PricingConfig): CorridorBounds {
  const floorExact = base * (1 - config.maxReduction);
  const ceilingExact = base * (1 + config.maxPremium);
  const floor = roundUpToIncrement(floorExact, config.roundTo);
  const ceiling = roundDownToIncrement(ceilingExact, config.roundTo);
  return { floorExact, ceilingExact, floor, ceiling };
}

function fail(error: string): QuoteResult {
  return { ok: false, error };
}

function whole(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

function dayPercent(dayOfWeek: number, weights: PricingWeights): number {
  if (dayOfWeek === 6) return weights.saturday;
  if (dayOfWeek === 5) return weights.friday;
  if (dayOfWeek === 0) return weights.sunday;
  if (dayOfWeek === 4) return weights.thursday;
  return weights.weekday;
}

function inquiryAdjustment(count: number, weights: PricingWeights): { percent: number; capped: boolean; raw: number } {
  if (count <= 0) return { percent: weights.inquiryNone, capped: false, raw: weights.inquiryNone };
  if (count === 1) return { percent: 0, capped: false, raw: 0 };
  const raw = (count - 1) * weights.inquiryStep;
  const cap = Math.abs(weights.inquiryCap);
  const percent = clamp(raw, -cap, cap);
  return { percent, capped: percent !== raw, raw };
}

function utilizationAdjustment(
  booked: number,
  target: number,
  weights: PricingWeights,
): { percent: number; utilization: number | null; raw: number; capped: boolean } {
  if (target <= 0) return { percent: 0, utilization: null, raw: 0, capped: false };
  const utilization = booked / target;
  const span = 1 - weights.utilizationNeutral;
  if (span <= 0.01) return { percent: 0, utilization, raw: 0, capped: false };
  const raw = (utilization - weights.utilizationNeutral) * (weights.utilizationFull / span);
  const cap = Math.abs(weights.utilizationCap);
  const percent = clamp(raw, -cap, cap);
  return { percent, utilization, raw, capped: Math.abs(percent - raw) > 1e-9 };
}

function leadAdjustment(
  days: number,
  premiumSaturday: boolean,
  utilization: number | null,
  weights: PricingWeights,
): { percent: number; label: string; base: number; dampenedForSaturday: boolean; dampenedForCalendar: boolean } {
  const bands = [...weights.leadBands].sort((a, b) => a.maxDays - b.maxDays);
  const band = bands.find((item) => days <= item.maxDays) ?? bands[bands.length - 1];
  const base = band?.adjustment ?? 0;
  let percent = base;
  let dampenedForSaturday = false;
  let dampenedForCalendar = false;
  if (percent < 0 && premiumSaturday) {
    percent *= weights.premiumDateDiscountDampener;
    dampenedForSaturday = true;
  }
  if (percent < 0 && utilization !== null && utilization >= weights.busyUtilization) {
    percent *= weights.busyCalendarDiscountDampener;
    dampenedForCalendar = true;
  }
  return { percent, label: band?.label ?? "Lead time", base, dampenedForSaturday, dampenedForCalendar };
}

function historyAdjustment(
  marketId: string,
  history: HistorySignal[] | undefined,
  weights: PricingWeights,
): { percent: number; decided: number; booked: number; winRate: number | null; samples: number } {
  const rows = history ?? [];
  const samples = rows.filter((row) => row.sample && row.marketId === marketId).length;
  const decidedRows = rows.filter(
    (row) => !row.sample && row.marketId === marketId && (row.outcome === "booked" || row.outcome === "lost"),
  );
  const booked = decidedRows.filter((row) => row.outcome === "booked").length;
  const decided = decidedRows.length;
  const winRate = decided > 0 ? booked / decided : null;
  if (decided < weights.historyMinSamples || winRate === null) {
    return { percent: 0, decided, booked, winRate, samples };
  }
  if (winRate >= weights.historyHighWinRate) {
    return { percent: Math.abs(weights.historyNudge), decided, booked, winRate, samples };
  }
  if (winRate <= weights.historyLowWinRate) {
    return { percent: -Math.abs(weights.historyNudge), decided, booked, winRate, samples };
  }
  return { percent: 0, decided, booked, winRate, samples };
}

function applyObjective(raw: number, config: PricingConfig): number {
  const weights = config.weights;
  if (config.objective === "maximize_revenue") {
    const scaled = raw >= 0 ? raw * weights.revenuePremiumScale : raw * weights.revenueDiscountScale;
    return scaled + weights.revenueBias;
  }
  if (config.objective === "fill_dates") {
    const scaled = raw >= 0 ? raw * weights.fillPremiumScale : raw * weights.fillDiscountScale;
    return scaled + weights.fillBias;
  }
  return raw;
}

function objectiveLabel(config: PricingConfig): string {
  if (config.objective === "maximize_revenue") return "Maximize revenue";
  if (config.objective === "fill_dates") return "Fill dates";
  return "Balanced";
}

function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

interface QuoteOptions {
  /** Internal. False while pricing a fallback package, so the suggestion cannot recurse. */
  packageFallback?: boolean;
  /** Internal. False while pricing a budget alternative. */
  budgetFit?: boolean;
}

export function earnedAboveModel(quotedPrice: number, modelQuote: number): number {
  if (!Number.isFinite(quotedPrice) || !Number.isFinite(modelQuote)) return 0;
  return Math.max(0, Math.round(quotedPrice - modelQuote));
}

export function quotePrice(input: QuoteInput, config: PricingConfig, options?: QuoteOptions): QuoteResult {
  const event = parseISODate(input.eventDate);
  const inquiry = parseISODate(input.inquiryDate);
  if (!event) return fail("Enter an event date as YYYY-MM-DD.");
  if (!inquiry) return fail("Enter an inquiry date as YYYY-MM-DD.");

  const market = config.markets.find((item) => item.id === input.marketId);
  if (!market) return fail("Choose a market that exists in settings.");
  if (market.demandIndex.length !== 12) return fail(`${market.name} needs a demand index for all 12 months.`);

  const selectedPackage = config.packages.find((item) => item.id === input.packageId);
  if (!selectedPackage) return fail("Choose a package that exists in settings.");
  if (!(selectedPackage.price > 0)) return fail("The package price has to be above zero.");

  const inquiries = whole(input.qualifiedInquiries);
  const booked = whole(input.bookedDates);
  const target = whole(input.targetCapacity);
  const travelDays = whole(input.travelDaysBlocked);
  if (inquiries === null || inquiries < 0) return fail("Qualified inquiries cannot be negative.");
  if (booked === null || booked < 0) return fail("Booked dates cannot be negative.");
  if (target === null || target < 0) return fail("Target capacity cannot be negative.");
  if (travelDays === null || travelDays < 1) return fail("Travel days blocked has to be at least 1.");
  if (!(config.roundTo >= 1)) return fail("The rounding increment has to be at least $1.");

  const budgetInput = optionalDollars(input.clientBudget, "Client budget");
  if (!budgetInput.ok) return fail(budgetInput.error);
  const manualInput = optionalDollars(input.manualPrice, "Manual price");
  if (!manualInput.ok) return fail(manualInput.error);
  const chargeStandard = input.chargeStandard === true;
  const clientBudget = budgetInput.amount;
  const enteredManual = manualInput.amount;

  const bounds = corridorBounds(selectedPackage.price, config);
  if (bounds.floor > bounds.ceiling) {
    return fail("The rounding increment is wider than the price corridor. Use a smaller increment in settings.");
  }

  const month = event.getMonth();
  const dayOfWeek = event.getDay();
  const days = daysBetween(inquiry, event);
  const index = market.demandIndex[month] ?? 100;
  const premiumSaturday = dayOfWeek === 6 && index >= config.weights.premiumIndexThreshold;
  const weights = config.weights;

  const season = seasonalPercent(index, weights);
  const day = dayPercent(dayOfWeek, weights);
  const utilization = utilizationAdjustment(booked, target, weights);
  const lead = leadAdjustment(days, premiumSaturday, utilization.utilization, weights);
  const inquiryPressure = inquiryAdjustment(inquiries, weights);
  const extraTravelDays = Math.max(0, travelDays - 1);
  const travel = extraTravelDays * weights.travelDay;
  const history = historyAdjustment(market.id, input.history, weights);

  const adjustments: Adjustment[] = [];
  const points = index - 100;
  const pointText =
    points === 0
      ? "exactly baseline"
      : `${Math.abs(points)} ${Math.abs(points) === 1 ? "point" : "points"} ${points > 0 ? "above" : "below"} baseline`;
  const seasonRate = `${Math.round(weights.seasonalityPer35Points * 1000) / 10}%`;
  adjustments.push({
    id: "season",
    label: `${monthName(month)} demand`,
    percent: season,
    explanation: `${monthName(month)} in ${market.name} has a demand index of ${index} (${pointText}). At ${seasonRate} per 35 index points, seasonality ${season === 0 ? "does not move the price" : `moves the quote ${formatPercent(season)}`}.`,
  });

  const dayExplanation =
    day === 0
      ? `${dayName(dayOfWeek)} does not change the price.`
      : `${dayName(dayOfWeek)} moves the quote ${formatPercent(day)}.`;
  adjustments.push({
    id: "day",
    label: dayName(dayOfWeek),
    percent: day,
    explanation: premiumSaturday
      ? `${dayExplanation} The index is ${index}, so this Saturday is treated as a protected peak date.`
      : dayExplanation,
  });

  const leadBits = [`${days < 0 ? `${Math.abs(days)} days before the inquiry` : `${days} days until the wedding`} sits in “${lead.label}”`];
  if (lead.base === 0) {
    leadBits.push("Lead time does not change the price.");
  } else if (!lead.dampenedForSaturday && !lead.dampenedForCalendar) {
    leadBits.push(`Lead time moves the quote ${formatPercent(lead.percent)}.`);
  } else {
    leadBits.push(`The starting lead-time adjustment is ${formatPercent(lead.base)}.`);
    if (lead.dampenedForSaturday) {
      leadBits.push("A peak Saturday keeps only part of a lead-time discount, because an empty peak date is still worth protecting.");
    }
    if (lead.dampenedForCalendar) {
      leadBits.push("The month is already busy, so the remaining discount is cut again.");
    }
    leadBits.push(`Lead time ends at ${formatPercent(lead.percent)}.`);
  }
  adjustments.push({
    id: "lead",
    label: "Lead time",
    percent: lead.percent,
    explanation: leadBits.join(" "),
  });

  let inquiryExplanation: string;
  if (inquiries <= 0) {
    inquiryExplanation = `No qualified inquiry is on this date yet. A speculative hold moves the quote ${formatPercent(inquiryPressure.percent)}.`;
  } else if (inquiries === 1) {
    inquiryExplanation = "One qualified inquiry, this couple. Nobody else is pressing on the date, so inquiry pressure does not change the price.";
  } else {
    const extras = inquiries - 1;
    inquiryExplanation = `${inquiries} qualified inquiries for this date. ${extras} ${extras === 1 ? "inquiry is" : "inquiries are"} beyond this couple, at ${formatPercent(weights.inquiryStep)} each.`;
    inquiryExplanation += inquiryPressure.capped
      ? ` That would be ${formatPercent(inquiryPressure.raw)}, held to the ${formatPercent(Math.abs(weights.inquiryCap))} cap.`
      : ` Inquiry pressure moves the quote ${formatPercent(inquiryPressure.percent)}.`;
  }
  adjustments.push({
    id: "inquiry",
    label: "Inquiry pressure",
    percent: inquiryPressure.percent,
    explanation: inquiryExplanation,
  });

  let utilizationExplanation: string;
  if (utilization.utilization === null) {
    utilizationExplanation = "Target capacity is 0, so calendar utilization is left out. Set a monthly target when you want a full month to raise the quote.";
  } else {
    const percentBooked = Math.round(utilization.utilization * 100);
    utilizationExplanation = `${booked} of ${target} target dates are booked (${percentBooked}%). Neutral is ${Math.round(weights.utilizationNeutral * 100)}%.`;
    if (utilization.percent === 0) {
      utilizationExplanation += " Utilization does not move the price.";
    } else if (utilization.capped) {
      utilizationExplanation += ` The raw utilization move is ${formatPercent(utilization.raw)}, held to the ${formatPercent(utilization.percent)} cap.`;
    } else {
      utilizationExplanation += ` Utilization moves the quote ${formatPercent(utilization.percent)}.`;
    }
  }
  adjustments.push({
    id: "utilization",
    label: "Calendar utilization",
    percent: utilization.percent,
    explanation: utilizationExplanation,
  });

  const travelExplanation =
    extraTravelDays === 0
      ? "One calendar day is blocked, the shoot itself. There is no destination opportunity cost."
      : `${travelDays} calendar days are blocked, ${extraTravelDays} beyond the shoot day. At ${formatPercent(weights.travelDay)} per extra day, travel moves the quote ${formatPercent(travel)}. A travel day is not priced as a full extra wedding; the premium only keeps a destination from being quoted like a one-day local job.`;
  adjustments.push({
    id: "travel",
    label: "Travel days",
    percent: travel,
    explanation: travelExplanation,
  });

  let historyExplanation: string;
  if (history.decided < weights.historyMinSamples) {
    const sampleNote = history.samples > 0 ? " Sample rows are ignored." : "";
    historyExplanation =
      history.decided === 0
        ? `No decided quotes in ${market.name} yet, so booking history does not move the price.${sampleNote}`
        : `${history.decided} decided ${history.decided === 1 ? "quote" : "quotes"} in ${market.name}. The model waits for ${weights.historyMinSamples} before history moves the price.${sampleNote}`;
  } else if (history.percent > 0) {
    historyExplanation = `${history.booked} of ${history.decided} decided quotes in ${market.name} were booked (${Math.round((history.winRate ?? 0) * 100)}%). That win rate is high, so history nudges the quote ${formatPercent(history.percent)}.`;
  } else if (history.percent < 0) {
    historyExplanation = `${history.booked} of ${history.decided} decided quotes in ${market.name} were booked (${Math.round((history.winRate ?? 0) * 100)}%). Quotes have been hard to close, so history nudges the quote ${formatPercent(history.percent)}.`;
  } else {
    historyExplanation = `${history.booked} of ${history.decided} decided quotes in ${market.name} were booked (${Math.round((history.winRate ?? 0) * 100)}%). That win rate sits in the neutral band, so history does not move the price.`;
  }
  adjustments.push({
    id: "history",
    label: "Booking history",
    percent: history.percent,
    explanation: historyExplanation,
  });

  const beforeObjective =
    season + day + lead.percent + inquiryPressure.percent + utilization.percent + travel + history.percent;
  const afterObjective = applyObjective(beforeObjective, config);
  const objectiveDelta = afterObjective - beforeObjective;
  const objectiveExplanation =
    config.objective === "balanced"
      ? "Balanced objective: the adjustments above are used as calculated, with no extra tilt toward revenue or filling the calendar."
      : config.objective === "maximize_revenue"
        ? `Maximize revenue amplifies premiums, softens discounts, and applies a ${formatPercent(weights.revenueBias)} tilt. The objective moves the combined adjustment ${formatPercent(objectiveDelta)}.`
        : `Fill dates softens premiums and allows a deeper discount, including a ${formatPercent(weights.fillBias)} tilt. The objective moves the combined adjustment ${formatPercent(objectiveDelta)}.`;
  adjustments.push({
    id: "objective",
    label: objectiveLabel(config),
    percent: objectiveDelta,
    explanation: objectiveExplanation,
  });

  const afterCorridor = clamp(afterObjective, -config.maxReduction, config.maxPremium);
  let clamped: Quote["clamped"] = "none";
  if (afterObjective > config.maxPremium + 1e-9) clamped = "ceiling";
  else if (afterObjective < -config.maxReduction - 1e-9) clamped = "floor";
  const corridorDelta = afterCorridor - afterObjective;
  const corridorExplanation =
    clamped === "none"
      ? `The combined adjustment fits inside the corridor, ${formatPercent(-config.maxReduction)} to ${formatPercent(config.maxPremium)} around the package base.`
      : clamped === "ceiling"
        ? `The combined adjustment was ${formatPercent(afterObjective)}, past the ${formatPercent(config.maxPremium)} ceiling. The quote stops at the top of the corridor.`
        : `The combined adjustment was ${formatPercent(afterObjective)}, past the ${formatPercent(-config.maxReduction)} floor. The quote stops at the bottom of the corridor.`;
  adjustments.push({
    id: "corridor",
    label: "Price corridor",
    percent: corridorDelta,
    explanation: corridorExplanation,
  });

  let unrounded = selectedPackage.price * (1 + afterCorridor);
  let premiumHeld = false;
  if (premiumSaturday) {
    const ratio =
      config.objective === "fill_dates" ? weights.fillDatesPremiumFloorRatio : weights.premiumSaturdayFloorRatio;
    const hold = Math.min(bounds.ceilingExact, Math.max(bounds.floorExact, selectedPackage.price * ratio));
    if (unrounded < hold - 0.01) {
      const holdPercent = (hold - unrounded) / selectedPackage.price;
      unrounded = hold;
      premiumHeld = true;
      adjustments.push({
        id: "premium-hold",
        label: "Peak Saturday hold",
        percent: holdPercent,
        explanation:
          config.objective === "fill_dates"
            ? `This Saturday is in a high-demand month. Fill-dates mode may soften the price, but not below ${formatPercent(ratio - 1)} from the ${formatMoney(selectedPackage.price)} base. The quote is held at ${formatMoney(hold)} before rounding.`
            : `This Saturday is in a high-demand month (index ${index}). ${objectiveLabel(config)} does not quote it below the ${formatMoney(selectedPackage.price)} package base. The quote is held there before rounding.`,
      });
    }
  }

  let modelQuote = roundToIncrement(unrounded, config.roundTo);
  modelQuote = Math.min(bounds.ceiling, Math.max(bounds.floor, modelQuote));

  const room =
    config.objective === "maximize_revenue"
      ? weights.roomMaximize
      : config.objective === "fill_dates"
        ? weights.roomFill
        : weights.roomBalanced;
  const negotiated = roundToIncrement(modelQuote * (1 - room), config.roundTo);
  let protectedFloor = bounds.floor;
  if (premiumSaturday) {
    const ratio =
      config.objective === "fill_dates" ? weights.fillDatesPremiumFloorRatio : weights.premiumSaturdayFloorRatio;
    protectedFloor = Math.max(bounds.floor, Math.min(bounds.ceiling, roundToIncrement(selectedPackage.price * ratio, config.roundTo)));
  }
  let minimum = Math.max(bounds.floor, protectedFloor, negotiated);
  if (minimum > modelQuote) minimum = modelQuote;

  const positiveOnly =
    Math.max(season, 0) +
    Math.max(day, 0) +
    Math.max(lead.percent, 0) +
    Math.max(inquiryPressure.percent, 0) +
    Math.max(utilization.percent, 0) +
    Math.max(travel, 0) +
    Math.max(history.percent, 0);
  let standardAdjustment = applyObjective(positiveOnly, config);
  if (standardAdjustment < 0) standardAdjustment = 0;
  if (standardAdjustment > config.maxPremium) standardAdjustment = config.maxPremium;
  const baseFloor = roundUpToIncrement(selectedPackage.price, config.roundTo);
  let standardQuote = roundToIncrement(selectedPackage.price * (1 + standardAdjustment), config.roundTo);
  standardQuote = Math.max(baseFloor, Math.min(bounds.ceiling, standardQuote));
  if (standardQuote < baseFloor) standardQuote = baseFloor;

  const budgetSupportsStandard = clientBudget !== null && clientBudget + 0.001 >= selectedPackage.price;
  const standardRateNote = budgetSupportsStandard
    ? "budget supports standard rate, discount not needed"
    : null;

  let suggested = modelQuote;
  let standardRateHeld = false;
  if (chargeStandard) {
    const withoutDiscounts = Math.max(modelQuote, standardQuote, baseFloor);
    if (withoutDiscounts !== modelQuote) {
      adjustments.push({
        id: "charge-standard",
        label: "Charge standard",
        percent: (withoutDiscounts - modelQuote) / selectedPackage.price,
        explanation: `Charge standard is on, so discounts are not applied. The demand index can still support a premium, and the quote stays at the ${formatMoney(baseFloor)} base or higher. The model alone would have suggested ${formatMoney(modelQuote)}.`,
      });
    } else {
      adjustments.push({
        id: "charge-standard",
        label: "Charge standard",
        percent: 0,
        explanation: `Charge standard is on. The model was already at ${formatMoney(modelQuote)}, which is at or above the ${formatMoney(baseFloor)} base, so no discount was removed.`,
      });
    }
    suggested = withoutDiscounts;
    standardRateHeld = true;
  }

  if (budgetSupportsStandard && clientBudget !== null) {
    const held = Math.max(suggested, baseFloor);
    adjustments.push({
      id: "budget",
      label: "Client budget",
      percent: (held - suggested) / selectedPackage.price,
      explanation: `The stated budget is ${formatMoney(clientBudget)}, at or above the ${formatMoney(selectedPackage.price)} ${selectedPackage.name} base. ${standardRateNote}. ${
        held > modelQuote
          ? `The seasonal discount is not applied, so the quote is ${formatMoney(held)} rather than the model’s ${formatMoney(modelQuote)}.`
          : "The model was already at or above the base, so the budget does not change the number."
      }`,
    });
    suggested = held;
    standardRateHeld = true;
  }

  if (enteredManual !== null) {
    const roundedManual = roundToIncrement(enteredManual, config.roundTo);
    const heldManual = Math.max(roundedManual, baseFloor);
    const belowBase = enteredManual + 0.001 < selectedPackage.price;
    adjustments.push({
      id: "manual-price",
      label: "Manual price",
      percent: (heldManual - suggested) / selectedPackage.price,
      explanation: belowBase
        ? `The manual price ${formatMoney(enteredManual)} is below the package base, so it is held at ${formatMoney(heldManual)}. A low-season index cannot be used to go under the standard rate.`
        : `The manual price ${formatMoney(heldManual)} replaces the model quote and stays at or above the ${formatMoney(baseFloor)} package base.`,
    });
    suggested = heldManual;
    standardRateHeld = true;
  }

  if (standardRateHeld && minimum < baseFloor) minimum = Math.min(baseFloor, suggested);
  if (minimum > suggested) minimum = suggested;
  if (suggested < bounds.floor) suggested = bounds.floor;

  const discountAvoided = earnedAboveModel(suggested, modelQuote);
  let floorExplanation = premiumHeld
    ? `The calculated quote was under the protected peak-Saturday price, so the suggestion and the minimum acceptable price are both ${formatMoney(modelQuote)}.`
    : premiumSaturday
      ? `Negotiation room on this objective is ${formatPercent(room, 0)} under the model quote, which comes to ${formatMoney(negotiated)} after rounding. A peak Saturday also stays at or above ${formatMoney(protectedFloor)}, so the minimum acceptable price is ${formatMoney(minimum)}.`
      : `Negotiation room on this objective is ${formatPercent(room, 0)} under the suggested quote. The minimum acceptable price is ${formatMoney(minimum)}, and it cannot fall through the ${formatMoney(bounds.floor)} corridor floor.`;
  if (standardRateHeld) {
    floorExplanation = `The minimum acceptable price is ${formatMoney(minimum)}. This quote is held at the standard rate or higher. The demand model alone would have suggested ${formatMoney(modelQuote)}.`;
  }

  const smallerPackage = buildSmallerPackage(input, config, options, selectedPackage, clamped);
  const budgetFit = buildBudgetFit(input, config, options, {
    budget: clientBudget,
    suggested,
    floor: bounds.floor,
    ceiling: bounds.ceiling,
    event,
    demandIndex: market.demandIndex,
  });
  if (budgetFit.status === "between") {
    adjustments.push({
      id: "budget-fit",
      label: "Budget fit",
      percent: 0,
      explanation: budgetFit.withinCorridor
        ? `The stated budget is ${formatMoney(budgetFit.budget)}, ${formatMoney(budgetFit.drop)} under the ${formatMoney(suggested)} quote. That price is inside the corridor, ${formatMoney(budgetFit.floor)} to ${formatMoney(budgetFit.ceiling)}. The suggested quote stays put.`
        : `The stated budget is ${formatMoney(budgetFit.budget)}, ${formatMoney(budgetFit.drop)} under the ${formatMoney(suggested)} quote. That price is outside the corridor, ${formatMoney(budgetFit.floor)} to ${formatMoney(budgetFit.ceiling)}. The suggested quote stays put.`,
    });
  } else if (budgetFit.status === "below_floor") {
    const listed = budgetFit.alternatives
      .map((item) => `${item.label} at ${formatMoney(item.suggestedQuote)}`)
      .join("; ");
    adjustments.push({
      id: "budget-fit",
      label: "Budget fit",
      percent: 0,
      explanation: `The stated budget is ${formatMoney(budgetFit.budget)}, below the ${formatMoney(budgetFit.floor)} floor. The quote stays at ${formatMoney(budgetFit.quotedPrice)} and is not cut to the budget.${listed ? ` Options that fit: ${listed}.` : ""}${budgetFit.gapNote ? ` ${budgetFit.gapNote}` : ""}`,
    });
  }

  const reasons = ["Seasonality and weights are testing assumptions, not a fit to past bookings"];
  let score = 46;
  if (days >= 120 && days <= 365) {
    score += 4;
    reasons.push("Lead time is in the normal 4 to 12 month window");
  } else if (days < 21) {
    score -= 8;
    reasons.push("Very short notice makes the lead-time rule less certain");
  } else if (days > 540) {
    score -= 4;
    reasons.push("The date is far out, so demand can still change");
  }
  if (history.decided >= 12) {
    score += 22;
    reasons.push(`${history.decided} decided quotes in this market support a stronger read`);
  } else if (history.decided >= weights.historyMinSamples) {
    score += 12;
    reasons.push(`${history.decided} decided quotes add a small history nudge`);
  } else {
    reasons.push(`Not enough decided quotes in ${market.name} to calibrate the model`);
  }
  if (travelDays >= 5) {
    score -= 6;
    reasons.push("A long travel block is harder to compare with a local date");
  } else if (travelDays >= 3) {
    score -= 3;
    reasons.push("Travel days add an assumption about opportunity cost");
  }
  if (clamped !== "none") {
    score -= 6;
    reasons.push("The raw price hit the corridor, so the corridor is doing the work");
  }
  if (target <= 0) {
    score -= 8;
    reasons.push("No monthly capacity target was set");
  }
  score = clamp(Math.round(score), 10, 92);
  const level = confidenceLevel(score);
  const summary =
    level === "high"
      ? "Higher confidence, and still only a decision aid. You approve every quote."
      : level === "medium"
        ? "Medium confidence. A solid starting number while the weights are still assumptions."
        : "Low confidence. Use the floor and the ceiling as bounds and lean on your own judgment.";

  const quote: Quote = {
    packageId: selectedPackage.id,
    packageName: selectedPackage.name,
    packageDetail: selectedPackage.detail,
    basePrice: selectedPackage.price,
    marketId: market.id,
    marketName: market.name,
    marketRegion: market.region,
    month,
    monthName: monthName(month),
    demandIndex: index,
    dayOfWeek,
    dayName: dayName(dayOfWeek),
    daysUntilEvent: days,
    utilization: utilization.utilization,
    travelDaysBlocked: travelDays,
    suggestedQuote: suggested,
    unroundedQuote: Math.round(unrounded * 100) / 100,
    minimumAcceptable: minimum,
    floor: bounds.floor,
    ceiling: bounds.ceiling,
    adjustmentBeforeObjective: beforeObjective,
    adjustmentAfterObjective: afterObjective,
    adjustmentAfterCorridor: afterCorridor,
    clamped,
    premiumHeld,
    adjustments,
    floorExplanation,
    confidence: { score, level, summary, reasons },
    revenuePerBlockedDay: Math.round(suggested / travelDays),
    modelQuote,
    clientBudget,
    chargeStandard,
    manualPrice: enteredManual,
    standardRateHeld,
    budgetSupportsStandard,
    standardRateNote,
    discountAvoided,
    smallerPackage,
    budgetFit,
  };

  return { ok: true, quote };
}

function optionalDollars(
  value: number | null | undefined,
  label: string,
): { ok: true; amount: number | null } | { ok: false; error: string } {
  if (value === null || value === undefined) return { ok: true, amount: null };
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, error: `${label} has to be a dollar amount.` };
  }
  if (value < 0) return { ok: false, error: `${label} cannot be negative.` };
  if (value === 0) return { ok: true, amount: null };
  return { ok: true, amount: value };
}

function buildSmallerPackage(
  input: QuoteInput,
  config: PricingConfig,
  options: QuoteOptions | undefined,
  selectedPackage: { id: string; name: string; price: number },
  clamped: Quote["clamped"],
): SmallerPackageOption | null {
  if (options?.packageFallback === false || clamped !== "floor") return null;
  const cheaper = config.packages
    .filter((item) => item.id !== selectedPackage.id && item.price < selectedPackage.price - 0.01)
    .sort((a, b) => b.price - a.price)[0];
  if (!cheaper) return null;
  const alternative = quotePrice(
    {
      ...input,
      packageId: cheaper.id,
      chargeStandard: false,
      manualPrice: null,
      clientBudget: null,
    },
    config,
    { packageFallback: false, budgetFit: false },
  );
  if (!alternative.ok) return null;
  return {
    packageId: cheaper.id,
    packageName: cheaper.name,
    basePrice: cheaper.price,
    suggestedQuote: alternative.quote.modelQuote,
    explanation: `Secondary. ${selectedPackage.name} hit its price floor, so cutting it further would cheapen the standard rate. ${cheaper.name} (${formatMoney(cheaper.price)}) is the next package down, and the demand model quotes it at ${formatMoney(alternative.quote.modelQuote)}. Use that only if this couple cannot pay the standard rate.`,
  };
}

function buildBudgetFit(
  input: QuoteInput,
  config: PricingConfig,
  options: QuoteOptions | undefined,
  context: {
    budget: number | null;
    suggested: number;
    floor: number;
    ceiling: number;
    event: Date;
    demandIndex: number[];
  },
): BudgetFit {
  if (options?.budgetFit === false || context.budget === null) return { status: "none" };
  const budget = context.budget;
  if (budget + 0.001 >= context.suggested) return { status: "covers", budget };
  if (budget + 0.001 >= context.floor) {
    return {
      status: "between",
      budget,
      drop: Math.max(0, Math.round(context.suggested - budget)),
      withinCorridor: budget <= context.ceiling + 0.001,
      floor: context.floor,
      ceiling: context.ceiling,
    };
  }

  const selected = config.packages.find((item) => item.id === input.packageId) ?? null;
  const cheaper = config.packages
    .filter((item) => item.id !== input.packageId && selected !== null && item.price < selected.price - 0.01)
    .sort((a, b) => b.price - a.price);
  const packageFits = cheaper
    .map((item) => priceAlternative(input, config, item, input.eventDate))
    .filter((item): item is BudgetAlternative => item !== null && item.suggestedQuote <= budget + 0.001)
    .sort((a, b) => b.suggestedQuote - a.suggestedQuote);

  const alternatives = [...packageFits];
  const weekday = weekdayAlternative(context.event);
  if (weekday) {
    const best = richestFit(input, config, selected, cheaper, formatISODate(weekday), budget, context.suggested);
    if (best) {
      alternatives.push({
        ...best,
        kind: "weekday",
        id: `weekday-${best.packageId}-${best.eventDate}`,
        label: `Weekday · ${best.label}`,
        explanation: `A weekday instead of the requested date. ${best.explanation}`,
      });
    }
  }
  const offPeak = offPeakAlternative(context.event, context.demandIndex);
  if (offPeak) {
    const best = richestFit(input, config, selected, cheaper, formatISODate(offPeak), budget, context.suggested);
    if (best) {
      alternatives.push({
        ...best,
        kind: "off_peak",
        id: `off-peak-${best.packageId}-${best.eventDate}`,
        label: `Off-peak · ${best.label}`,
        explanation: `An off-peak date instead of the requested month. ${best.explanation}`,
      });
    }
  }

  let gapNote: string | null = null;
  if (alternatives.length === 0) {
    const probed = [selected, ...cheaper].filter((item): item is PackageDef => item !== null);
    const quotes = probed
      .map((item) => priceAlternative(input, config, item, input.eventDate))
      .filter((item): item is BudgetAlternative => item !== null)
      .sort((a, b) => a.suggestedQuote - b.suggestedQuote);
    const lowest = quotes[0];
    gapNote = lowest
      ? `No package, weekday, or off-peak date in settings quotes at or under ${formatMoney(budget)}. The lowest quote for this request is ${lowest.packageName} at ${formatMoney(lowest.suggestedQuote)}.`
      : `No package in settings quotes at or under ${formatMoney(budget)}.`;
  }

  return {
    status: "below_floor",
    budget,
    floor: context.floor,
    quotedPrice: context.suggested,
    alternatives,
    gapNote,
  };
}

function richestFit(
  input: QuoteInput,
  config: PricingConfig,
  selected: PackageDef | null,
  cheaper: PackageDef[],
  eventDate: string,
  budget: number,
  currentSuggested: number,
): BudgetAlternative | null {
  const candidates = [selected, ...cheaper].filter((item): item is PackageDef => item !== null);
  let best: BudgetAlternative | null = null;
  for (const item of candidates) {
    const priced = priceAlternative(input, config, item, eventDate);
    if (!priced) continue;
    if (priced.suggestedQuote > budget + 0.001 || priced.suggestedQuote >= currentSuggested - 0.001) continue;
    if (!best || priced.suggestedQuote > best.suggestedQuote) best = priced;
  }
  return best;
}

function priceAlternative(
  input: QuoteInput,
  config: PricingConfig,
  item: PackageDef,
  eventDate: string,
): BudgetAlternative | null {
  const result = quotePrice(
    {
      ...input,
      packageId: item.id,
      eventDate,
      clientBudget: null,
      chargeStandard: false,
      manualPrice: null,
    },
    config,
    { packageFallback: false, budgetFit: false },
  );
  if (!result.ok) return null;
  const quote = result.quote;
  const coverage = coverageLabel(item);
  const when = `${quote.dayName}, ${quote.monthName} ${parseISODate(eventDate)?.getDate()}, ${parseISODate(eventDate)?.getFullYear()}`;
  return {
    id: `package-${item.id}-${eventDate}`,
    kind: "package",
    label: coverage ? `${item.name} · ${coverage}` : item.name,
    packageId: item.id,
    packageName: item.name,
    hours: item.hours,
    photographers: item.photographers,
    eventDate,
    dayName: quote.dayName,
    suggestedQuote: quote.suggestedQuote,
    explanation: `${item.name}${coverage ? ` (${coverage})` : ""} on ${when} quotes at ${formatMoney(quote.suggestedQuote)}.`,
  };
}

function coverageLabel(item: PackageDef): string {
  const parts: string[] = [];
  if (item.hours) parts.push(`${item.hours} hour${item.hours === 1 ? "" : "s"}`);
  if (item.photographers) parts.push(`${item.photographers} photographer${item.photographers === 1 ? "" : "s"}`);
  return parts.join(", ");
}
