import { DateTime } from "luxon";
import type { Database } from "@/lib/types";
import { reconcileProject } from "./money";
import { chicagoDate, formatChicago, formatChicagoDate } from "./time";

export interface ScheduleRow {
  at: string;
  label: string;
  kind: string;
  who: string;
  status: string;
  href: string;
}

export interface AttentionItem {
  projectId: string;
  clientName: string;
  label: string;
  href: string;
}

export interface ExceptionItem {
  id: string;
  title: string;
  detail: string;
  href: string | null;
}

export function clientName(db: Database, clientId: string): string {
  return db.clients.find((item) => item.id === clientId)?.full_name ?? "Client";
}

export function searchStudio(db: Database, query: string): {
  clients: Database["clients"];
  projects: Database["projects"];
} {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return { clients: db.clients, projects: db.projects };
  }
  const clients = db.clients.filter(
    (client) =>
      client.full_name.toLowerCase().includes(needle) ||
      client.email.toLowerCase().includes(needle),
  );
  const ids = new Set(clients.map((client) => client.id));
  const projects = db.projects.filter(
    (project) =>
      ids.has(project.client_id) ||
      project.kind.includes(needle) ||
      project.status.includes(needle) ||
      (project.boulevard_order_ref ?? "").toLowerCase().includes(needle) ||
      (project.stripe_reference ?? "").toLowerCase().includes(needle),
  );
  return { clients, projects };
}

export function upcomingSchedule(db: Database, now: DateTime): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const horizon = now.plus({ days: 220 });
  for (const appointment of db.appointments) {
    const start = DateTime.fromISO(appointment.starts_at, { setZone: true });
    if (start < now.minus({ days: 1 }) || start > horizon) continue;
    rows.push({
      at: appointment.starts_at,
      label: formatChicago(appointment.starts_at),
      kind: "Transformation",
      who: clientName(db, appointment.client_id),
      status: appointment.status,
      href: `/admin/projects/${appointment.project_id}`,
    });
  }
  for (const consultation of db.consultations) {
    if (!consultation.scheduled_at) continue;
    const start = DateTime.fromISO(consultation.scheduled_at, { setZone: true });
    if (start < now.minus({ days: 1 }) || start > horizon) continue;
    const project = db.projects.find((item) => item.id === consultation.project_id);
    rows.push({
      at: consultation.scheduled_at,
      label: formatChicago(consultation.scheduled_at),
      kind: "Consultation",
      who: project ? clientName(db, project.client_id) : "Client",
      status: consultation.provider
        ? consultation.status
        : `${consultation.status} · provider not chosen`,
      href: `/admin/projects/${consultation.project_id}`,
    });
  }
  for (const commitment of db.commitments) {
    const start = DateTime.fromISO(commitment.starts_at, { setZone: true });
    if (start > horizon || DateTime.fromISO(commitment.ends_at) < now.minus({ days: 1 })) {
      continue;
    }
    if (commitment.status === "released") continue;
    if (commitment.status === "hold" && commitment.expires_at) {
      if (DateTime.fromISO(commitment.expires_at) <= now) continue;
    }
    const project = commitment.project_id
      ? db.projects.find((item) => item.id === commitment.project_id)
      : undefined;
    rows.push({
      at: commitment.starts_at,
      label: `${formatChicagoDate(chicagoDate(commitment.starts_at))} hold`,
      kind:
        commitment.kind === "wedding"
          ? "Wedding commitment"
          : commitment.kind === "personal"
            ? "Personal block"
            : commitment.kind === "travel"
              ? "Travel"
              : "Hold",
      who: project ? clientName(db, project.client_id) : "Studio",
      status: commitment.status,
      href: project ? `/admin/projects/${project.id}` : "/admin/releases",
    });
  }
  return rows.sort((a, b) => a.at.localeCompare(b.at));
}

export function attentionItems(db: Database): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const project of db.projects) {
    const name = clientName(db, project.client_id);
    const href = `/admin/projects/${project.id}`;
    if (project.kind === "wedding") {
      if (
        project.status === "inquiry_received" ||
        project.status === "availability_review"
      ) {
        items.push({
          projectId: project.id,
          clientName: name,
          label: "Wedding inquiry needs a studio review",
          href,
        });
      }
      continue;
    }
    if (!db.intake_responses.some((item) => item.project_id === project.id)) {
      items.push({
        projectId: project.id,
        clientName: name,
        label: "Intake missing",
        href,
      });
    }
    if (
      !db.assets.some(
        (item) => item.project_id === project.id && item.kind === "current_hair",
      )
    ) {
      items.push({
        projectId: project.id,
        clientName: name,
        label: "Current-hair photo missing",
        href,
      });
    }
    const proposal = db.proposals
      .filter((item) => item.project_id === project.id)
      .sort((a, b) => b.version - a.version)[0];
    if (proposal && !proposal.approved_at) {
      items.push({
        projectId: project.id,
        clientName: name,
        label: `Proposal v${proposal.version} waiting on approval`,
        href,
      });
    }
    const consult = db.consultations.find((item) => item.project_id === project.id);
    if (consult) {
      items.push({
        projectId: project.id,
        clientName: name,
        label:
          consult.status === "included_unscheduled"
            ? "Consultation included, not scheduled"
            : `Consultation ${consult.status}`,
        href,
      });
    }
    const rec = reconcileProject(db, project.id);
    if (rec.duplicateDeposit) {
      items.push({
        projectId: project.id,
        clientName: name,
        label: "Duplicate deposit",
        href,
      });
    } else if (rec.balanceToCollectCents != null && rec.balanceToCollectCents > 0) {
      items.push({
        projectId: project.id,
        clientName: name,
        label: "Balance still to collect in Boulevard",
        href,
      });
    }
    const appointment = db.appointments.find(
      (item) => item.project_id === project.id,
    );
    if (appointment && appointment.status !== "confirmed" && appointment.status !== "canceled") {
      items.push({
        projectId: project.id,
        clientName: name,
        label: `Appointment ${appointment.status.replaceAll("_", " ")}`,
        href,
      });
    }
  }
  return items;
}

export function exceptionQueue(db: Database): ExceptionItem[] {
  const items: ExceptionItem[] = [];
  for (const event of db.integration_events) {
    if (event.outcome === "confirmed" || event.outcome === "duplicate") continue;
    items.push({
      id: event.id,
      title: `${event.event_type} · ${event.outcome.replaceAll("_", " ")}`,
      detail: event.error ?? "Needs a human look.",
      href: event.project_id ? `/admin/projects/${event.project_id}` : null,
    });
  }
  for (const task of db.tasks.filter((item) => item.status === "open")) {
    items.push({
      id: task.id,
      title: task.kind.replaceAll("_", " "),
      detail: task.detail,
      href: task.project_id ? `/admin/projects/${task.project_id}` : null,
    });
  }
  for (const project of db.projects) {
    const rec = reconcileProject(db, project.id);
    if (rec.duplicateDeposit) {
      items.push({
        id: `dup-${project.id}`,
        title: "Duplicate deposit",
        detail: "More than one succeeded Stripe reservation deposit is on this project.",
        href: `/admin/projects/${project.id}`,
      });
    }
  }
  return items;
}
