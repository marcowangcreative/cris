import { describe, expect, it } from "vitest";
import { isTenAmChicago } from "@/lib/domain/time";
import {
  cancelParkerPayload,
  failedPaymentPayload,
  missingPaymentPayload,
  paidTransformationPayload,
} from "@/lib/domain/samples";
import { processCalendlyEvent } from "@/lib/domain/webhook";
import { evaluateReleaseDates } from "@/lib/domain/availability";
import { IDS } from "@/lib/ids";
import { signCalendly, verifyCalendlySignature } from "@/lib/domain/signature";
import { cloneSeed, STUDIO_NOW, STUDIO_NOW_ISO } from "./helpers";

describe("Calendly webhooks", () => {
  it("records one deposit when the same webhook is delivered twice", () => {
    const db = cloneSeed();
    const before = db.payments.filter((item) => item.status === "succeeded").length;
    const payload = paidTransformationPayload();
    const first = processCalendlyEvent(db, payload, STUDIO_NOW_ISO);
    const second = processCalendlyEvent(db, payload, STUDIO_NOW_ISO);
    const after = db.payments.filter((item) => item.status === "succeeded").length;
    expect(first.confirmed).toBe(true);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.httpStatus).toBe(200);
    expect(after - before).toBe(1);
    expect(
      db.integration_events.filter((item) => item.dedupe_key.includes("INVDEMO1")),
    ).toHaveLength(1);
    const appointment = db.appointments.find(
      (item) => item.calendly_invitee_uri === payload.payload.uri,
    );
    expect(appointment?.status).toBe("confirmed");
    expect(isTenAmChicago(appointment?.starts_at ?? "")).toBe(true);
    const project = db.projects.find((item) => item.id === appointment?.project_id);
    expect(project?.kind).toBe("transformation");
    const deposit = db.payments.find(
      (item) => item.calendly_invitee_uri === payload.payload.uri,
    );
    expect(deposit).toMatchObject({
      type: "stripe_reservation_deposit",
      status: "succeeded",
      amount_cents: 60_000,
      verification: "verified",
      external_ref: "pi_demo_parker_001",
    });
  });

  it("does not confirm a booking when payment failed or is missing", () => {
    const db = cloneSeed();
    const failed = processCalendlyEvent(db, failedPaymentPayload(), STUDIO_NOW_ISO);
    const missing = processCalendlyEvent(db, missingPaymentPayload(), STUDIO_NOW_ISO);
    expect(failed.confirmed).toBe(false);
    expect(missing.confirmed).toBe(false);
    const created = db.appointments.filter((item) =>
      item.calendly_invitee_uri?.includes("INVDEMO"),
    );
    expect(created.every((item) => item.status !== "confirmed")).toBe(true);
    expect(
      db.payments.some(
        (item) =>
          item.status === "succeeded" &&
          item.calendly_invitee_uri?.includes("INVDEMO"),
      ),
    ).toBe(false);
  });

  it("does not confirm a paid booking that is not 10:00 a.m. Chicago", () => {
    const db = cloneSeed();
    const result = processCalendlyEvent(
      db,
      paidTransformationPayload({
        uri: "https://api.calendly.com/scheduled_events/EVTDEMO9/invitees/INVDEMO9",
        start: "2027-01-05T15:00:00.000Z",
        email: "early.bird@example.com",
        name: "Early Bird",
      }),
      STUDIO_NOW_ISO,
    );
    expect(result.confirmed).toBe(false);
    const appointment = db.appointments.find((item) =>
      item.calendly_invitee_uri?.includes("INVDEMO9"),
    );
    expect(appointment?.status).not.toBe("confirmed");
  });

  it("flags a cancellation for review and does not invent a refund", () => {
    const db = cloneSeed();
    processCalendlyEvent(db, paidTransformationPayload(), STUDIO_NOW_ISO);
    const canceled = processCalendlyEvent(db, cancelParkerPayload(), STUDIO_NOW_ISO);
    expect(canceled.confirmed).toBe(false);
    const appointment = db.appointments.find((item) =>
      item.calendly_invitee_uri?.includes("INVDEMO1"),
    );
    expect(appointment?.status).toBe("canceled");
    expect(
      db.tasks.some(
        (task) =>
          task.kind === "cancellation_review" &&
          task.detail.toLowerCase().includes("refund terms"),
      ),
    ).toBe(true);
    expect(
      db.payments.some(
        (item) =>
          item.calendly_invitee_uri?.includes("INVDEMO1") &&
          item.status === "succeeded",
      ),
    ).toBe(true);
    const dates = evaluateReleaseDates(db, IDS.januaryBatch, STUDIO_NOW);
    expect(dates.find((item) => item.date === "2027-01-05")?.available).toBe(true);
  });
});

describe("webhook signatures", () => {
  it("accepts a fresh signature and rejects a stale or altered one", () => {
    const body = JSON.stringify(paidTransformationPayload());
    const secret = "whsec_demo_only_not_a_real_secret";
    const now = Date.now();
    const header = signCalendly(body, secret, Math.floor(now / 1000));
    expect(verifyCalendlySignature(body, header, secret, now)).toBe(true);
    expect(verifyCalendlySignature(`${body} `, header, secret, now)).toBe(false);
    const stale = signCalendly(body, secret, Math.floor(now / 1000) - 3600);
    expect(verifyCalendlySignature(body, stale, secret, now)).toBe(false);
  });
});
