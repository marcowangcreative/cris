import { DateTime } from "luxon";
import { newId } from "@/lib/ids";
import type {
  Asset,
  ChemicalHistory,
  Commitment,
  Database,
  Proposal,
  WeddingStatus,
} from "@/lib/types";
import { DomainError } from "./errors";
import { assertTransformationPrice } from "./money";
import { pushAudit } from "./records";
import { chicagoDayInterval } from "./time";

export function saveIntake(
  db: Database,
  clientId: string,
  projectId: string,
  input: {
    hairHistory: string;
    chemical: ChemicalHistory;
    scalpNotes: string;
    goals: string;
  },
  nowIso: string,
): void {
  const project = ownProject(db, clientId, projectId);
  if (project.kind !== "transformation") {
    throw new DomainError("Intake is for a transformation project.");
  }
  if (!input.hairHistory.trim() || !input.goals.trim()) {
    throw new DomainError("Add your hair history and what you want from the day.");
  }
  const existing = db.intake_responses.find(
    (item) => item.project_id === projectId,
  );
  if (existing) {
    existing.hair_history = input.hairHistory.trim();
    existing.chemical_history = input.chemical;
    existing.scalp_notes = input.scalpNotes.trim();
    existing.goals = input.goals.trim();
    existing.submitted_at = nowIso;
  } else {
    db.intake_responses.push({
      id: newId(),
      project_id: projectId,
      hair_history: input.hairHistory.trim(),
      chemical_history: input.chemical,
      scalp_notes: input.scalpNotes.trim(),
      goals: input.goals.trim(),
      submitted_at: nowIso,
    });
  }
  pushAudit(db, {
    actor: `client:${clientId}`,
    action: "intake.saved",
    entity: "project",
    entity_id: projectId,
    created_at: nowIso,
  });
}

export function setMarketingConsent(
  db: Database,
  clientId: string,
  projectId: string,
  granted: boolean,
  nowIso: string,
): void {
  ownProject(db, clientId, projectId);
  const existing = db.consents.find(
    (item) => item.project_id === projectId && item.kind === "marketing_photo",
  );
  if (existing) {
    existing.granted = granted;
    existing.updated_at = nowIso;
  } else {
    db.consents.push({
      id: newId(),
      client_id: clientId,
      project_id: projectId,
      kind: "marketing_photo",
      granted,
      updated_at: nowIso,
    });
  }
  pushAudit(db, {
    actor: `client:${clientId}`,
    action: "consent.marketing_photo",
    entity: "project",
    entity_id: projectId,
    created_at: nowIso,
    metadata: { granted },
  });
}

export function addAsset(
  db: Database,
  input: Omit<Asset, "created_at"> & { created_at?: string },
): Asset {
  const asset: Asset = { ...input, created_at: input.created_at ?? new Date().toISOString() };
  if (!asset.storage_path.startsWith(`${asset.client_id}/`)) {
    throw new DomainError("Files stay in the client’s own folder.");
  }
  db.assets.push(asset);
  return asset;
}

export function approveProposal(
  db: Database,
  clientId: string,
  proposalId: string,
  nowIso: string,
): void {
  const proposal = db.proposals.find((item) => item.id === proposalId);
  if (!proposal) throw new DomainError("Proposal not found.");
  const project = ownProject(db, clientId, proposal.project_id);
  const latest = db.proposals
    .filter((item) => item.project_id === project.id)
    .sort((a, b) => b.version - a.version)[0];
  if (!latest || latest.id !== proposal.id) {
    throw new DomainError("Only the latest proposal can be approved.");
  }
  if (proposal.approved_at) return;
  proposal.approved_at = nowIso;
  if (project.kind === "transformation" && proposal.final_price_cents != null) {
    assertTransformationPrice(proposal.final_price_cents);
    project.agreed_total_cents = proposal.final_price_cents;
    project.total_approved_at = nowIso;
  }
  pushAudit(db, {
    actor: `client:${clientId}`,
    action: "proposal.approved",
    entity: "proposal",
    entity_id: proposal.id,
    created_at: nowIso,
    metadata: { version: proposal.version },
  });
}

