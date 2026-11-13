import { DateTime } from "luxon";
import { newId } from "@/lib/ids";
import { getConfig, RULES } from "@/lib/rules";
import type {
  Appointment,
  Client,
  Database,
  IntegrationEvent,
  Project,
} from "@/lib/types";
import { canOfferTransformation } from "./availability";
import { isTenAmChicago } from "./time";
import { pushAudit, pushTask } from "./records";

export interface CalendlyPaymentPayload {
  external_id?: string | null;
  provider?: string | null;
  amount?: number | null;
  currency?: string | null;
  successful?: boolean | null;
}

export interface CalendlyWebhook {
  event: "invitee.created" | "invitee.canceled";
  created_at?: string;
  payload: {
    uri: string;
    email?: string;
    name?: string;
    rescheduled?: boolean;
    old_invitee?: string | null;
    scheduled_event?: {
      uri?: string;
      name?: string;
      start_time?: string;
      end_time?: string;
      location?: { location?: string | null } | null;
    };
    payment?: CalendlyPaymentPayload | null;
  };
}

export interface WebhookResult {
  ok: boolean;
  httpStatus: number;
  duplicate: boolean;
  confirmed: boolean;
  message: string;
  integrationEventId: string | null;
}

export function parseCalendlyWebhook(value: unknown): CalendlyWebhook | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.event !== "invitee.created" && record.event !== "invitee.canceled") {
    return null;
  }
  if (!record.payload || typeof record.payload !== "object") return null;
  const payload = record.payload as Record<string, unknown>;
  if (typeof payload.uri !== "string" || payload.uri.length < 8) return null;
  return value as CalendlyWebhook;
}

/** Calendly sends major units, so 600 is $600. */
export function paymentAmountCents(
  payment: CalendlyPaymentPayload | null | undefined,
): number | null {
  if (!payment || payment.amount == null || Number.isNaN(Number(payment.amount))) {
    return null;
  }
  return Math.round(Number(payment.amount) * 100);
}

export function processCalendlyEvent(
  db: Database,
  event: CalendlyWebhook,
  nowIso: string,
): WebhookResult {
  const dedupeKey = `calendly:${event.event}:${event.payload.uri}`;
  const existing = db.integration_events.find(
    (item) => item.dedupe_key === dedupeKey,
  );
  if (existing) {
    return {
      ok: true,
      httpStatus: 200,
      duplicate: true,
      confirmed: false,
      message: "Duplicate webhook ignored. No second deposit was recorded.",
      integrationEventId: existing.id,
    };
  }
  if (event.event === "invitee.canceled") {
    return handleCanceled(db, event, nowIso, dedupeKey);
  }
  return handleCreated(db, event, nowIso, dedupeKey);
}

function handleCanceled(
  db: Database,
  event: CalendlyWebhook,
  nowIso: string,
  dedupeKey: string,
): WebhookResult {
  const appointment = db.appointments.find(
    (item) => item.calendly_invitee_uri === event.payload.uri,
  );
  const project = appointment
    ? db.projects.find((item) => item.id === appointment.project_id)
    : undefined;
  if (appointment) {
    appointment.status = "canceled";
  }
  if (project) {
    project.status = "needs_review";
  }
  const kind = event.payload.rescheduled
    ? "reschedule_review"
    : "cancellation_review";
  if (appointment && project) {
    pushTask(db, {
      project_id: project.id,
      appointment_id: appointment.id,
      kind,
      detail: event.payload.rescheduled
        ? "Calendly reported a reschedule. Review the new time. No refund was issued. Refund terms are an open owner decision."
        : "Calendly reported a cancellation. Review the day. No refund was issued. Refund terms are an open owner decision.",
      created_at: nowIso,
    });
  }
  const integration = recordEvent(db, {
    dedupeKey,
    event,
    nowIso,
    outcome: appointment ? "flagged_for_review" : "unmatched_cancel",
    error: appointment
      ? null
      : "No appointment matched this canceled invitee.",
    projectId: project?.id ?? null,
    status: "processed",
  });
  pushAudit(db, {
    actor: "calendly",
    action: "calendly.invitee_canceled",
    entity: "appointment",
    entity_id: appointment?.id ?? integration.id,
    created_at: nowIso,
    metadata: { rescheduled: Boolean(event.payload.rescheduled) },
  });
  return {
    ok: true,
    httpStatus: 200,
    duplicate: false,
    confirmed: false,
    message: appointment
      ? "Cancellation flagged for review. The deposit was not refunded."
      : "Cancellation did not match a booking and was queued.",
    integrationEventId: integration.id,
  };
}

