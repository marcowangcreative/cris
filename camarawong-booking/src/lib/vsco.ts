import { formatDuration, formatLongDate, formatMoney, formatTimeRange, paymentSummary } from "@/lib/format";
import { displayStatus } from "@/lib/status";
import type { Booking } from "@/lib/types";

/**
 * VSCO Workspace does not have a verified public API, so the desk copies this
 * block by hand. Do not invent an integration.
 */
export function vscoWorkspaceSummary(booking: Booking, now = new Date()): string {
  const intake = booking.intake;
  return [
    "VSCO WORKSPACE — CAMARA WONG",
    `Booking: ${booking.id}`,
    `Status: ${displayStatus(booking, now)}`,
    `Collection: ${booking.quote.packageName}`,
    `When: ${formatLongDate(booking.date)} · ${formatTimeRange(booking.startTime, booking.quote.durationMinutes)} · ${formatDuration(booking.quote.durationMinutes)}`,
    `Event: ${intake?.eventName ?? "—"}`,
    `Venue: ${intake?.venueAddress ?? "—"}`,
    `Guests: ${intake?.guestHeadcount ?? "—"}`,
    `On-site: ${intake?.onSiteContactName ?? "—"} · ${intake?.onSiteContactPhone ?? "—"}`,
    `Load-in / parking: ${intake?.loadInNotes || "—"}`,
    `QR gallery email: ${intake?.galleryEmail ?? "—"}`,
    `Client: ${intake?.clientName ?? "—"} · ${intake?.clientEmail ?? "—"}`,
    `Investment: ${formatMoney(booking.quote.totalCents)}`,
    `Payment: ${paymentSummary(booking)}${booking.payment.provider ? ` · ${booking.payment.provider}` : ""}`,
    `Balance: ${formatMoney(booking.quote.balanceDueCents)}`,
    booking.contract
      ? `Signed: ${booking.contract.signerName} · ${booking.contract.signedAt}`
      : "Signed: no",
  ].join("\n");
}
