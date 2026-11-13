import { describe, expect, it } from "vitest";
import { createWeddingInquiry, parseInquiry } from "@/lib/domain/inquiry";
import { cloneSeed, STUDIO_NOW_ISO } from "./helpers";

const valid = {
  fullName: "Jordan Guest",
  email: "jordan.guest@example.com",
  phone: "(713) 555-0199",
  weddingDate: "2027-09-18",
  dateConfirmed: "no",
  venue: "Sample Garden",
  city: "Houston",
  gettingReadyLocation: "Sample hotel",
  readyByTime: "1:00 p.m.",
  services: "both",
  party: "bride_only",
  fullJourney: "yes",
  otherEvents: "",
  travel: "",
  investmentRange: "",
  referralSource: "Search",
};

describe("wedding inquiries", () => {
  it("creates a wedding project and does not reserve a date", () => {
    const db = cloneSeed();
    const beforeAppointments = db.appointments.length;
    const beforePayments = db.payments.length;
    const beforeCommitments = db.commitments.length;
    const parsed = parseInquiry(valid);
    const created = createWeddingInquiry(db, parsed, STUDIO_NOW_ISO);
    const project = db.projects.find((item) => item.id === created.projectId);
    expect(project).toMatchObject({
      kind: "wedding",
      status: "inquiry_received",
      agreed_total_cents: null,
    });
    expect(db.appointments).toHaveLength(beforeAppointments);
    expect(db.payments).toHaveLength(beforePayments);
    expect(db.commitments).toHaveLength(beforeCommitments);
    expect(db.wedding_details.some((item) => item.project_id === created.projectId)).toBe(
      true,
    );
  });
});
