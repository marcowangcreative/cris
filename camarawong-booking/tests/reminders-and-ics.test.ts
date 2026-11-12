import { describe, expect, it } from "vitest";
import { buildIcs } from "@/lib/ics";
import type { Mailer } from "@/lib/email";
import { dueReminder, sendDueReminders } from "@/lib/reminders";
import { applyDemoPayment } from "@/lib/payments";
import { planIntake, planSignature } from "@/lib/transitions";
import { NOW, sampleIntake, testStore } from "./helpers";

describe("reminders and calendar files", () => {
  it("sends the seven-day and one-day notes once", async () => {
    const store = testStore();
    const held = await store.createHold({
      packageId: "corporate",
      date: "2026-11-19",
      startTime: "16:00",
      addons: [],
      now: NOW,
    });
    await store.updateBooking(held.id, (current) => planIntake(current, sampleIntake(), NOW));
    const signed = await store.updateBooking(held.id, (current) => planSignature(current, "Jordan Blake", true, NOW));
    await store.updateBooking(held.id, () => applyDemoPayment(signed, NOW).booking);

    const sent: string[] = [];
    const mailer: Mailer = async (message) => {
      sent.push(message.subject);
    };
    expect(dueReminder((await store.getBooking(held.id))!, "2026-11-12", NOW)).toBe("seven");
    const first = await sendDueReminders(store, NOW, mailer);
    expect(first).toEqual([`${held.id}:seven`]);
    expect(await sendDueReminders(store, NOW, mailer)).toEqual([]);

    await store.updateBooking(held.id, (current) => ({ ...current, date: "2026-11-13", reminders: {} }));
    expect(dueReminder((await store.getBooking(held.id))!, "2026-11-12", NOW)).toBe("one");
    expect(await sendDueReminders(store, NOW, mailer)).toEqual([`${held.id}:one`]);
    expect(sent.some((subject) => subject.startsWith("One week"))).toBe(true);
    expect(sent.some((subject) => subject.startsWith("Tomorrow"))).toBe(true);
  });

  it("does not remind an unpaid booking", async () => {
    const store = testStore();
    const held = await store.createHold({
      packageId: "corporate",
      date: "2026-11-19",
      startTime: "16:00",
      addons: [],
      now: NOW,
    });
    expect(dueReminder(held, "2026-11-12", NOW)).toBeNull();
  });

  it("writes a UTC calendar file that follows Chicago daylight time", async () => {
    const store = testStore();
    const held = await store.createHold({
      packageId: "corporate",
      date: "2026-11-20",
      startTime: "16:00",
      addons: [],
      now: NOW,
    });
    const withIntake = await store.updateBooking(held.id, (current) => planIntake(current, sampleIntake(), NOW));
    const winter = buildIcs(withIntake, NOW);
    expect(winter).toContain("DTSTART:20261120T220000Z");
    expect(winter).toContain("DTEND:20261120T233000Z");
    expect(winter).toContain("Northshore Capital Dinner");

    const summer = buildIcs({ ...withIntake, date: "2026-07-15" }, NOW);
    expect(summer).toContain("DTSTART:20260715T210000Z");
    expect(summer).toContain("DTEND:20260715T223000Z");
  });
});
