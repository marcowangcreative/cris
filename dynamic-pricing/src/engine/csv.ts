import { parseISODate } from "./dates";
import type { Outcome } from "./types";

export interface CsvBooking {
  eventDate: string;
  inquiryDate: string;
  packageName: string;
  quotedPrice: number;
  outcome: Outcome;
  notes: string;
  market?: string;
  couple?: string;
  travelDaysBlocked?: number;
  qualifiedInquiries?: number;
  bookedDates?: number;
  targetCapacity?: number;
  clientBudget?: number;
  chargeStandard?: boolean;
  manualPrice?: number;
  /** Demand-model quote before a standard-rate hold, kept for a backtest. */
  modelQuote?: number;
}

export interface CsvError {
  line: number;
  message: string;
}

export const CSV_COLUMNS = [
  "event_date",
  "inquiry_date",
  "package",
  "quoted_price",
  "outcome",
  "notes",
  "market",
  "couple",
  "travel_days",
  "inquiries",
  "booked_dates",
  "target_capacity",
  "client_budget",
  "charge_standard",
  "manual_price",
  "model_quote",
] as const;

const REQUIRED = ["event_date", "inquiry_date", "package", "quoted_price", "outcome", "notes"] as const;

/**
 * Column format for Marco's booking history.
 *
 * Required, in this order:
 * event_date, inquiry_date, package, quoted_price, outcome, notes
 *
 * Dates are YYYY-MM-DD. package is a package name (or a price that matches
 * one in settings). quoted_price is a dollar amount, with or without $ and
 * commas. outcome is booked, lost, or pending.
 *
 * Optional columns, after the required ones:
 * market, couple, travel_days, inquiries, booked_dates, target_capacity,
 * client_budget, charge_standard, manual_price, model_quote
 *
 * charge_standard is yes or no. model_quote is the demand-model price before
 * a standard-rate hold, so a backtest can see what the hold kept.
 */
export function csvFormatDescription(): string {
  return [
    "Required columns: event_date, inquiry_date, package, quoted_price, outcome, notes.",
    "Dates use YYYY-MM-DD. outcome is booked, lost, or pending.",
    "quoted_price can include $ and commas.",
    "Optional columns: market, couple, travel_days, inquiries, booked_dates, target_capacity, client_budget, charge_standard, manual_price, model_quote.",
    "charge_standard is yes or no. model_quote is the price before a standard-rate hold.",
  ].join(" ");
}

export function toCsv(records: CsvBooking[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const record of records) {
    lines.push(
      [
        record.eventDate,
        record.inquiryDate,
        record.packageName,
        record.quotedPrice,
        record.outcome,
        record.notes,
        record.market ?? "",
        record.couple ?? "",
        record.travelDaysBlocked ?? "",
        record.qualifiedInquiries ?? "",
        record.bookedDates ?? "",
        record.targetCapacity ?? "",
        record.clientBudget ?? "",
        record.chargeStandard === undefined ? "" : record.chargeStandard ? "yes" : "no",
        record.manualPrice ?? "",
        record.modelQuote ?? "",
      ]
        .map(escapeCell)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function csvTemplate(): string {
  return toCsv([
    {
      eventDate: "2027-10-16",
      inquiryDate: "2026-11-12",
      packageName: "Signature",
      quotedPrice: 12400,
      outcome: "pending",
      notes: "EXAMPLE ROW — delete before importing real bookings",
      market: "Houston",
      couple: "Example Couple",
      travelDaysBlocked: 1,
      qualifiedInquiries: 1,
      bookedDates: 3,
      targetCapacity: 5,
    },
  ]);
}

export function parseCsv(text: string): { records: CsvBooking[]; errors: CsvError[] } {
  const rows = parseRows(text.replace(/^\uFEFF/, ""));
  if (rows.length === 0) {
    return { records: [], errors: [{ line: 1, message: "The file is empty." }] };
  }
  const header = rows[0].map(normalizeHeader);
  const missing = REQUIRED.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    return {
      records: [],
      errors: [
        {
          line: 1,
          message: `Missing ${missing.length === 1 ? "column" : "columns"}: ${missing.join(", ")}.`,
        },
      ],
    };
  }
  const indexOf = (name: string) => header.indexOf(name);
  const records: CsvBooking[] = [];
  const errors: CsvError[] = [];

  rows.slice(1).forEach((row, index) => {
    const line = index + 2;
    const cell = (name: string) => (row[indexOf(name)] ?? "").trim();
    const eventDate = cell("event_date");
    const inquiryDate = cell("inquiry_date");
    const packageName = cell("package");
    const outcome = parseOutcome(cell("outcome"));
    const quoted = parsePrice(cell("quoted_price"));
    const rowErrors: string[] = [];
    if (!parseISODate(eventDate)) rowErrors.push("event_date must be YYYY-MM-DD");
    if (!parseISODate(inquiryDate)) rowErrors.push("inquiry_date must be YYYY-MM-DD");
    if (!packageName) rowErrors.push("package is empty");
    if (quoted === null) rowErrors.push("quoted_price must be a dollar amount that is zero or greater");
    if (!outcome) rowErrors.push("outcome must be booked, lost, or pending");
    if (rowErrors.length > 0) {
      errors.push({ line, message: rowErrors.join("; ") + "." });
      return;
    }
    const record: CsvBooking = {
      eventDate,
      inquiryDate,
      packageName,
      quotedPrice: quoted as number,
      outcome: outcome as Outcome,
      notes: cell("notes"),
    };
    const market = optionalText(cell("market"));
    const couple = optionalText(cell("couple"));
    if (market) record.market = market;
    if (couple) record.couple = couple;
    assignOptionalNumber(record, "travelDaysBlocked", "travel_days", cell("travel_days"), line, errors);
    assignOptionalNumber(record, "qualifiedInquiries", "inquiries", cell("inquiries"), line, errors);
    assignOptionalNumber(record, "bookedDates", "booked_dates", cell("booked_dates"), line, errors);
    assignOptionalNumber(record, "targetCapacity", "target_capacity", cell("target_capacity"), line, errors);
    assignOptionalNumber(record, "clientBudget", "client_budget", cell("client_budget"), line, errors);
    assignOptionalNumber(record, "manualPrice", "manual_price", cell("manual_price"), line, errors);
    assignOptionalNumber(record, "modelQuote", "model_quote", cell("model_quote"), line, errors);
    const flag = cell("charge_standard");
    if (flag) {
      const normalized = flag.toLowerCase();
      if (["yes", "true", "1", "y"].includes(normalized)) record.chargeStandard = true;
      else if (["no", "false", "0", "n"].includes(normalized)) record.chargeStandard = false;
      else errors.push({ line, message: "charge_standard must be yes or no." });
    }
    if (!errors.some((error) => error.line === line)) records.push(record);
  });

  return { records, errors };
}

function assignOptionalNumber(
  record: CsvBooking,
  key: "travelDaysBlocked" | "qualifiedInquiries" | "bookedDates" | "targetCapacity" | "clientBudget" | "manualPrice" | "modelQuote",
  label: string,
  raw: string,
  line: number,
  errors: CsvError[],
) {
  if (!raw) return;
  const value = Number(raw.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(value) || value < 0) {
    errors.push({ line, message: `${label} must be a number that is zero or greater.` });
    return;
  }
  record[key] = value;
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseOutcome(value: string): Outcome | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "booked" || normalized === "lost" || normalized === "pending") return normalized;
  return null;
}

function parsePrice(value: string): number | null {
  const cleaned = value.trim().replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function escapeCell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }
  return rows;
}