function handleCreated(
  db: Database,
  event: CalendlyWebhook,
  nowIso: string,
  dedupeKey: string,
): WebhookResult {
  const payload = event.payload;
  const email = (payload.email ?? "").trim().toLowerCase();
  const name = (payload.name ?? "").trim() || "New client";
  const start = payload.scheduled_event?.start_time ?? "";
  const end = payload.scheduled_event?.end_time || start;
  const eventUri = payload.scheduled_event?.uri ?? null;
  const location =
    payload.scheduled_event?.location?.location?.trim() || "Houston studio";
  const payment = payload.payment ?? null;
  const amount = paymentAmountCents(payment);
  const providerOk = !payment?.provider || payment.provider === "stripe";
  const paid =
    payment?.successful === true &&
    providerOk &&
    amount === RULES.depositCents;

  let client: Client | undefined;
  let project: Project | undefined;
  if (payload.rescheduled && payload.old_invitee) {
    const previous = db.appointments.find(
      (item) => item.calendly_invitee_uri === payload.old_invitee,
    );
    if (previous) {
      previous.status = "canceled";
      project = db.projects.find((item) => item.id === previous.project_id);
      client = db.clients.find((item) => item.id === previous.client_id);
    }
  }
  if (!client && email) {
    client = db.clients.find((item) => item.email.toLowerCase() === email);
  }
  if (!client) {
    client = {
      id: newId(),
      auth_user_id: null,
      email: email || `unknown+${newId()}@example.com`,
      full_name: name,
      phone: null,
      created_at: nowIso,
    };
    db.clients.push(client);
  } else if (name && client.full_name === "New client") {
    client.full_name = name;
  }

  if (!project) {
    project = {
      id: newId(),
      client_id: client.id,
      kind: "transformation",
      status: "payment_required",
      agreed_total_cents: null,
      total_approved_at: null,
      calendly_event_uri: eventUri,
      calendly_invitee_uri: payload.uri,
      stripe_reference: null,
      boulevard_client_ref: null,
      boulevard_order_ref: null,
      created_at: nowIso,
    };
    db.projects.push(project);
  } else {
    project.calendly_event_uri = eventUri;
    project.calendly_invitee_uri = payload.uri;
  }

  const appointmentId = newId();
  let status: Appointment["status"] = "pending_payment";
  let outcome = "payment_not_confirmed";
  let error: string | null = null;
  let confirmed = false;

  if (!paid) {
    error = unpaidReason(payment, amount, providerOk);
    status = "pending_payment";
    project.status = "payment_required";
    pushTask(db, {
      project_id: project.id,
      appointment_id: appointmentId,
      kind: "payment_review",
      detail: error,
      created_at: nowIso,
    });
    if (payment) {
      db.payments.push({
        id: newId(),
        project_id: project.id,
        type: "stripe_reservation_deposit",
        status: "failed",
        amount_cents: amount ?? 0,
        verification: "verified",
        external_ref: payment.external_id ?? null,
        calendly_invitee_uri: payload.uri,
        created_at: nowIso,
      });
    }
  } else {
    const ten = Boolean(start) && isTenAmChicago(start);
    const offer = ten
      ? canOfferTransformation(db, start, DateTime.fromISO(nowIso, { setZone: true }))
      : { ok: false as const, reason: "Start time is not 10:00 a.m. America/Chicago." };
    recordSucceededDeposit(db, project, payload.uri, payment, amount ?? 0, nowIso);
    if (!offer.ok) {
      status = "needs_review";
      project.status = "needs_review";
      outcome = "paid_needs_review";
      error = offer.reason;
      pushTask(db, {
        project_id: project.id,
        appointment_id: appointmentId,
        kind: "payment_review",
        detail: `Deposit was captured, but the day was not confirmed. ${offer.reason}`,
        created_at: nowIso,
      });
    } else if (payload.rescheduled) {
      status = "needs_review";
      project.status = "needs_review";
      outcome = "reschedule_needs_review";
      error = "Reschedule flagged for review. A second deposit was not recorded.";
      pushTask(db, {
        project_id: project.id,
        appointment_id: appointmentId,
        kind: "reschedule_review",
        detail: error,
        created_at: nowIso,
      });
    } else {
      status = "confirmed";
      project.status = "confirmed";
      outcome = "confirmed";
      confirmed = true;
    }
    if (!db.consultations.some((item) => item.project_id === project!.id)) {
      db.consultations.push({
        id: newId(),
        project_id: project.id,
        status: "included_unscheduled",
        provider: null,
        duration_minutes: getConfig().consultationDurationMinutes,
        fee_cents: 0,
        scheduled_at: null,
        meeting_url: null,
        created_at: nowIso,
      });
    }
  }

  const appointment: Appointment = {
    id: appointmentId,
    project_id: project.id,
    client_id: client.id,
    kind: "transformation",
    status,
    starts_at: start || nowIso,
    ends_at: end || start || nowIso,
    location,
    calendly_event_uri: eventUri,
    calendly_invitee_uri: payload.uri,
    created_at: nowIso,
  };
  db.appointments.push(appointment);

  const integration = recordEvent(db, {
    dedupeKey,
    event,
    nowIso,
    outcome,
    error,
    projectId: project.id,
    status: "processed",
  });
  pushAudit(db, {
    actor: "calendly",
    action: "calendly.invitee_created",
    entity: "appointment",
    entity_id: appointment.id,
    created_at: nowIso,
    metadata: { confirmed, outcome },
  });

  return {
    ok: true,
    httpStatus: 200,
    duplicate: false,
    confirmed,
    message: confirmed
      ? "Transformation confirmed with a single $600 deposit."
      : (error ?? "Booking was not confirmed."),
    integrationEventId: integration.id,
  };
}

