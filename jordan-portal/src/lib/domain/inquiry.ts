import { z } from "zod";
import { newId } from "@/lib/ids";
import type { Database, WeddingDetails } from "@/lib/types";
import { DomainError } from "./errors";
import { pushAudit } from "./records";

const inquirySchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.email().max(160),
  phone: z.string().trim().min(7).max(40),
  weddingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateConfirmed: z.enum(["yes", "no"]),
  venue: z.string().trim().min(1).max(160),
  city: z.string().trim().min(1).max(80),
  gettingReadyLocation: z.string().trim().min(1).max(160),
  readyByTime: z.string().trim().min(1).max(40),
  services: z.enum(["hair", "makeup", "both"]),
  party: z.enum(["bride_only", "party"]),
  brideCount: z.string().trim().optional().default(""),
  partyCount: z.string().trim().optional().default(""),
  fullJourney: z.enum(["yes", "no"]),
  otherEvents: z.string().trim().max(2000).optional().default(""),
  travel: z.string().trim().max(2000).optional().default(""),
  investmentRange: z.string().trim().max(200).optional().default(""),
  referralSource: z.string().trim().max(160).optional().default(""),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

export function parseInquiry(
  input: Record<string, string | undefined>,
): InquiryInput {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("Check the inquiry form and try again.");
  }
  if (parsed.data.party === "party") {
    const count = Number(parsed.data.partyCount);
    if (!Number.isInteger(count) || count < 1) {
      throw new DomainError("Add an approximate party count.");
    }
  }
  return parsed.data;
}

function optionalCount(value: string): number | null {
  if (!value) return null;
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) {
    throw new DomainError("Counts need to be whole numbers.");
  }
  return count;
}

export function createWeddingInquiry(
  db: Database,
  input: InquiryInput,
  nowIso: string,
): { clientId: string; projectId: string } {
  const email = input.email.toLowerCase();
  let client = db.clients.find((item) => item.email.toLowerCase() === email);
  if (!client) {
    client = {
      id: newId(),
      auth_user_id: null,
      email,
      full_name: input.fullName,
      phone: input.phone,
      created_at: nowIso,
    };
    db.clients.push(client);
  } else if (!client.phone) {
    client.phone = input.phone;
  }

  const projectId = newId();
  db.projects.push({
    id: projectId,
    client_id: client.id,
    kind: "wedding",
    status: "inquiry_received",
    agreed_total_cents: null,
    total_approved_at: null,
    calendly_event_uri: null,
    calendly_invitee_uri: null,
    stripe_reference: null,
    boulevard_client_ref: null,
    boulevard_order_ref: null,
    created_at: nowIso,
  });

  const details: WeddingDetails = {
    project_id: projectId,
    wedding_date: input.weddingDate,
    date_confirmed: input.dateConfirmed === "yes",
    venue: input.venue,
    city: input.city,
    getting_ready_location: input.gettingReadyLocation,
    ready_by_time: input.readyByTime,
    services: input.services,
    party: input.party,
    bride_count:
      input.party === "bride_only" ? 1 : optionalCount(input.brideCount),
    party_count:
      input.party === "party" ? optionalCount(input.partyCount) : null,
    full_journey_interest: input.fullJourney === "yes",
    other_events: input.otherEvents,
    travel: input.travel,
    investment_range_note: input.investmentRange,
    referral_source: input.referralSource,
    created_at: nowIso,
  };
  db.wedding_details.push(details);
  pushAudit(db, {
    actor: "public-inquiry",
    action: "wedding.inquiry_received",
    entity: "project",
    entity_id: projectId,
    created_at: nowIso,
    metadata: { reserves_date: false },
  });
  return { clientId: client.id, projectId };
}
