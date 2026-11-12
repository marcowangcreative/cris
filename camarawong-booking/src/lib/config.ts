import type { PackageDefinition, Weekday } from "@/lib/types";

/**
 * Single source of truth for what a client can book.
 *
 * Money is integer cents. The corporate station price and the extra-hour
 * add-on are PLACEHOLDERS until Marco confirms them — leave
 * `priceIsPlaceholder: true` on those rows until the number is final.
 * `depositPercent` applies only to packages whose paymentMode is "deposit".
 * Packages with paymentMode "full" are charged in full at checkout.
 *
 * Custom coverage on camarawong.com describes the session, not a clock time.
 * Four hours is the bookable assumption. Change `durationMinutes` here.
 */
export const studio = {
  brandName: "Camara Wong",
  legalName: "Camara Wong",
  photographer: "Marco Wang",
  city: "Houston",
  region: "Texas",
  timezone: "America/Chicago",
  siteUrl: "https://www.camarawong.com",
  contactEmail: "studio@camarawong.com",
  currency: "usd" as const,
  depositPercent: 50,
  holdMinutes: 20,
  paymentWindowHours: 24,
  leadDays: 2,
  horizonDays: 150,
  closedWeekdays: ["Monday"] as Weekday[],
  startTimes: ["11:00", "14:00", "16:00", "18:00"],
  defaultMaxEventsPerDate: 1,
  contractVersion: "2026-11-12",
  packages: [
    {
      id: "corporate",
      name: "Corporate Portrait Station",
      summary:
        "Ninety minutes. Digital portraits only. The self-serve station for a team that already knows it wants the studio in the room.",
      priceCents: 150_000,
      priceIsPlaceholder: true,
      durationMinutes: 90,
      paymentMode: "full",
      bookLabel: "Book this station",
      inquireLabel: "Ask a question",
      includes: [
        "Studio lighting and a signature backdrop",
        "A photographer guiding guests",
        "Digital files only, no on-site printer",
        "QR gallery sent to the email on the booking",
      ],
      addons: [
        {
          id: "extra-hour",
          name: "Extra hour",
          description: "Keeps the station up for another hour after the ninety minutes.",
          priceCents: 100_000,
          priceIsPlaceholder: true,
          additionalMinutes: 60,
          maxQuantity: 2,
        },
      ],
    },
    {
      id: "digital",
      name: "Digital",
      summary: "Two hours on site. Every frame in high resolution, with the gallery the next day.",
      priceCents: 300_000,
      priceIsPlaceholder: false,
      durationMinutes: 120,
      paymentMode: "deposit",
      bookLabel: "Book this collection",
      inquireLabel: "Talk to us first",
      includes: [
        "24-hour QR code delivery",
        "Online viewing link",
        "All high-resolution images",
      ],
      addons: [],
    },
    {
      id: "printed",
      name: "Printed",
      summary: "Three hours, with 4×6 prints made on site while the party is still going.",
      priceCents: 600_000,
      priceIsPlaceholder: false,
      durationMinutes: 180,
      paymentMode: "deposit",
      bookLabel: "Book this collection",
      inquireLabel: "Talk to us first",
      includes: [
        "On-site 4×6 printing",
        "24-hour QR code delivery",
        "Online viewing link",
        "All high-resolution images",
      ],
      addons: [],
    },
    {
      id: "custom",
      name: "Custom",
      summary:
        "Marco on the camera, a queued list, and a private sitting for every guest who wants one. 8×10 prints on site.",
      priceCents: 900_000,
      priceIsPlaceholder: false,
      durationMinutes: 240,
      paymentMode: "deposit",
      bookLabel: "Book this collection",
      inquireLabel: "Talk to us first",
      includes: [
        "Principal photographer",
        "A queued guest list, with a turn for each group",
        "On-site 8×10 printing",
        "Online viewing link",
        "All high-resolution images",
      ],
      addons: [],
    },
  ] satisfies PackageDefinition[],
};

export function getPackage(id: string) {
  return studio.packages.find((item) => item.id === id) ?? null;
}
