import { RULES } from "@/lib/rules";
import type { Database, Payment } from "@/lib/types";
import { DomainError } from "./errors";

export interface Reconciliation {
  agreedTotalCents: number | null;
  depositCents: number;
  depositCount: number;
  duplicateDeposit: boolean;
  stripeReference: string | null;
  hasVerified: boolean;
  hasManual: boolean;
  balanceToCollectCents: number | null;
  boulevardOrderRef: string | null;
  externalPaymentType: typeof RULES.externalDepositLabel;
  recordedAsDiscount: false;
  discountCents: 0;
  deposits: Payment[];
}

export function succeededDeposits(db: Database, projectId: string): Payment[] {
  return db.payments.filter(
    (payment) =>
      payment.project_id === projectId &&
      payment.type === RULES.externalDepositType &&
      payment.status === "succeeded",
  );
}

export function reconcileProject(
  db: Database,
  projectId: string,
): Reconciliation {
  const project = db.projects.find((item) => item.id === projectId);
  if (!project) throw new DomainError("Project not found.");
  const deposits = succeededDeposits(db, projectId);
  const depositCents = deposits.reduce(
    (sum, payment) => sum + payment.amount_cents,
    0,
  );
  return {
    agreedTotalCents: project.agreed_total_cents,
    depositCents,
    depositCount: deposits.length,
    duplicateDeposit: deposits.length > 1,
    stripeReference:
      deposits.find((payment) => payment.external_ref)?.external_ref ??
      project.stripe_reference,
    hasVerified: deposits.some((payment) => payment.verification === "verified"),
    hasManual: deposits.some((payment) => payment.verification === "manual"),
    balanceToCollectCents:
      project.agreed_total_cents == null
        ? null
        : project.agreed_total_cents - depositCents,
    boulevardOrderRef: project.boulevard_order_ref,
    externalPaymentType: RULES.externalDepositLabel,
    recordedAsDiscount: false,
    discountCents: 0,
    deposits,
  };
}

export function assertTransformationPrice(cents: number): void {
  if (
    !Number.isInteger(cents) ||
    cents < RULES.transformationMinimumCents
  ) {
    throw new DomainError(
      "A transformation total cannot be below the $1,200 minimum.",
    );
  }
}
