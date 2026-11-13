import type { Reconciliation } from "@/lib/domain/money";
import { formatUsd } from "@/lib/format";
import { PendingButton } from "./pending-button";

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.68rem] uppercase tracking-[0.22em] text-garden">
      {children}
    </p>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const tones = {
    neutral: "bg-paper-deep text-ink",
    good: "bg-[#dceee4] text-good",
    warn: "bg-butter text-ink",
    bad: "bg-blush text-bad",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Flash({
  error,
  saved,
}: {
  error?: string;
  saved?: string;
}) {
  if (error) {
    return (
      <p role="alert" className="border border-[#e4c4c0] bg-[#f8e6e4] px-4 py-3 text-sm text-bad">
        {error}
      </p>
    );
  }
  if (saved) {
    return (
      <p className="border border-[#c9e2d4] bg-[#e7f3ec] px-4 py-3 text-sm text-good">
        Saved.
      </p>
    );
  }
  return null;
}

export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="engraved bg-card px-6 py-5 text-sm leading-6 text-ink-soft">
      <p className="mb-2 text-[0.68rem] uppercase tracking-[0.2em] text-wine">
        Placeholder · owner decision open
      </p>
      {children}
    </div>
  );
}

export function BalanceMath({
  rec,
  approved,
}: {
  rec: Reconciliation;
  approved: boolean;
}) {
  return (
    <div className="space-y-2">
      {rec.duplicateDeposit ? (
        <p role="alert" className="border border-[#e4c4c0] bg-[#f8e6e4] px-4 py-3 text-sm text-bad">
          Duplicate deposit flagged. Stop and resolve it before Boulevard checkout.
        </p>
      ) : null}
      <p className="font-serif text-3xl text-ink">
        {rec.agreedTotalCents == null
          ? "Agreed total not set"
          : formatUsd(rec.agreedTotalCents)}
      </p>
      <p className="text-sm text-ink-soft">
        {rec.agreedTotalCents == null
          ? "No agreed service total yet."
          : approved
            ? "Agreed service total."
            : "Proposed service total, not yet approved."}
      </p>
      <p className="text-sm">
        − {formatUsd(rec.depositCents)} {rec.externalPaymentType}
        {rec.hasVerified ? " · verified" : ""}
        {rec.hasManual ? " · manually entered" : ""}
        {rec.depositCount === 0 ? " · none recorded" : ""}
      </p>
      {rec.stripeReference ? (
        <p className="text-sm text-stone">Stripe reference {rec.stripeReference}</p>
      ) : null}
      <p className="text-sm">
        ={" "}
        {rec.balanceToCollectCents == null
          ? "Balance waits on an agreed total"
          : `${formatUsd(rec.balanceToCollectCents)} to collect in Boulevard`}
      </p>
      <p className="text-sm text-ink-soft">
        The deposit is an external payment, not a discount. Verified amounts came
        from Stripe through Calendly. Manually entered amounts are labeled.
      </p>
    </div>
  );
}

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  return <PendingButton pendingLabel={pendingLabel}>{children}</PendingButton>;
}
