import { studio } from "@/lib/config";
import { venueNoteLines } from "@/lib/venue";
import { formatLongDate, formatMoney, formatTimeRange, paymentSummary } from "@/lib/format";
import type { Booking, Inquiry } from "@/lib/types";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type Mailer = (message: EmailMessage) => Promise<void>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function htmlFromText(text: string): string {
  return `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#161311">${escapeHtml(text)
    .split("\n")
    .map((line) => (line ? `<p style="margin:0 0 12px">${line}</p>` : "<br>"))
    .join("")}</div>`;
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function studioInbox(): string {
  return process.env.STUDIO_INBOX || studio.contactEmail;
}

export async function deliverEmail(message: EmailMessage): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[camarawong email:demo]\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
    return;
  }

  const from = process.env.RESEND_FROM || "Camara Wong <bookings@camarawong.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed (${response.status}): ${body}`);
  }
}

function uniqueRecipients(addresses: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const address of addresses) {
    const key = address.toLowerCase();
    if (!address || seen.has(key)) continue;
    seen.add(key);
    result.push(address);
  }
  return result;
}

function eventBlock(booking: Booking): string[] {
  const intake = booking.intake;
  return [
    intake?.eventName ?? booking.quote.packageName,
    formatLongDate(booking.date),
    formatTimeRange(booking.startTime, booking.quote.durationMinutes),
    intake?.venueAddress ?? "Houston",
    `${booking.quote.packageName} · ${paymentSummary(booking)}`,
    booking.quote.balanceDueCents > 0
      ? `Balance still due before the event: ${formatMoney(booking.quote.balanceDueCents)}`
      : "Nothing further is due.",
  ];
}

export function confirmationMessages(booking: Booking): EmailMessage[] {
  if (!booking.intake) return [];
  const calendar = `${appBaseUrl()}/api/bookings/${booking.id}/calendar`;
  const text = [
    `${booking.intake.clientName.split(" ")[0]},`,
    "",
    "The portrait station is reserved.",
    "",
    ...eventBlock(booking),
    "",
    "Guests view the gallery on the iPad and get photos by text or email, with share multiple.",
    `The gallery link also goes to ${booking.intake.galleryEmail}.`,
    `On-site contact: ${booking.intake.onSiteContactName}, ${booking.intake.onSiteContactPhone}.`,
    booking.intake.loadInNotes ? `Load-in: ${booking.intake.loadInNotes}` : "",
    ...venueNoteLines(booking.intake),
    "",
    "A reminder goes out seven days before, and again the day before.",
    "",
    `Add it to a calendar: ${calendar}`,
    "",
    studio.brandName,
    studio.city,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const subject = `You're booked · ${booking.intake.eventName}`;
  return uniqueRecipients([booking.intake.clientEmail, studioInbox()]).map((to) => ({
    to,
    subject,
    text,
    html: htmlFromText(text),
  }));
}

export function reminderMessage(booking: Booking, kind: "seven" | "one"): EmailMessage[] {
  if (!booking.intake) return [];
  const when = kind === "seven" ? "One week" : "Tomorrow";
  const subject =
    kind === "seven"
      ? `One week until ${booking.intake.eventName}`
      : `Tomorrow · ${booking.intake.eventName}`;
  const text = [
    `${booking.intake.clientName.split(" ")[0]},`,
    "",
    `${when}, the ${studio.brandName} portrait station is on site for ${booking.intake.eventName}.`,
    "",
    ...eventBlock(booking),
    "",
    `On-site contact: ${booking.intake.onSiteContactName}, ${booking.intake.onSiteContactPhone}.`,
    booking.intake.loadInNotes ? `Load-in: ${booking.intake.loadInNotes}` : "Load-in notes: none on file.",
    booking.intake.setupWindow ? `Setup window: ${booking.intake.setupWindow}` : "",
    "",
    "Reply to this note if the venue or the start time changed.",
    "",
    studio.brandName,
  ].join("\n");

  return uniqueRecipients([booking.intake.clientEmail, studioInbox()]).map((to) => ({
    to,
    subject,
    text,
    html: htmlFromText(text),
  }));
}

export function inquiryMessage(inquiry: Inquiry): EmailMessage {
  const text = [
    "New inquiry",
    "",
    `${inquiry.firstName} ${inquiry.lastName}`,
    inquiry.email,
    inquiry.phone || "No phone",
    inquiry.packageName,
    inquiry.eventDate || "Date not set",
    inquiry.venue || "Venue not set",
    "",
    inquiry.message,
  ].join("\n");
  return {
    to: studioInbox(),
    subject: `Inquiry · ${inquiry.packageName} · ${inquiry.firstName} ${inquiry.lastName}`,
    text,
    html: htmlFromText(text),
  };
}

export async function sendConfirmation(booking: Booking, mailer: Mailer = deliverEmail): Promise<void> {
  for (const message of confirmationMessages(booking)) await mailer(message);
}

export async function sendReminder(
  booking: Booking,
  kind: "seven" | "one",
  mailer: Mailer = deliverEmail,
): Promise<void> {
  for (const message of reminderMessage(booking, kind)) await mailer(message);
}

export async function sendInquiry(inquiry: Inquiry, mailer: Mailer = deliverEmail): Promise<void> {
  await mailer(inquiryMessage(inquiry));
}
