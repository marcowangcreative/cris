import { nextOpenDate } from "@/lib/civil-date";
import { applyDemoPayment } from "@/lib/payments";
import { planHold, planIntake, planSignature } from "@/lib/transitions";
import type { Database, Intake, Inquiry } from "@/lib/types";
import { studio } from "@/lib/config";

function intake(values: Intake): Intake {
  return values;
}

export function buildSeed(now: Date): Database {
  const blocked = nextOpenDate(now, 5);
  const paidDate = nextOpenDate(now, 8, [blocked]);
  const pendingDate = nextOpenDate(now, 22, [blocked, paidDate]);
  const settings = {
    maxEventsPerDate: studio.defaultMaxEventsPerDate,
    blockedDates: [blocked],
  };

  const northshore = intake({
    clientName: "Priya Shah",
    clientEmail: "priya.shah@northshore.example",
    eventName: "Northshore Capital Dinner",
    venueAddress: "Sample Venue, 1200 Smith Street, Houston, TX 77002",
    guestHeadcount: 140,
    loadInNotes: "Service elevator on the west side. Load in at 3:00 PM. Ballroom B.",
    onSiteContactName: "Priya Shah",
    onSiteContactPhone: "(713) 555-0148",
    galleryEmail: "events@northshore.example",
    venueSpace: true,
    venuePower: true,
    venueWifi: true,
    venueTable: true,
    tableSource: "venue",
    ceilingHeight: "14 ft",
    outletNotes: "Dedicated circuit on the ballroom wall.",
    setupWindow: "3:00–4:00 PM",
  });

  let paid = planHold({
    id: "seed_paid_corporate",
    now,
    packageId: "corporate",
    addons: [],
    date: paidDate,
    startTime: "16:00",
    bookings: [],
    settings,
  });
  paid = planIntake(paid, northshore, now);
  paid = planSignature(paid, northshore.clientName, true, now);
  paid = applyDemoPayment(paid, now).booking;

  const harper = intake({
    clientName: "Harper Quinn",
    clientEmail: "harper@quinn.example",
    eventName: "Harper & Ellis Welcome Party",
    venueAddress: "The garden room, River Oaks, Houston, TX",
    guestHeadcount: 90,
    loadInNotes: "Driveway holds a cargo van. Please arrive during cocktail hour.",
    onSiteContactName: "Ellis Ward",
    onSiteContactPhone: "(832) 555-0172",
    galleryEmail: "harper@quinn.example",
    venueSpace: true,
    venuePower: true,
    venueWifi: true,
    venueTable: true,
    tableSource: "studio",
    ceilingHeight: "",
    outletNotes: "Nearest outlet is across the lawn. Distance unknown.",
    setupWindow: "During cocktail hour",
  });

  let pending = planHold({
    id: "seed_pending_digital",
    now,
    packageId: "digital",
    addons: [],
    date: pendingDate,
    startTime: "18:00",
    bookings: [paid],
    settings,
  });
  pending = planIntake(pending, harper, now);
  pending = planSignature(pending, harper.clientName, true, now);

  const inquiry: Inquiry = {
    id: "seed_inquiry_printed",
    createdAt: now.toISOString(),
    packageId: "printed",
    packageName: "Printed",
    firstName: "Jonah",
    lastName: "Ellis",
    email: "jonah.ellis@example.com",
    phone: "(713) 555-0199",
    eventDate: pendingDate,
    venue: "A private house in River Oaks, Houston",
    message:
      "About 200 guests, and we want the 4×6 prints in the room. I can book online if the date is open — writing first to ask where the printer needs to sit.",
  };

  return {
    bookings: [paid, pending],
    inquiries: [inquiry],
    settings,
  };
}
