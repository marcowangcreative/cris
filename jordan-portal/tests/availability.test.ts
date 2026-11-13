import { describe, expect, it } from "vitest";
import {
  evaluateReleaseDates,
  publishReleaseBatch,
} from "@/lib/domain/availability";
import { IDS } from "@/lib/ids";
import { cloneSeed, STUDIO_NOW, STUDIO_NOW_ISO } from "./helpers";

const checklist = {
  weddings_reconciled: true,
  travel_reviewed: true,
  personal_blocks_reviewed: true,
  existing_bookings_reviewed: true,
};

describe("release batches and commitments", () => {
  it("lets a confirmed wedding commitment block a transformation date", () => {
    const dates = evaluateReleaseDates(cloneSeed(), IDS.januaryBatch, STUDIO_NOW);
    const byDate = Object.fromEntries(dates.map((item) => [item.date, item]));
    expect(byDate["2027-01-14"]).toMatchObject({
      available: false,
      reason: "commitment",
    });
    expect(byDate["2027-01-21"]).toMatchObject({ reason: "commitment" });
    expect(byDate["2027-01-13"]).toMatchObject({ reason: "commitment" });
    expect(byDate["2027-01-27"]).toMatchObject({ reason: "commitment" });
    expect(byDate["2027-01-28"]).toMatchObject({ available: true, reason: "open" });
    expect(byDate["2027-01-12"]).toMatchObject({ reason: "existing_booking" });
    expect(byDate["2027-01-19"]).toMatchObject({ reason: "unresolved_booking" });
    expect(byDate["2027-01-05"]).toMatchObject({ available: true, reason: "open" });
  });

  it("does not change existing bookings when a batch is published", () => {
    const db = cloneSeed();
    const before = structuredClone(db.appointments);
    publishReleaseBatch(db, IDS.marchBatch, checklist, STUDIO_NOW_ISO, "staff:test");
    expect(db.appointments).toEqual(before);
    expect(db.release_batches.find((item) => item.id === IDS.marchBatch)?.status).toBe(
      "published",
    );
    const avery = db.appointments.find((item) => item.id === IDS.averyAppointment);
    expect(avery).toMatchObject({
      status: "confirmed",
      starts_at: "2027-01-12T16:00:00.000Z",
    });
    const dates = evaluateReleaseDates(db, IDS.januaryBatch, STUDIO_NOW);
    expect(dates.find((item) => item.date === "2027-01-12")?.reason).toBe(
      "existing_booking",
    );
  });

  it("refuses to publish until the checklist is complete", () => {
    const db = cloneSeed();
    expect(() =>
      publishReleaseBatch(
        db,
        IDS.marchBatch,
        { ...checklist, weddings_reconciled: false },
        STUDIO_NOW_ISO,
        "staff:test",
      ),
    ).toThrow(/checklist/i);
    expect(db.release_batches.find((item) => item.id === IDS.marchBatch)?.status).toBe(
      "draft",
    );
  });
});
