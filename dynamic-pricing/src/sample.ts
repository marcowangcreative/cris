import type { BookingRecord } from "./records";

function sample(
  record: Omit<BookingRecord, "sample" | "snapshot" | "approvedAt" | "modelQuote" | "chargeStandard" | "clientBudget" | "manualPrice" | "discountAvoided"> & {
    approvedAt: string;
    modelQuote?: number;
    chargeStandard?: boolean;
    clientBudget?: number | null;
    manualPrice?: number | null;
    discountAvoided?: number;
  },
): BookingRecord {
  const modelQuote = record.modelQuote ?? record.quotedPrice;
  return {
    ...record,
    modelQuote,
    chargeStandard: record.chargeStandard ?? false,
    clientBudget: record.clientBudget ?? null,
    manualPrice: record.manualPrice ?? null,
    discountAvoided: record.discountAvoided ?? Math.max(0, record.quotedPrice - modelQuote),
    sample: true,
    snapshot: {
      suggestedQuote: record.quotedPrice,
      minimumAcceptable: record.quotedPrice,
      unroundedQuote: record.quotedPrice,
      adjustmentAfterCorridor: 0,
      confidenceScore: 0,
      confidenceLevel: "low",
      confidenceSummary: "Sample row for the demo. It is excluded from the pricing model.",
      explanations: [
        {
          id: "sample",
          label: "Sample",
          percent: 0,
          explanation:
            "Invented so the log is not empty on a first visit. Sample rows never move a new quote. Remove them before you judge the model.",
        },
      ],
    },
  };
}

/** Clearly fake inquiries so the log and the demo are not blank. */
export function createSampleHistory(): BookingRecord[] {
  return [
    sample({
      id: "sample-elena-james",
      couple: "Elena & James (sample)",
      eventDate: "2025-10-18",
      inquiryDate: "2024-11-02",
      marketId: "houston",
      packageId: "signature",
      packageName: "Signature",
      packagePrice: 10800,
      quotedPrice: 11800,
      outcome: "booked",
      notes: "SAMPLE — not a real client. Peak Saturday, closed near the old flat rate.",
      travelDaysBlocked: 1,
      qualifiedInquiries: 2,
      bookedDates: 4,
      targetCapacity: 5,
      approvedAt: "2024-11-02T18:00:00.000Z",
    }),
    sample({
      id: "sample-priya-noah",
      couple: "Priya & Noah (sample)",
      eventDate: "2026-04-11",
      inquiryDate: "2025-06-20",
      marketId: "houston",
      packageId: "signature",
      packageName: "Signature",
      packagePrice: 10800,
      quotedPrice: 11500,
      outcome: "booked",
      notes: "SAMPLE — spring Saturday. Invented booking.",
      travelDaysBlocked: 1,
      qualifiedInquiries: 1,
      bookedDates: 3,
      targetCapacity: 5,
      approvedAt: "2025-06-20T18:00:00.000Z",
    }),
    sample({
      id: "sample-camila-andre",
      couple: "Camila & Andre (sample)",
      eventDate: "2026-08-08",
      inquiryDate: "2026-06-01",
      marketId: "houston",
      packageId: "signature",
      packageName: "Signature",
      packagePrice: 10800,
      quotedPrice: 9200,
      outcome: "lost",
      notes: "SAMPLE — August weekday. They booked a less expensive photographer.",
      travelDaysBlocked: 1,
      qualifiedInquiries: 1,
      bookedDates: 0,
      targetCapacity: 4,
      approvedAt: "2026-06-01T18:00:00.000Z",
    }),
    sample({
      id: "sample-harper-luis",
      couple: "Harper & Luis (sample)",
      eventDate: "2027-06-05",
      inquiryDate: "2026-09-12",
      marketId: "houston",
      packageId: "classic",
      packageName: "Classic",
      packagePrice: 7200,
      quotedPrice: 7400,
      outcome: "pending",
      notes: "SAMPLE — open inquiry, not a real couple.",
      travelDaysBlocked: 1,
      qualifiedInquiries: 1,
      bookedDates: 2,
      targetCapacity: 4,
      approvedAt: "2026-09-12T18:00:00.000Z",
    }),
    sample({
      id: "sample-mina-chris",
      couple: "Mina & Chris (sample)",
      eventDate: "2026-01-17",
      inquiryDate: "2025-04-02",
      marketId: "aspen",
      packageId: "atelier",
      packageName: "Atelier",
      packagePrice: 13500,
      quotedPrice: 15200,
      outcome: "booked",
      notes: "SAMPLE — destination weekend. Three calendar days blocked, including travel.",
      travelDaysBlocked: 3,
      qualifiedInquiries: 1,
      bookedDates: 1,
      targetCapacity: 3,
      approvedAt: "2025-04-02T18:00:00.000Z",
    }),
    sample({
      id: "sample-august-standard",
      couple: "Riley & Sam (sample)",
      eventDate: "2026-08-15",
      inquiryDate: "2026-02-10",
      marketId: "houston",
      packageId: "signature",
      packageName: "Signature",
      packagePrice: 10800,
      quotedPrice: 10800,
      outcome: "booked",
      notes: "SAMPLE — August couple could pay the standard rate. The seasonal discount was not given.",
      travelDaysBlocked: 1,
      qualifiedInquiries: 1,
      bookedDates: 1,
      targetCapacity: 4,
      approvedAt: "2026-02-10T18:00:00.000Z",
      modelQuote: 9350,
      clientBudget: 14000,
      chargeStandard: true,
      discountAvoided: 1450,
    }),
  ];
}
