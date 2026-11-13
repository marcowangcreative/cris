export type TransformationStatus =
  | "payment_required"
  | "confirmed"
  | "needs_review"
  | "completed"
  | "canceled";

export type WeddingStatus =
  | "inquiry_received"
  | "availability_review"
  | "discovery_consultation"
  | "proposal_sent"
  | "accepted_payment"
  | "confirmed"
  | "planning"
  | "completed";

export type ProjectStatus = TransformationStatus | WeddingStatus;

export interface Client {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
}

export interface Staff {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  role: "owner" | "admin";
  created_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  kind: "transformation" | "wedding";
  status: ProjectStatus;
  agreed_total_cents: number | null;
  total_approved_at: string | null;
  calendly_event_uri: string | null;
  calendly_invitee_uri: string | null;
  stripe_reference: string | null;
  boulevard_client_ref: string | null;
  boulevard_order_ref: string | null;
  created_at: string;
}

export interface ReleaseChecklist {
  weddings_reconciled: boolean;
  travel_reviewed: boolean;
  personal_blocks_reviewed: boolean;
  existing_bookings_reviewed: boolean;
}

export interface ReleaseBatch {
  id: string;
  target_year: number;
  target_month: number;
  /** ISO weekdays: 1 Monday through 7 Sunday. */
  weekdays: number[];
  release_at: string | null;
  published_at: string | null;
  status: "draft" | "published";
  checklist: ReleaseChecklist;
}

export type AppointmentStatus =
  | "confirmed"
  | "pending_payment"
  | "canceled"
  | "needs_review";

export interface Appointment {
  id: string;
  project_id: string;
  client_id: string;
  kind: "transformation";
  status: AppointmentStatus;
  starts_at: string;
  ends_at: string;
  location: string;
  calendly_event_uri: string | null;
  calendly_invitee_uri: string | null;
  created_at: string;
}

export interface Consultation {
  id: string;
  project_id: string;
  status: "included_unscheduled" | "scheduled" | "completed" | "canceled";
  provider: "zoom" | "teams" | null;
  duration_minutes: number;
  fee_cents: 0;
  scheduled_at: string | null;
  meeting_url: string | null;
  created_at: string;
}

export interface ChemicalHistory {
  color: boolean;
  bleach: boolean;
  relaxer: boolean;
  keratin: boolean;
  last_chemical_service: string;
  details: string;
}

export interface IntakeResponse {
  id: string;
  project_id: string;
  hair_history: string;
  chemical_history: ChemicalHistory;
  scalp_notes: string;
  goals: string;
  submitted_at: string;
}

export interface Asset {
  id: string;
  project_id: string;
  client_id: string;
  kind: "current_hair" | "inspiration";
  storage_path: string;
  content_type: string;
  file_name: string;
  created_at: string;
}

export interface Proposal {
  id: string;
  project_id: string;
  version: number;
  scope: string;
  /** Null only when a wedding scope is recorded without a price. */
  final_price_cents: number | null;
  estimated_time: string;
  maintenance: string;
  approved_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  project_id: string;
  type: "stripe_reservation_deposit";
  status: "succeeded" | "failed" | "pending";
  amount_cents: number;
  verification: "verified" | "manual";
  external_ref: string | null;
  calendly_invitee_uri: string | null;
  created_at: string;
}

export interface WeddingDetails {
  project_id: string;
  wedding_date: string;
  date_confirmed: boolean;
  venue: string;
  city: string;
  getting_ready_location: string;
  ready_by_time: string;
  services: "hair" | "makeup" | "both";
  party: "bride_only" | "party";
  bride_count: number | null;
  party_count: number | null;
  full_journey_interest: boolean;
  other_events: string;
  travel: string;
  investment_range_note: string;
  referral_source: string;
  created_at: string;
}

export interface Commitment {
  id: string;
  project_id: string | null;
  kind: "wedding" | "travel" | "personal" | "hold";
  status: "confirmed" | "hold" | "released";
  starts_at: string;
  ends_at: string;
  expires_at: string | null;
  blocks_transformations: boolean;
  /** Admin-only. Never copied into the ICS feed or the client portal. */
  internal_label: string;
  created_at: string;
}

export interface IntegrationEvent {
  id: string;
  dedupe_key: string;
  source: "calendly";
  event_type: string;
  payload: unknown;
  status: "processed" | "failed";
  outcome: string;
  error: string | null;
  project_id: string | null;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  metadata: Record<string, string | number | boolean | null>;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string | null;
  appointment_id: string | null;
  kind: "cancellation_review" | "reschedule_review" | "payment_review";
  status: "open" | "resolved";
  detail: string;
  created_at: string;
  resolved_at: string | null;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  body: string;
  created_at: string;
}

export interface Consent {
  id: string;
  client_id: string;
  project_id: string;
  kind: "marketing_photo";
  granted: boolean;
  updated_at: string;
}

export interface Database {
  seed_version: number;
  clients: Client[];
  staff: Staff[];
  projects: Project[];
  release_batches: ReleaseBatch[];
  appointments: Appointment[];
  consultations: Consultation[];
  intake_responses: IntakeResponse[];
  assets: Asset[];
  proposals: Proposal[];
  payments: Payment[];
  wedding_details: WeddingDetails[];
  commitments: Commitment[];
  integration_events: IntegrationEvent[];
  audit_events: AuditEvent[];
  tasks: Task[];
  project_notes: ProjectNote[];
  consents: Consent[];
}

export type Actor =
  | { role: "client"; clientId: string }
  | { role: "admin"; staffId: string };
