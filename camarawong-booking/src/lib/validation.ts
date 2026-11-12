import { isRealDate } from "@/lib/civil-date";
import { ValidationError } from "@/lib/errors";
import type { AddonSelection, Inquiry, Intake, TableSource } from "@/lib/types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${label} is missing.`);
  }
  return value as Record<string, unknown>;
}

export function requiredText(value: unknown, label: string, max = 160): string {
  if (typeof value !== "string") throw new ValidationError(`${label} is required.`);
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length < 2) throw new ValidationError(`${label} is required.`);
  if (text.length > max) throw new ValidationError(`${label} is too long.`);
  return text;
}

export function optionalText(value: unknown, max = 600): string {
  if (value == null) return "";
  if (typeof value !== "string") throw new ValidationError("That note is not text.");
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length > max) throw new ValidationError("That note is too long.");
  return text;
}

export function requiredEmail(value: unknown, label: string): string {
  const text = requiredText(value, label, 180).toLowerCase();
  if (!emailPattern.test(text)) throw new ValidationError(`${label} needs a valid email.`);
  return text;
}

export function requiredPhone(value: unknown): string {
  if (typeof value !== "string") throw new ValidationError("A phone number is required.");
  const text = value.trim();
  const digits = text.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    throw new ValidationError("Enter a phone number with the area code.");
  }
  return text;
}

export function parseAddons(value: unknown): AddonSelection[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new ValidationError("Add-ons must be a list.");
  return value.map((item) => {
    const record = asRecord(item, "Add-on");
    const id = requiredText(record.id, "Add-on", 40);
    const quantity = Number(record.quantity);
    if (!Number.isInteger(quantity)) throw new ValidationError("Add-on quantity is invalid.");
    return { id, quantity };
  });
}

export function parseAddonQuery(value: string | null): AddonSelection[] {
  if (!value) return [];
  return value.split(",").filter(Boolean).map((part) => {
    const [id, quantityText] = part.split(":");
    return { id, quantity: Number(quantityText || "1") };
  });
}

function requiredConfirmation(value: unknown, label: string): true {
  if (value !== true) throw new ValidationError(`Confirm ${label}.`);
  return true;
}

function parseTableSource(value: unknown): TableSource {
  if (value === "venue" || value === "studio") return value;
  throw new ValidationError("Tell us whether the venue provides the table.");
}

export function parseIntake(value: unknown): Intake {
  const record = asRecord(value, "Event details");
  const guestHeadcount = Number(record.guestHeadcount);
  if (!Number.isInteger(guestHeadcount) || guestHeadcount < 1 || guestHeadcount > 5000) {
    throw new ValidationError("Guest headcount needs to be a whole number.");
  }
  return {
    clientName: requiredText(record.clientName, "Your name", 80),
    clientEmail: requiredEmail(record.clientEmail, "Your email"),
    eventName: requiredText(record.eventName, "Event name", 120),
    venueAddress: requiredText(record.venueAddress, "Venue address", 240),
    guestHeadcount,
    loadInNotes: optionalText(record.loadInNotes, 600),
    onSiteContactName: requiredText(record.onSiteContactName, "On-site contact", 80),
    onSiteContactPhone: requiredPhone(record.onSiteContactPhone),
    galleryEmail: requiredEmail(record.galleryEmail, "Gallery email"),
    venueSpace: requiredConfirmation(record.venueSpace, "about 12×12 ft of space"),
    venuePower: requiredConfirmation(record.venuePower, "power access"),
    venueWifi: requiredConfirmation(record.venueWifi, "reliable Wi-Fi for the iPad"),
    venueTable: requiredConfirmation(record.venueTable, "a table for a laptop and an iPad"),
    tableSource: parseTableSource(record.tableSource),
    ceilingHeight: optionalText(record.ceilingHeight, 160),
    outletNotes: optionalText(record.outletNotes, 400),
    setupWindow: optionalText(record.setupWindow, 240),
  };
}

export function parseInquiry(value: unknown, packageNameFor: (id: string) => string | null): Omit<Inquiry, "id" | "createdAt"> {
  const record = asRecord(value, "Inquiry");
  const packageId = requiredText(record.packageId, "Collection", 40);
  const packageName = packageNameFor(packageId);
  if (!packageName) throw new ValidationError("Choose a collection.");
  const eventDate = typeof record.eventDate === "string" ? record.eventDate.trim() : "";
  if (eventDate && !isRealDate(eventDate)) throw new ValidationError("That event date is not valid.");
  return {
    packageId,
    packageName,
    firstName: requiredText(record.firstName, "First name", 80),
    lastName: requiredText(record.lastName, "Last name", 80),
    email: requiredEmail(record.email, "Email"),
    phone: typeof record.phone === "string" && record.phone.trim() ? requiredPhone(record.phone) : "",
    eventDate,
    venue: optionalText(record.venue, 240),
    message: requiredText(record.message, "Message", 2000),
  };
}

export function parseSettingsDate(value: unknown): string {
  if (typeof value !== "string" || !isRealDate(value)) {
    throw new ValidationError("Choose a real date.");
  }
  return value;
}
