import { studio } from "@/lib/config";
import { formatDuration, formatLongDate, formatMoney, formatTimeRange, formatTimestamp } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { venueNoteLines } from "@/lib/venue";

export function renderContract(
  booking: Booking,
  signature?: { name: string; signedAt: string },
): string {
  const intake = booking.intake;
  if (!intake) throw new Error("Event details are required before the agreement can be rendered.");

  const lines = booking.quote.lineItems.map(
    (item) => `${item.label}  ${formatMoney(item.amountCents)}${item.placeholder ? "  (placeholder price)" : ""}`,
  );
  const includes = booking.quote.lineItems
    .filter((item) => item.id !== booking.packageId)
    .map((item) => item.label);
  const pkg = studio.packages.find((item) => item.id === booking.packageId);
  const included = pkg?.includes ?? [];
  const balance =
    booking.quote.balanceDueCents > 0
      ? `${formatMoney(booking.quote.balanceDueCents)} is due seven days before the event. This checkout collects the deposit only.`
      : "No balance. This collection is paid in full today.";
  const dueLabel =
    booking.quote.paymentMode === "full"
      ? "Paid in full today"
      : `${booking.quote.depositPercent}% deposit due today`;

  const body = [
    studio.legalName.toUpperCase(),
    "On-site portrait station agreement",
    `Version ${studio.contractVersion}`,
    "",
    `This agreement is between ${studio.legalName} ("Studio") and ${intake.clientName} ("Client").`,
    "",
    "Event",
    intake.eventName,
    formatLongDate(booking.date),
    `${formatTimeRange(booking.startTime, booking.quote.durationMinutes)} (${studio.timezone})`,
    formatDuration(booking.quote.durationMinutes),
    intake.venueAddress,
    "",
    "Collection",
    booking.quote.packageName,
    ...included.map((item) => `• ${item}`),
    includes.length ? `Add-ons: ${includes.join(", ")}` : "Add-ons: none",
    "",
    "Investment",
    ...lines,
    `Total  ${formatMoney(booking.quote.totalCents)}`,
    `Due today  ${formatMoney(booking.quote.dueNowCents)} — ${dueLabel}`,
    balance,
    "",
    "Gallery",
    "Guests view the gallery on the iPad and get photos by text or email, with share multiple.",
    `The gallery link also goes to ${intake.galleryEmail}.`,
    "",
    "What we need from the venue",
    ...venueNoteLines(intake),
    "Ceiling height, outlet distance, and the load-in window are notes for the crew.",
    "",
    "On-site contact",
    `${intake.onSiteContactName} · ${intake.onSiteContactPhone}`,
    "Load-in and parking",
    intake.loadInNotes || "None given.",
    "Expected guests",
    String(intake.guestHeadcount),
    "",
    "Terms",
    "1. The Studio brings a photographer, lighting, and the portrait setup described above, and delivers the digital gallery to the email in this agreement.",
    "2. The Client provides a safe space, power, and access at the start time, and has named the on-site contact above.",
    "3. The date is reserved only when this agreement is signed and today's amount is paid. An inquiry alone does not hold the date.",
    "4. The Client may move the date once, at least 14 days ahead, if the Studio has another opening. If the Client cancels within 14 days of the event, the amount paid today is kept.",
    "5. Time lost to venue access or the event running late is not added back onto the reserved duration.",
    "6. The Studio keeps the copyright. The Client and guests may share the images for personal use.",
    "7. Typing a name below is the Client's electronic signature.",
    "",
    "This is a working template for the booking flow. Have counsel review it before relying on it.",
  ];

  if (signature) {
    body.push(
      "",
      `Signed electronically by ${signature.name}`,
      `${formatTimestamp(signature.signedAt)} (${studio.timezone})`,
      signature.signedAt,
    );
  }

  return body.join("\n");
}
