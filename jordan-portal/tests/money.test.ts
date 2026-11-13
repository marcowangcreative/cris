import { describe, expect, it } from "vitest";
import { IDS } from "@/lib/ids";
import { reconcileProject } from "@/lib/domain/money";
import { newId } from "@/lib/ids";
import { cloneSeed } from "./helpers";

describe("deposit math", () => {
  it("shows $1,200 minus a $600 external deposit as a $600 Boulevard balance", () => {
    const db = cloneSeed();
    const rec = reconcileProject(db, IDS.averyProject);
    expect(rec.agreedTotalCents).toBe(120_000);
    expect(rec.depositCents).toBe(60_000);
    expect(rec.balanceToCollectCents).toBe(60_000);
    expect(rec.externalPaymentType).toBe("Stripe reservation deposit");
    expect(rec.recordedAsDiscount).toBe(false);
    expect(rec.discountCents).toBe(0);
    expect(rec.duplicateDeposit).toBe(false);
    expect(rec.hasVerified).toBe(true);
    expect(rec.hasManual).toBe(false);
    expect(rec.stripeReference).toBe("pi_demo_avery_600");
  });

  it("keeps a higher quote level as a balance, never a discount", () => {
    const db = cloneSeed();
    const project = db.projects.find((item) => item.id === IDS.averyProject);
    if (!project) throw new Error("missing project");
    project.agreed_total_cents = 240_000;
    const rec = reconcileProject(db, IDS.averyProject);
    expect(rec.balanceToCollectCents).toBe(180_000);
    expect(rec.discountCents).toBe(0);
    expect(rec.recordedAsDiscount).toBe(false);
  });

  it("flags a second succeeded deposit", () => {
    const db = cloneSeed();
    db.payments.push({
      id: newId(),
      project_id: IDS.averyProject,
      type: "stripe_reservation_deposit",
      status: "succeeded",
      amount_cents: 60_000,
      verification: "manual",
      external_ref: "pi_demo_duplicate",
      calendly_invitee_uri: null,
      created_at: "2026-11-13T18:00:00.000Z",
    });
    const rec = reconcileProject(db, IDS.averyProject);
    expect(rec.duplicateDeposit).toBe(true);
    expect(rec.depositCount).toBe(2);
    expect(rec.hasManual).toBe(true);
  });

  it("labels a manually entered deposit", () => {
    const rec = reconcileProject(cloneSeed(), IDS.quinnProject);
    expect(rec.hasManual).toBe(true);
    expect(rec.hasVerified).toBe(false);
    expect(rec.depositCents).toBe(60_000);
    expect(rec.balanceToCollectCents).toBeNull();
  });
});