export function addProposal(
  db: Database,
  staffId: string,
  input: {
    projectId: string;
    scope: string;
    finalPriceCents: number | null;
    estimatedTime: string;
    maintenance: string;
  },
  nowIso: string,
): Proposal {
  const project = db.projects.find((item) => item.id === input.projectId);
  if (!project) throw new DomainError("Project not found.");
  if (!input.scope.trim()) throw new DomainError("Add a scope.");
  if (project.kind === "transformation") {
    if (input.finalPriceCents == null) {
      throw new DomainError("A transformation proposal needs a price.");
    }
    assertTransformationPrice(input.finalPriceCents);
  } else if (input.finalPriceCents != null) {
    throw new DomainError(
      "Leave bridal price blank. Bridal pricing is an open owner decision.",
    );
  }
  const version =
    db.proposals
      .filter((item) => item.project_id === project.id)
      .reduce((max, item) => Math.max(max, item.version), 0) + 1;
  const proposal: Proposal = {
    id: newId(),
    project_id: project.id,
    version,
    scope: input.scope.trim(),
    final_price_cents: input.finalPriceCents,
    estimated_time: input.estimatedTime.trim(),
    maintenance: input.maintenance.trim(),
    approved_at: null,
    created_at: nowIso,
  };
  db.proposals.push(proposal);
  if (project.kind === "transformation" && input.finalPriceCents != null) {
    project.agreed_total_cents = input.finalPriceCents;
    project.total_approved_at = null;
  }
  pushAudit(db, {
    actor: `staff:${staffId}`,
    action: "proposal.created",
    entity: "proposal",
    entity_id: proposal.id,
    created_at: nowIso,
    metadata: { version, price_cents: input.finalPriceCents },
  });
  return proposal;
}

export function addNote(
  db: Database,
  staffId: string,
  projectId: string,
  body: string,
  nowIso: string,
): void {
  if (!db.projects.some((item) => item.id === projectId)) {
    throw new DomainError("Project not found.");
  }
  if (!body.trim()) throw new DomainError("Write a note before saving.");
  db.project_notes.push({
    id: newId(),
    project_id: projectId,
    body: body.trim(),
    created_at: nowIso,
  });
  pushAudit(db, {
    actor: `staff:${staffId}`,
    action: "note.added",
    entity: "project",
    entity_id: projectId,
    created_at: nowIso,
  });
}

export function setBoulevardRefs(
  db: Database,
  staffId: string,
  projectId: string,
  refs: { orderRef: string; clientRef: string },
  nowIso: string,
): void {
  const project = db.projects.find((item) => item.id === projectId);
  if (!project) throw new DomainError("Project not found.");
  project.boulevard_order_ref = refs.orderRef.trim() || null;
  project.boulevard_client_ref = refs.clientRef.trim() || null;
  pushAudit(db, {
    actor: `staff:${staffId}`,
    action: "boulevard.refs_saved",
    entity: "project",
    entity_id: projectId,
    created_at: nowIso,
  });
}

export function setWeddingStatus(
  db: Database,
  staffId: string,
  input: {
    projectId: string;
    status: WeddingStatus;
    commitmentStart?: string;
    commitmentEnd?: string;
  },
  nowIso: string,
): void {
  const project = db.projects.find((item) => item.id === input.projectId);
  if (!project || project.kind !== "wedding") {
    throw new DomainError("Wedding project not found.");
  }
  const needsCommitment =
    input.status === "confirmed" ||
    input.status === "planning" ||
    input.status === "completed";
  const hasConfirmed = db.commitments.some(
    (item) =>
      item.project_id === project.id &&
      item.status === "confirmed" &&
      item.blocks_transformations,
  );
  if (needsCommitment && !hasConfirmed) {
    if (!input.commitmentStart || !input.commitmentEnd) {
      throw new DomainError(
        "Only the studio can confirm a wedding, and confirmation needs a commitment that blocks transformation dates.",
      );
    }
    addCommitment(db, staffId, {
      projectId: project.id,
      kind: "wedding",
      status: "confirmed",
      startDate: input.commitmentStart,
      endDate: input.commitmentEnd,
      expiresAt: null,
      internalLabel: "Wedding commitment",
    }, nowIso);
  }
  project.status = input.status;
  pushAudit(db, {
    actor: `staff:${staffId}`,
    action: "wedding.status",
    entity: "project",
    entity_id: project.id,
    created_at: nowIso,
    metadata: { status: input.status },
  });
}

