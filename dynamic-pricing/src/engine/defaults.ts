import type {
  LeadBand,
  MarketDef,
  Objective,
  OfferingTier,
  PackageDef,
  PricingConfig,
  PricingWeights,
} from "./types";

const HOUSTON_INDEX = [95, 105, 120, 130, 125, 105, 65, 60, 85, 135, 130, 105];

/**
 * Illustrative curves so destination markets are not stuck on Houston's season.
 * They are starting points, not measured demand.
 */
const ASPEN_INDEX = [140, 145, 125, 70, 75, 110, 120, 115, 100, 70, 80, 150];
const CARMEL_INDEX = [70, 75, 90, 110, 120, 130, 125, 120, 140, 145, 100, 80];
const NYC_INDEX = [80, 85, 110, 130, 140, 125, 90, 85, 130, 145, 120, 100];

const DEFAULT_PACKAGES: PackageDef[] = [
  {
    id: "petite",
    name: "Petite",
    price: 4800,
    detail: "Shorter coverage",
    hours: 4,
    photographers: 1,
  },
  {
    id: "classic",
    name: "Classic",
    price: 7200,
    detail: "A smaller wedding day",
    hours: 6,
    photographers: 1,
  },
  {
    id: "signature",
    name: "Signature",
    price: 10800,
    detail: "9 hours, 2 photographers",
    hours: 9,
    photographers: 2,
  },
  {
    id: "atelier",
    name: "Atelier",
    price: 13500,
    detail: "Extended coverage",
    hours: 12,
    photographers: 2,
  },
];

const DEFAULT_MARKETS: MarketDef[] = [
  {
    id: "houston",
    name: "Houston",
    region: "Texas",
    demandIndex: HOUSTON_INDEX,
    typicalTravelDays: 1,
    note: "Starting curve from the pricing notes. October through June is the busy stretch, and July through September is softer. Illustrative, not a count of past bookings. 100 is baseline demand.",
  },
  {
    id: "aspen",
    name: "Aspen",
    region: "Colorado",
    demandIndex: ASPEN_INDEX,
    typicalTravelDays: 3,
    note: "Illustrative ski-and-summer curve, not measured Aspen demand. Replace it with your own index.",
  },
  {
    id: "carmel",
    name: "Carmel",
    region: "California",
    demandIndex: CARMEL_INDEX,
    typicalTravelDays: 3,
    note: "Illustrative coast curve, stronger in late summer and fall. Not measured demand.",
  },
  {
    id: "nyc",
    name: "New York",
    region: "New York",
    demandIndex: NYC_INDEX,
    typicalTravelDays: 2,
    note: "Illustrative spring-and-fall curve. Not measured New York demand.",
  },
];

const DEFAULT_BANDS: LeadBand[] = [
  { maxDays: 21, adjustment: -0.05, label: "Last-minute opening" },
  { maxDays: 60, adjustment: -0.03, label: "Short notice" },
  { maxDays: 120, adjustment: -0.01, label: "Inside four months" },
  { maxDays: 365, adjustment: 0, label: "Normal booking window" },
  { maxDays: 540, adjustment: 0.005, label: "Booked early" },
  { maxDays: 100000, adjustment: 0.015, label: "Far-out date" },
];

export const DEFAULT_WEIGHTS: PricingWeights = {
  seasonalityPer35Points: 0.1,
  saturday: 0.05,
  friday: 0.025,
  sunday: 0.01,
  thursday: 0,
  weekday: -0.02,
  inquiryStep: 0.025,
  inquiryCap: 0.08,
  inquiryNone: -0.02,
  utilizationNeutral: 0.6,
  utilizationFull: 0.06,
  utilizationCap: 0.08,
  travelDay: 0.06,
  leadBands: DEFAULT_BANDS,
  premiumDateDiscountDampener: 0.5,
  busyUtilization: 0.85,
  busyCalendarDiscountDampener: 0.5,
  premiumIndexThreshold: 120,
  premiumSaturdayFloorRatio: 1,
  fillDatesPremiumFloorRatio: 0.97,
  roomMaximize: 0.03,
  roomBalanced: 0.05,
  roomFill: 0.08,
  revenuePremiumScale: 1.12,
  revenueDiscountScale: 0.55,
  revenueBias: 0.02,
  fillPremiumScale: 0.75,
  fillDiscountScale: 1.2,
  fillBias: -0.02,
  historyMinSamples: 4,
  historyHighWinRate: 0.75,
  historyLowWinRate: 0.4,
  historyNudge: 0.02,
};

/** Clearly not real rates. Marco replaces these before an associate quote goes to a couple. */
const ASSOCIATE_PACKAGES: PackageDef[] = [
  {
    id: "associate-petite",
    name: "Associate petite",
    price: 3200,
    detail: "PLACEHOLDER — 4 hours, 1 associate photographer",
    hours: 4,
    photographers: 1,
  },
  {
    id: "associate-classic",
    name: "Associate classic",
    price: 4800,
    detail: "PLACEHOLDER — 6 hours, 1 associate photographer",
    hours: 6,
    photographers: 1,
  },
  {
    id: "associate-signature",
    name: "Associate signature",
    price: 6400,
    detail: "PLACEHOLDER — 8 hours, 1 associate photographer",
    hours: 8,
    photographers: 1,
  },
];

