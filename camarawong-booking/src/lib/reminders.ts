import { chicagoToday, daysBetween } from "@/lib/civil-date";
import { sendReminder, type Mailer } from "@/lib/email";
import { displayStatus } from "@/lib/status";
import type { Store } from "@/lib/store/types";
import type { Booking } from "@/lib/types";

export function dueReminder(booking: Booking, todayISO: string, now: Date): "seven" | "one" | null {
  if (displayStatus(booking, now) !== "paid" || !booking.intake) return null;
  const days = daysBetween(booking.date, todayISO);
  if (days === 7 && !booking.reminders.sevenDaySentAt) return "seven";
  if (days === 1 && !booking.reminders.oneDaySentAt) return "one";
  return null;
}

export async function sendDueReminders(store: Store, now = new Date(), mailer?: Mailer): Promise<string[]> {
  const todayISO = chicagoToday(now);
  const sent: string[] = [];

  for (const booking of await store.listBookings()) {
    const kind = dueReminder(booking, todayISO, now);
    if (!kind) continue;
    const stampKey = kind === "seven" ? "sevenDaySentAt" : "oneDaySentAt";
    const stampedAt = now.toISOString();
    let didClaim = false;

    const claimed = await store.updateBooking(booking.id, (current) => {
      if (dueReminder(current, todayISO, now) !== kind) return current;
      didClaim = true;
      return {
        ...current,
        updatedAt: stampedAt,
        reminders: { ...current.reminders, [stampKey]: stampedAt },
      };
    });
    if (!didClaim) continue;

    try {
      await sendReminder(claimed, kind, mailer);
      sent.push(`${claimed.id}:${kind}`);
    } catch (error) {
      console.error("[camarawong] reminder failed", error);
      await store.updateBooking(booking.id, (current) => {
        if (current.reminders[stampKey] !== stampedAt) return current;
        const reminders = { ...current.reminders };
        delete reminders[stampKey];
        return { ...current, reminders };
      });
    }
  }

  return sent;
}