export function addCommitment(
  db: Database,
  staffId: string,
  input: {
    projectId: string | null;
    kind: Commitment["kind"];
    status: "confirmed" | "hold";
    startDate: string;
    endDate: string;
    expiresAt: string | null;
    internalLabel: string;
  },
  nowIso: string,
): Commitment {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
    throw new DomainError("Commitment dates use a calendar day.");
  }
  const endDate = input.endDate || input.startDate;
  if (input.status === "hold" && !input.expiresAt) {
    throw new DomainError("A hold needs an expiry.");
  }
  const start = chicagoDayInterval(input.startDate).start.toUTC().toISO();
  const end = chicagoDayInterval(endDate).end.toUTC().toISO();
  if (!start || !end) throw new DomainError("Those dates could not be saved.");
  const commitment: Commitment = {
    id: newId(),
    project_id: input.projectId,
    kind: input.kind,
    status: input.status,
    starts_at: start,
    ends_at: end,
    expires_at: input.expiresAt,
    blocks_transformations: true,
    internal_label: input.internalLabel.trim() || "Unavailable",
    created_at: nowIso,
  };
  db.commitments.push(commitment);
  pushAudit(db, {
    actor: `staff:${staffId}`,
    action: "commitment.created",
    entity: "commitment",
    entity_id: commitment.id,
    created_at: nowIso,
    metadata: { kind: input.kind, status: input.status },
  });
  return commitment;
}

export function createReleaseBatch(
  db: Database,
  staffId: string,
  input: { year: number; month: number; weekdays: number[] },
  nowIso: string,
): void {
  if (input.month < 1 || input.month > 12) {
    throw new DomainError("Choose a month.");
  }
  const weekdays = [...new Set(input.weekdays)].sort((a, b) => a - b);
  if (weekdays.length !== 3 || weekdays.some((day) => day < 1 || day > 7)) {
    throw new DomainError("A release uses exactly three weekdays.");
  }
  const duplicate = db.release_batches.some(
    (batch) =>
      batch.target_year === input.year && batch.target_month === input.month,
  );
  if (duplicate) throw new DomainError("That month already has a batch.");
  const id = newId();
  db.release_batches.push({
    id,
    target_year: input.year,
    target_month: input.month,
    weekdays,
    release_at: null,
    published_at: null,
    status: "draft",
    checklist: {
      weddings_reconciled: false,
      travel_reviewed: false,
      personal_blocks_reviewed: false,
      existing_bookings_reviewed: false,
    },
  });
  pushAudit(db, {
    actor: `staff:${staffId}`,
    action: "release_batch.created",
    entity: "release_batch",
    entity_id: id,
    created_at: nowIso,
  });
}

export function resolveTask(
  db: Database,
  staffId: string,
  taskId: string,
  nowIso: string,
): void {
  const task = db.tasks.find((item) => item.id === taskId);
  if (!task) throw new DomainError("Task not found.");
  task.status = "resolved";
  task.resolved_at = nowIso;
  pushAudit(db, {
    actor: `staff:${staffId}`,
    action: "task.resolved",
    entity: "task",
    entity_id: task.id,
    created_at: nowIso,
  });
}

export function releaseUnconfirmedDay(
  db: Database,
  staffId: string,
  appointmentId: string,
  nowIso: string,
): void {
  const appointment = db.appointments.find((item) => item.id === appointmentId);
  if (!appointment) throw new DomainError("Appointment not found.");
  if (appointment.status === "confirmed") {
    throw new DomainError("A confirmed day is not released from this action.");
  }
  appointment.status = "canceled";
  for (const task of db.tasks) {
    if (task.appointment_id === appointment.id && task.status === "open") {
      task.status = "resolved";
      task.resolved_at = nowIso;
    }
  }
  pushAudit(db, {
    actor: `staff:${staffId}`,
    action: "appointment.unconfirmed_released",
    entity: "appointment",
    entity_id: appointment.id,
    created_at: nowIso,
  });
}

export function studioNow(iso?: string): DateTime {
  return DateTime.fromISO(iso ?? new Date().toISOString(), { setZone: true });
}

function ownProject(db: Database, clientId: string, projectId: string) {
  const project = db.projects.find((item) => item.id === projectId);
  if (!project || project.client_id !== clientId) {
    throw new DomainError("Forbidden.");
  }
  return project;
}
