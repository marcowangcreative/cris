import type { Booking, DisplayStatus, PublicBooking } from "@/lib/types";

export function displayStatus(booking: Booking, now: Date): DisplayStatus {
  if (booking.status === "cancelled") return "cancelled";
  if (
    (booking.status === "held" || booking.status === "pending_payment") &&
    Date.parse(booking.holdExpiresAt) <= now.getTime()
  ) {
    return "expired";
  }
  return booking.status;
}

export function occupiesSlot(booking: Booking, now: Date): boolean {
  const status = displayStatus(booking, now);
  return status === "held" || status === "pending_payment" || status === "paid";
}

export function toPublic(booking: Booking, now: Date): PublicBooking {
  return { ...booking, displayStatus: displayStatus(booking, now) };
}
