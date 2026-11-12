import { studio } from "@/lib/config";
import type { Booking } from "@/lib/types";

export function formatMoney(cents: number): string {
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(cents / 100);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (mins) parts.push(`${mins} ${mins === 1 ? "minute" : "minutes"}`);
  return parts.join(" ") || "0 minutes";
}

export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export function formatTime(hhmm: string): string {
  const [hourValue, minute] = hhmm.split(":").map(Number);
  const suffix = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange(hhmm: string, durationMinutes: number): string {
  const [hourValue, minute] = hhmm.split(":").map(Number);
  const start = hourValue * 60 + minute;
  const end = start + durationMinutes;
  const endHour = Math.floor(end / 60) % 24;
  const endMinute = end % 60;
  return `${formatTime(hhmm)} – ${formatTime(`${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`)}`;
}

export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: studio.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function sortBookings<T extends { date: string; startTime: string }>(bookings: T[]): T[] {
  return bookings.slice().sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export function paymentSummary(booking: Booking): string {
  if (booking.payment.status !== "paid") return "Unpaid";
  const amount = formatMoney(booking.payment.amountCents);
  if (booking.quote.balanceDueCents > 0) return `Deposit paid ${amount}`;
  return `Paid in full ${amount}`;
}