const DEFAULT_TIERS: OfferingTier[] = [
  {
    id: "marco",
    name: "Marco (lead)",
    note: "Marco shoots the wedding. One lead photographer, and only one wedding on a date.",
    placeholder: false,
    maxReduction: 0.15,
    maxPremium: 0.2,
    packages: DEFAULT_PACKAGES,
    defaultPackageId: "signature",
    dateCapacity: 1,
    monthlyCapacity: 4,
  },
  {
    id: "associate",
    name: "Associate",
    note: "PLACEHOLDER values. These are not real associate rates. Edit the packages, the corridor, and how many associates can cover one date before you quote a couple.",
    placeholder: true,
    maxReduction: 0.2,
    maxPremium: 0.15,
    packages: ASSOCIATE_PACKAGES,
    defaultPackageId: "associate-signature",
    dateCapacity: 4,
    monthlyCapacity: 16,
  },
];

const DEFAULT_CONFIG: PricingConfig = {
  version: 1,
  tiers: DEFAULT_TIERS,
  defaultTierId: "marco",
  markets: DEFAULT_MARKETS,
  homeMarketId: "houston",
  objective: "balanced",
  roundTo: 50,
  weights: DEFAULT_WEIGHTS,
};

export function findTier(config: PricingConfig, tierId?: string): OfferingTier | undefined {
  const id = tierId || config.defaultTierId;
  return config.tiers.find((tier) => tier.id === id) ?? config.tiers.find((tier) => tier.id === config.defaultTierId) ?? config.tiers[0];
}

export function createDefaultConfig(): PricingConfig {
  return structuredClone(DEFAULT_CONFIG);
}

const OBJECTIVES: Objective[] = ["maximize_revenue", "balanced", "fill_dates"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalCount(value: unknown, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = finiteNumber(value, Number.NaN, 1, max);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function sanitizePackages(value: unknown, fallback: PackageDef[]): PackageDef[] {
  if (!Array.isArray(value)) return fallback;
  const packages: PackageDef[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const price = finiteNumber(item.price, Number.NaN, 1, 1_000_000);
    const detail = typeof item.detail === "string" ? item.detail.trim() : "";
    if (!id || !name || ids.has(id) || !Number.isFinite(price)) continue;
    ids.add(id);
    packages.push({
      id,
      name,
      price,
      detail,
      hours: optionalCount(item.hours, 24),
      photographers: optionalCount(item.photographers, 10),
    });
  }
  return packages.length > 0 ? packages : fallback;
}

function sanitizeMarkets(value: unknown, fallback: MarketDef[]): MarketDef[] {
  if (!Array.isArray(value)) return fallback;
  const markets: MarketDef[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const region = typeof item.region === "string" ? item.region.trim() : "";
    const note = typeof item.note === "string" ? item.note.trim() : "";
    if (!id || !name || ids.has(id) || !Array.isArray(item.demandIndex) || item.demandIndex.length !== 12) {
      continue;
    }
    const demandIndex = item.demandIndex.map((point) => finiteNumber(point, Number.NaN, 0, 300));
    if (demandIndex.some((point) => !Number.isFinite(point))) continue;
    ids.add(id);
    markets.push({
      id,
      name,
      region,
      note,
      demandIndex,
      typicalTravelDays: Math.round(finiteNumber(item.typicalTravelDays, 1, 1, 14)),
    });
  }
  return markets.length > 0 ? markets : fallback;
}

function sanitizeBands(value: unknown, fallback: LeadBand[]): LeadBand[] {
  if (!Array.isArray(value)) return structuredClone(fallback);
  const bands: LeadBand[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const label = typeof item.label === "string" && item.label.trim() ? item.label.trim() : "Lead time";
    const maxDays = finiteNumber(item.maxDays, Number.NaN, 1, 100000);
    const adjustment = finiteNumber(item.adjustment, Number.NaN, -0.5, 0.5);
    if (!Number.isFinite(maxDays) || !Number.isFinite(adjustment)) continue;
    bands.push({ label, maxDays, adjustment });
  }
  return bands.length > 0 ? bands.sort((a, b) => a.maxDays - b.maxDays) : structuredClone(fallback);
}

function sanitizeWeights(value: unknown, fallback: PricingWeights): PricingWeights {
  const weights = structuredClone(fallback);
  if (!isRecord(value)) return weights;
  const numericKeys: (keyof PricingWeights)[] = [
    "seasonalityPer35Points",
    "saturday",
    "friday",
    "sunday",
    "thursday",
    "weekday",
    "inquiryStep",
    "inquiryCap",
    "inquiryNone",
    "utilizationNeutral",
    "utilizationFull",
    "utilizationCap",
    "travelDay",
    "premiumDateDiscountDampener",
    "busyUtilization",
    "busyCalendarDiscountDampener",
    "premiumIndexThreshold",
    "premiumSaturdayFloorRatio",
    "fillDatesPremiumFloorRatio",
    "roomMaximize",
    "roomBalanced",
    "roomFill",
    "revenuePremiumScale",
    "revenueDiscountScale",
    "revenueBias",
    "fillPremiumScale",
    "fillDiscountScale",
    "fillBias",
    "historyMinSamples",
    "historyHighWinRate",
    "historyLowWinRate",
    "historyNudge",
  ];
  for (const key of numericKeys) {
    const next = finiteNumber(value[key], Number.NaN, -2, 400);
    if (Number.isFinite(next)) {
      (weights[key] as number) = key === "historyMinSamples" || key === "premiumIndexThreshold" ? Math.round(next) : next;
    }
  }
  weights.leadBands = sanitizeBands(value.leadBands, fallback.leadBands);
  weights.utilizationNeutral = Math.min(0.95, Math.max(0.05, weights.utilizationNeutral));
  weights.historyMinSamples = Math.min(100, Math.max(1, weights.historyMinSamples));
  return weights;
}

function sanitizeTier(value: unknown, fallback: OfferingTier): OfferingTier | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!id || !name) return null;
  const packages = sanitizePackages(value.packages, fallback.packages);
  const defaultPackageId = packages.some((item) => item.id === value.defaultPackageId)
    ? String(value.defaultPackageId)
    : packages.some((item) => item.id === fallback.defaultPackageId)
      ? fallback.defaultPackageId
      : packages[0].id;
  return {
    id,
    name,
    note: typeof value.note === "string" ? value.note.trim() : fallback.note,
    placeholder: value.placeholder === true,
    maxReduction: finiteNumber(value.maxReduction, fallback.maxReduction, 0, 0.8),
    maxPremium: finiteNumber(value.maxPremium, fallback.maxPremium, 0, 1.5),
    packages,
    defaultPackageId,
    dateCapacity: Math.round(finiteNumber(value.dateCapacity, fallback.dateCapacity, 1, 30)),
    monthlyCapacity: Math.round(finiteNumber(value.monthlyCapacity, fallback.monthlyCapacity, 1, 60)),
  };
}

