import { sanitizeConfig, type PricingConfig } from "./engine";
import { isBookingRecord, normalizeRecord, type BookingRecord } from "./records";
import { createSampleHistory } from "./sample";

const CONFIG_KEY = "mwp.dynamicPricing.settings.v1";
const HISTORY_KEY = "mwp.dynamicPricing.history.v1";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Private mode and blocked storage still leave the session usable. */
  }
}

export function loadConfig(): PricingConfig {
  const raw = read(CONFIG_KEY);
  if (raw === null) return sanitizeConfig(undefined);
  try {
    return sanitizeConfig(JSON.parse(raw));
  } catch {
    return sanitizeConfig(undefined);
  }
}

export function saveConfig(config: PricingConfig) {
  write(CONFIG_KEY, JSON.stringify(config));
}

export function loadHistory(): BookingRecord[] {
  const raw = read(HISTORY_KEY);
  if (raw === null) return createSampleHistory();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return createSampleHistory();
    return parsed.filter(isBookingRecord).map(normalizeRecord);
  } catch {
    return createSampleHistory();
  }
}

export function saveHistory(records: BookingRecord[]) {
  write(HISTORY_KEY, JSON.stringify(records));
}
