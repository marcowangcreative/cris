import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { nextOpenDate } from "@/lib/civil-date";
import { SlotUnavailableError } from "@/lib/errors";
import { DocumentStore } from "@/lib/store/document";
import { filePersistence } from "@/lib/store/persistence";
import { planIntake, planSignature } from "@/lib/transitions";
import { NOW, sampleIntake, testStore } from "./helpers";

describe("booking store", () => {
  it("allows only one of two simultaneous holds on the same slot", async () => {
    const store = testStore();
    const input = {
      packageId: "corporate",
      date: "2026-11-18",
      startTime: "16:00",
      addons: [],
      now: NOW,
    };
    const results = await Promise.allSettled([store.createHold(input), store.createHold(input)]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(SlotUnavailableError);
    const bookings = await store.listBookings();
    expect(bookings.filter((booking) => booking.status === "held")).toHaveLength(1);
  });

  it("refuses a second event the same day when the max is one, and allows a later time when the max is two", async () => {
    const limited = testStore();
    await limited.createHold({ packageId: "corporate", date: "2026-11-18", startTime: "11:00", addons: [], now: NOW });
    await expect(
      limited.createHold({ packageId: "corporate", date: "2026-11-18", startTime: "18:00", addons: [], now: NOW }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);

    const room = testStore({ maxEventsPerDate: 2 });
    await room.createHold({ packageId: "digital", date: "2026-11-18", startTime: "11:00", addons: [], now: NOW });
    const second = await room.createHold({
      packageId: "corporate",
      date: "2026-11-18",
      startTime: "14:00",
      addons: [],
      now: NOW,
    });
    expect(second.status).toBe("held");
    await expect(
      room.createHold({ packageId: "corporate", date: "2026-11-18", startTime: "16:00", addons: [], now: NOW }),
    ).rejects.toThrow(/overlap|fully booked/);
  });

  it("frees a slot after the hold expires and keeps a signed booking on the book", async () => {
    const store = testStore();
    const held = await store.createHold({
      packageId: "corporate",
      date: "2026-11-18",
      startTime: "16:00",
      addons: [],
      now: new Date(NOW.getTime() - 60 * 60_000),
    });
    expect(held.holdExpiresAt < NOW.toISOString()).toBe(true);
    const next = await store.createHold({
      packageId: "corporate",
      date: "2026-11-18",
      startTime: "16:00",
      addons: [],
      now: NOW,
    });
    const signed = await store.updateBooking(next.id, (current) =>
      planSignature(planIntake(current, sampleIntake(), NOW), "Jordan Blake", true, NOW),
    );
    expect(signed.contract?.agreed).toBe(true);
    expect(signed.contract?.body).toContain("Northshore Capital Dinner");
    expect(signed.contract?.body).toContain("Jordan Blake");
    expect(signed.contract?.signedAt).toBe(NOW.toISOString());
    await expect(
      store.createHold({ packageId: "corporate", date: "2026-11-18", startTime: "16:00", addons: [], now: NOW }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it("round-trips the file store and seeds demo bookings", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "camarawong-"));
    const file = path.join(directory, "store.json");
    const store = new DocumentStore(filePersistence(file));
    const seeded = await store.listBookings();
    expect(seeded.map((booking) => booking.id).sort()).toEqual(["seed_paid_corporate", "seed_pending_digital"]);
    const settings = await store.getSettings();
    const date = nextOpenDate(NOW, 3, [...settings.blockedDates, ...seeded.map((booking) => booking.date)]);
    const created = await store.createHold({
      packageId: "corporate",
      date,
      startTime: "11:00",
      addons: [],
      now: NOW,
    });
    const saved = JSON.parse(await readFile(file, "utf8")) as { bookings: { id: string }[] };
    expect(saved.bookings.some((booking) => booking.id === created.id)).toBe(true);

    const reopened = new DocumentStore(filePersistence(file));
    expect(await reopened.getBooking(created.id)).toMatchObject({ id: created.id, status: "held" });
  });
});
