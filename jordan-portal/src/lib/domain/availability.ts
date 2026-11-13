import { DateTime } from "luxon";
import type {
  Appointment,
  Commitment,
  Database,
  ReleaseBatch,
  ReleaseChecklist,
} from "@/lib/types";
import { RULES } from "@/lib/rules";
import { DomainError } from "./errors";
import { pushAudit } from "./records";
import {
  chicagoDate,
  chicagoDayInterval,
  datesForWeekdays,
  intervalsOverlap,
  parseInstant,
} from "./time";

export type DateReason =
  | "open"
  | "existing_booking"
  | "unresolved_booking"
  | "commitment"
  | "not_published";

export interface DateEvaluation {
  date: string;
  available: boolean;
  reason: DateReason;
  detail: string;
}

export function appointmentOccupies(
  appointment: Appointment,
  isoDate: string,
): boolean {
  if (appointment.kind !== "transformation") return false;
  if (appointment.status === "canceled") return false;
  return chicagoDate(appointment.starts_at) === isoDate;
}

export function commitmentIsActive(commitment: Commitment, now: DateTime): boolean {
  if (!commitment.blocks_transformations) return false;
  if (commitment.status === "released") return false;
  if (commitment.status === "confirmed") return true;
  if (commitment.status === "hold") {
    if (!commitment.expires_at) return true;
    return parseInstant(commitment.expires_at) > now;
  }
  return false;
}

export function commitmentCoversDate(
  commitment: Commitment,
  isoDate: string,
  now: DateTime,
): boolean {
  if (!commitmentIsActive(commitment, now)) return false;
  const day = chicagoDayInterval(isoDate);
  const start = parseInstant(commitment.starts_at);
  const end = parseInstant(commitment.ends_at);
  return intervalsOverlap(day.start, day.end, start, end);
}

export function blockingCommitment(
  db: Database,
  isoDate: string,
  now: DateTime,
): Commitment | undefined {
  return db.commitments.find((commitment) =>
    commitmentCoversDate(commitment, isoDate, now),
  );
}

export function evaluateReleaseDates(
  db: Database,
  batchId: string,
  now: DateTime,
): DateEvaluation[] {
  const batch = db.release_batches.find((item) => item.id === batchId);
  if (!batch) throw new DomainError("Release batch not found.");
  const dates = datesForWeekdays(
    batch.target_year,
    batch.target_month,
    batch.weekdays,
  );
  return dates.map((date) => {
    if (batch.status !== "published") {
      const nested = classifyDate(db, date, now);
      return {
        ...nested,
        available: false,
        reason: nested.reason === "open" ? "not_published" : nested.reason,
        detail:
          nested.reason === "open"
            ? "Draft only. Publishing is manual, and this date is not open."
            : nested.detail,
      };
    }
    return classifyDate(db, date, now);
  });
}

function classifyDate(
  db: Database,
  date: string,
  now: DateTime,
): DateEvaluation {
  const appointment = db.appointments.find((item) =>
    appointmentOccupies(item, date),
  );
  if (appointment) {
    const unresolved = appointment.status !== "confirmed";
    return {
      date,
      available: false,
      reason: unresolved ? "unresolved_booking" : "existing_booking",
      detail: unresolved
        ? "An unconfirmed transformation record already sits on this day."
        : "A confirmed transformation already holds this day.",
    };
  }
  const commitment = blockingCommitment(db, date, now);
  if (commitment) {
    return {
      date,
      available: false,
      reason: "commitment",
      detail: "A wedding, hold, travel, or personal commitment covers this day.",
    };
  }
  return {
    date,
    available: true,
    reason: "open",
    detail: "Open for a 10:00 a.m. transformation.",
  };
}

export function canOfferTransformation(
  db: Database,
  startsAt: string,
  now: DateTime,
): { ok: true } | { ok: false; reason: string } {
  const date = chicagoDate(startsAt);
  const published = db.release_batches.filter((batch) => batch.status === "published");
  const listed = published.some((batch) =>
    datesForWeekdays(
      batch.target_year,
      batch.target_month,
      batch.weekdays,
    ).includes(date),
  );
  if (!listed) {
    return {
      ok: false,
      reason: "That date is not on a published release batch.",
    };
  }
  const evaluation = classifyDate(db, date, now);
  if (!evaluation.available) return { ok: false, reason: evaluation.detail };
  return { ok: true };
}

const emptyChecklist = (): ReleaseChecklist => ({
  weddings_reconciled: false,
  travel_reviewed: false,
  personal_blocks_reviewed: false,
  existing_bookings_reviewed: false,
});

export { emptyChecklist };

export function checklistComplete(checklist: ReleaseChecklist): boolean {
  return (
    checklist.weddings_reconciled &&
    checklist.travel_reviewed &&
    checklist.personal_blocks_reviewed &&
    checklist.existing_bookings_reviewed
  );
}

export function publishReleaseBatch(
  db: Database,
  batchId: string,
  checklist: ReleaseChecklist,
  nowIso: string,
  actor: string,
): ReleaseBatch {
  const batch = db.release_batches.find((item) => item.id === batchId);
  if (!batch) throw new DomainError("Release batch not found.");
  if (batch.weekdays.length !== RULES.weekdaysPerWeek) {
    throw new DomainError("Choose exactly three weekdays before publishing.");
  }
  if (!checklistComplete(checklist)) {
    throw new DomainError("Complete the pre-publish checklist first.");
  }
  const appointmentsBefore = JSON.stringify(db.appointments);
  batch.checklist = { ...checklist };
  batch.status = "published";
  batch.published_at = nowIso;
  if (!batch.release_at) batch.release_at = nowIso;
  if (JSON.stringify(db.appointments) !== appointmentsBefore) {
    throw new DomainError("Publishing must not change existing bookings.");
  }
  pushAudit(db, {
    actor,
    action: "release_batch.published",
    entity: "release_batch",
    entity_id: batch.id,
    created_at: nowIso,
    metadata: {
      target_year: batch.target_year,
      target_month: batch.target_month,
    },
  });
  return batch;
}
