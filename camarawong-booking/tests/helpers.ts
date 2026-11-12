import { DocumentStore } from "@/lib/store/document";
import { emptyDatabase, MemoryPersistence } from "@/lib/store/persistence";
import type { Intake, Settings } from "@/lib/types";

export const NOW = new Date("2026-11-12T16:00:00.000Z");

export function testStore(settings?: Partial<Settings>) {
  const db = emptyDatabase();
  if (settings) db.settings = { ...db.settings, ...settings };
  return new DocumentStore(new MemoryPersistence(db));
}

export function sampleIntake(overrides: Partial<Intake> = {}): Intake {
  return {
    clientName: "Jordan Blake",
    clientEmail: "jordan@example.com",
    eventName: "Northshore Capital Dinner",
    venueAddress: "Sample Venue, 1200 Smith Street, Houston, TX 77002",
    guestHeadcount: 120,
    loadInNotes: "Service elevator. Load in one hour prior.",
    onSiteContactName: "Jordan Blake",
    onSiteContactPhone: "(713) 555-0148",
    galleryEmail: "gallery@example.com",
    ...overrides,
  };
}

export const openSettings = { maxEventsPerDate: 1, blockedDates: [] as string[] };