function unpaidReason(
  payment: CalendlyPaymentPayload | null,
  amount: number | null,
  providerOk: boolean,
): string {
  if (!payment) return "Payment is missing. The booking is not confirmed.";
  if (payment.successful !== true) {
    return "Payment did not succeed. The booking is not confirmed.";
  }
  if (!providerOk) return "Payment provider is not Stripe. The booking is not confirmed.";
  if (amount !== RULES.depositCents) {
    return "Payment amount is not the $600 deposit. The booking is not confirmed.";
  }
  return "Payment could not be verified. The booking is not confirmed.";
}

function recordSucceededDeposit(
  db: Database,
  project: Project,
  inviteeUri: string,
  payment: CalendlyPaymentPayload | null,
  amountCents: number,
  nowIso: string,
): void {
  const already = db.payments.some(
    (item) =>
      item.type === "stripe_reservation_deposit" &&
      item.status === "succeeded" &&
      (item.calendly_invitee_uri === inviteeUri ||
        item.project_id === project.id),
  );
  if (already) return;
  const externalRef = payment?.external_id ?? null;
  db.payments.push({
    id: newId(),
    project_id: project.id,
    type: "stripe_reservation_deposit",
    status: "succeeded",
    amount_cents: amountCents,
    verification: "verified",
    external_ref: externalRef,
    calendly_invitee_uri: inviteeUri,
    created_at: nowIso,
  });
  if (externalRef) project.stripe_reference = externalRef;
}

function recordEvent(
  db: Database,
  input: {
    dedupeKey: string;
    event: CalendlyWebhook;
    nowIso: string;
    outcome: string;
    error: string | null;
    projectId: string | null;
    status: IntegrationEvent["status"];
  },
): IntegrationEvent {
  const row: IntegrationEvent = {
    id: newId(),
    dedupe_key: input.dedupeKey,
    source: "calendly",
    event_type: input.event.event,
    payload: input.event,
    status: input.status,
    outcome: input.outcome,
    error: input.error,
    project_id: input.projectId,
    created_at: input.nowIso,
  };
  db.integration_events.push(row);
  return row;
}
