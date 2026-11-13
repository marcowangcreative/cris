import type { Actor, Asset, Database, Project } from "@/lib/types";
import { reconcileProject, type Reconciliation } from "./money";
import { DomainError } from "./errors";
import { formatChicago } from "./time";

export interface ClientProposalView {
  id: string;
  version: number;
  scope: string;
  finalPriceCents: number | null;
  estimatedTime: string;
  maintenance: string;
  approvedAt: string | null;
  approvedLabel: string | null;
}

export interface ClientProjectView {
  project: {
    id: string;
    kind: Project["kind"];
    status: Project["status"];
    agreedTotalCents: number | null;
    totalApprovedAt: string | null;
    boulevardOrderRef: string | null;
  };
  client: { fullName: string; email: string };
  appointment: {
    status: string;
    startsAt: string;
    when: string;
    location: string;
  } | null;
  consultation: {
    status: string;
    provider: string | null;
    durationMinutes: number;
    feeCents: 0;
    scheduledAt: string | null;
    when: string | null;
    meetingUrl: string | null;
  } | null;
  intake: Database["intake_responses"][number] | null;
  assets: Array<Pick<Asset, "id" | "kind" | "file_name" | "content_type">>;
  proposals: ClientProposalView[];
  reconciliation: Reconciliation;
  wedding: Database["wedding_details"][number] | null;
  marketingConsent: boolean;
  next: { title: string; detail: string; href: string };
}

export function readAssetForActor(
  db: Database,
  actor: Actor,
  assetId: string,
): Asset {
  const asset = db.assets.find((item) => item.id === assetId);
  if (!asset) throw new DomainError("File not found.");
  if (actor.role === "admin") return asset;
  if (asset.client_id !== actor.clientId) {
    throw new DomainError("Forbidden. You cannot open another client’s file.");
  }
  return asset;
}

export function toClientProject(
  db: Database,
  clientId: string,
  projectId: string,
): ClientProjectView {
  const project = db.projects.find((item) => item.id === projectId);
  const client = db.clients.find((item) => item.id === clientId);
  if (!project || !client || project.client_id !== clientId) {
    throw new DomainError("Forbidden.");
  }
  const appointment =
    db.appointments.find(
      (item) =>
        item.project_id === project.id && item.status !== "canceled",
    ) ??
    db.appointments.find((item) => item.project_id === project.id) ??
    null;
  const consultation =
    db.consultations.find((item) => item.project_id === project.id) ?? null;
  const intake =
    db.intake_responses.find((item) => item.project_id === project.id) ?? null;
  const assets = db.assets
    .filter((item) => item.project_id === project.id)
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      file_name: item.file_name,
      content_type: item.content_type,
    }));
  const proposals = db.proposals
    .filter((item) => item.project_id === project.id)
    .sort((a, b) => a.version - b.version)
    .map((item) => ({
      id: item.id,
      version: item.version,
      scope: item.scope,
      finalPriceCents: item.final_price_cents,
      estimatedTime: item.estimated_time,
      maintenance: item.maintenance,
      approvedAt: item.approved_at,
      approvedLabel: item.approved_at ? formatChicago(item.approved_at) : null,
    }));
  const consent = db.consents.find(
    (item) =>
      item.project_id === project.id && item.kind === "marketing_photo",
  );
  const view: ClientProjectView = {
    project: {
      id: project.id,
      kind: project.kind,
      status: project.status,
      agreedTotalCents: project.agreed_total_cents,
      totalApprovedAt: project.total_approved_at,
      boulevardOrderRef: project.boulevard_order_ref,
    },
    client: { fullName: client.full_name, email: client.email },
    appointment: appointment
      ? {
          status: appointment.status,
          startsAt: appointment.starts_at,
          when: formatChicago(appointment.starts_at),
          location: appointment.location,
        }
      : null,
    consultation: consultation
      ? {
          status: consultation.status,
          provider: consultation.provider,
          durationMinutes: consultation.duration_minutes,
          feeCents: 0,
          scheduledAt: consultation.scheduled_at,
          when: consultation.scheduled_at
            ? formatChicago(consultation.scheduled_at)
            : null,
          meetingUrl: consultation.meeting_url,
        }
      : null,
    intake,
    assets,
    proposals,
    reconciliation: reconcileProject(db, project.id),
    wedding:
      db.wedding_details.find((item) => item.project_id === project.id) ??
      null,
    marketingConsent: Boolean(consent?.granted),
    next: nextAction(db, project.id),
  };
  return view;
}

export function nextAction(
  db: Database,
  projectId: string,
): { title: string; detail: string; href: string } {
  const project = db.projects.find((item) => item.id === projectId);
  if (!project) throw new DomainError("Project not found.");
  const href = `/portal/projects/${project.id}`;
  if (project.kind === "wedding") {
    return {
      title:
        project.status === "confirmed" ||
        project.status === "planning" ||
        project.status === "completed"
          ? "The studio has confirmed this celebration"
          : "Your inquiry is with the studio",
      detail:
        "An inquiry does not reserve a date. Scope, pricing, and availability stay with the studio until someone there confirms them.",
      href,
    };
  }
  const appointment = db.appointments.find(
    (item) => item.project_id === project.id && item.status !== "canceled",
  );
  if (!appointment || appointment.status === "pending_payment") {
    return {
      title: "This date is not confirmed",
      detail:
        "A transformation is confirmed only after the $600 deposit succeeds. A failed or missing payment is never a confirmed booking.",
      href,
    };
  }
  if (appointment.status === "needs_review") {
    return {
      title: "The studio is reviewing a change",
      detail:
        "A cancellation or a time that needs a human check stays open until the studio resolves it.",
      href,
    };
  }
  if (!db.intake_responses.some((item) => item.project_id === project.id)) {
    return {
      title: "Complete your intake",
      detail:
        "Hair history and chemical history give the consultation something real to work from.",
      href: `${href}#intake`,
    };
  }
  if (
    !db.assets.some(
      (item) => item.project_id === project.id && item.kind === "current_hair",
    )
  ) {
    return {
      title: "Add a photo of your current hair",
      detail:
        "Inspiration photos can sit beside it. Marketing use of any photo is a separate choice.",
      href: `${href}#photos`,
    };
  }
  const pending = db.proposals
    .filter((item) => item.project_id === project.id)
    .sort((a, b) => b.version - a.version)[0];
  if (pending && !pending.approved_at) {
    return {
      title: "Review and approve your proposal",
      detail:
        "The proposal lists scope, price, time, and maintenance. Approving records the time you accepted it.",
      href: `${href}#proposal`,
    };
  }
  const consultation = db.consultations.find(
    (item) => item.project_id === project.id,
  );
  if (consultation && consultation.status === "included_unscheduled") {
    return {
      title: "Your consultation is included",
      detail:
        "There is no fee. The default length is 30 minutes. Zoom or Teams is still an open studio decision.",
      href: `${href}#consultation`,
    };
  }
  return {
    title: "You are set for 10:00 a.m.",
    detail:
      "The workday is held for you. The balance is collected in Boulevard, not in this portal.",
    href: `${href}#day`,
  };
}