function sanitizeTiers(value: unknown, legacy: Record<string, unknown>, fallback: OfferingTier[]): OfferingTier[] {
  if (Array.isArray(value)) {
    const tiers: OfferingTier[] = [];
    const ids = new Set<string>();
    for (const item of value) {
      const tier = sanitizeTier(item, fallback[0]);
      if (!tier || ids.has(tier.id)) continue;
      ids.add(tier.id);
      tiers.push(tier);
    }
    if (tiers.length > 0) return tiers;
  }
  const seeded = structuredClone(fallback);
  const marco = seeded.find((tier) => tier.id === "marco") ?? seeded[0];
  if (Array.isArray(legacy.packages)) {
    marco.packages = sanitizePackages(legacy.packages, marco.packages);
    marco.maxReduction = finiteNumber(legacy.maxReduction, marco.maxReduction, 0, 0.8);
    marco.maxPremium = finiteNumber(legacy.maxPremium, marco.maxPremium, 0, 1.5);
    if (typeof legacy.defaultPackageId === "string" && marco.packages.some((item) => item.id === legacy.defaultPackageId)) {
      marco.defaultPackageId = legacy.defaultPackageId;
    }
    if (legacy.defaultTargetCapacity !== undefined) {
      marco.monthlyCapacity = Math.round(finiteNumber(legacy.defaultTargetCapacity, marco.monthlyCapacity, 1, 60));
    }
  } else if (legacy.maxPremium !== undefined || legacy.maxReduction !== undefined) {
    marco.maxReduction = finiteNumber(legacy.maxReduction, marco.maxReduction, 0, 0.8);
    marco.maxPremium = finiteNumber(legacy.maxPremium, marco.maxPremium, 0, 1.5);
  }
  return seeded;
}

export function sanitizeConfig(value: unknown): PricingConfig {
  const defaults = createDefaultConfig();
  if (!isRecord(value)) return defaults;
  const tiers = sanitizeTiers(value.tiers, value, defaults.tiers);
  const markets = sanitizeMarkets(value.markets, defaults.markets);
  const homeMarketId =
    typeof value.homeMarketId === "string" && markets.some((market) => market.id === value.homeMarketId)
      ? value.homeMarketId
      : markets.some((market) => market.id === defaults.homeMarketId)
        ? defaults.homeMarketId
        : markets[0].id;
  const defaultTierId = tiers.some((tier) => tier.id === value.defaultTierId)
    ? String(value.defaultTierId)
    : tiers.some((tier) => tier.id === defaults.defaultTierId)
      ? defaults.defaultTierId
      : tiers[0].id;
  const objective = OBJECTIVES.includes(value.objective as Objective)
    ? (value.objective as Objective)
    : defaults.objective;
  return {
    version: 1,
    tiers,
    defaultTierId,
    markets,
    homeMarketId,
    objective,
    roundTo: Math.round(finiteNumber(value.roundTo, defaults.roundTo, 1, 1000)),
    weights: sanitizeWeights(value.weights, defaults.weights),
  };
}
