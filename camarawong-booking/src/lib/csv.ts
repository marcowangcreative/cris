import { sortBookings } from "@/lib/format";
import { displayStatus } from "@/lib/status";
import type { Booking } from "@/lib/types";

const COLUMNS = [
  "id",
  "status",
  "package",
  "date",
  "start",
  "duration_minutes",
  "event",
  "venue",
  "guests",
  "onsite_contact",
  "onsite_phone",
  "gallery_email",
  "client",
  "client_email",
  "load_in",
  "total_cents",
  "due_now_cents",
  "balance_cents",
  "payment_status",
  "payment_provider",
  "paid_at",
  "signer",
  "signed_at",
  "created_at",
] as const;

function cell(value: string | number | undefined): string {
  const text = value == null ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function bookingsToCsv(bookings: Booking[], now = new Date()): string {
  const lines = [COLUMNS.join(",")];
  for (const booking of sortBookings(bookings)) {
    const intake = booking.intake;
    const row = [
      booking.id,
      displayStatus(booking, now),
      booking.quote.packageName,
      booking.date,
      booking.startTime,
      booking.quote.durationMinutes,
      intake?.eventName,
      intake?.venueAddress,
      intake?.guestHeadcount,
      intake?.onSiteContactName,
      intake?.onSiteContactPhone,
      intake?.galleryEmail,
      intake?.clientName,
      intake?.clientEmail,
      intake?.loadInNotes,
      booking.quote.totalCents,
      booking.quote.dueNowCents,
      booking.quote.balanceDueCents,
      booking.payment.status,
      booking.payment.provider ?? "",
      booking.payment.paidAt ?? "",
      booking.contract?.signerName,
      booking.contract?.signedAt,
      booking.createdAt,
    ];
    lines.push(row.map((value) => cell(value)).join(","));
  }
  return `${lines.join("\n")}\n`;
}
