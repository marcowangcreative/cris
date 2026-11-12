"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  previewBillingRun,
  termsFromStylist,
  type ChargeResult,
  type InvoiceSnapshot,
} from "@/lib/billing/calculate";
import { modelLabel, termsLabel } from "@/lib/billing/labels";
import { StatusPill } from "@/components/status-pill";
import { matchRevenueCsv } from "@/lib/csv";
import { addDays, formatWeekLabel, isISODate, weekContaining, weekRangeFromMonday } from "@/lib/dates";
import type { Stylist } from "@/lib/domain";
import { formatMoney } from "@/lib/format";

type SendResult = {
  stylistId: string;
  ok: boolean;
  skipped: boolean;
  message: string;
  invoiceUrl: string | null;
};

export function BillingRun({
  stylists,
  history,
  initialWeekStart,
  initialRevenue,
}: {
  stylists: Stylist[];
  history: InvoiceSnapshot[];
  initialWeekStart: string;
  initialRevenue: Record<string, number>;
}) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [revenue, setRevenue] = useState<Record<string, string>>(() =>
    Object.fromEntries(stylists.map((stylist) => [stylist.id, moneyInput(initialRevenue[stylist.id])])),
  );
  const [csvNote, setCsvNote] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SendResult[] | null>(null);

  const week = weekRangeFromMonday(weekStart) ?? { start: weekStart, end: addDays(weekStart, 6) };
  const preview = useMemo(
    () =>
      previewBillingRun({
        stylists: stylists.map(termsFromStylist),
        weekStart: week.start,
        weekEnd: week.end,
        revenueByStylist: Object.fromEntries(
          stylists.map((stylist) => [stylist.id, numberOrZero(revenue[stylist.id])]),
        ),
        history,
      }),
    [history, revenue, stylists, week.end, week.start],
  );

  function shift(days: number) {
    const next = addDays(week.start, days);
    const range = weekRangeFromMonday(next);
    if (range) setWeekStart(range.start);
  }

  async function onCsv(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const matched = matchRevenueCsv(text, stylists);
    if (matched.error) {
      setCsvNote(matched.error);
      return;
    }
    setRevenue((current) => {
      const next = { ...current };
      for (const [id, amount] of Object.entries(matched.revenue)) next[id] = moneyInput(amount);
      return next;
    });
    setCsvNote(
      matched.unmatched.length
        ? `Imported ${Object.keys(matched.revenue).length}. Unmatched: ${matched.unmatched.join(", ")}.`
        : `Imported revenue for ${Object.keys(matched.revenue).length} stylists.`,
    );
  }

  async function send() {
    setPending(true);
    setError(null);
    setResults(null);
    const response = await fetch("/api/billing/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        weekStart: week.start,
        entries: stylists.map((stylist) => ({
          stylistId: stylist.id,
          netServiceRevenue: numberOrZero(revenue[stylist.id]),
        })),
      }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string; results?: SendResult[] } | null;
    setPending(false);
    if (!response.ok || !body?.results) {
      setError(body?.error ?? "Could not send invoices.");
      return;
    }
    setResults(body.results);
    router.refresh();
  }

  return (
    <div data-testid="billing-run">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Weekly run</p>
        <h1 className="mt-2 font-display text-4xl italic leading-none sm:text-5xl">Bill the week</h1>
        <p className="mt-4 text-ink-soft">
          Enter each stylist&apos;s net service revenue from Boulevard: service sales minus discounts and refunds.
          Tips stay out. Preview the invoices, then send them. Stylists pay by ACH on a Stripe hosted page. They have
          2 days, and they are never auto-charged.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-y border-line py-4">
        <div>
          <label htmlFor="week-start" className="text-xs uppercase tracking-[0.14em] text-ink-soft">
            Week starting Monday
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => shift(-7)} className="border border-ink px-3 py-2 text-sm">
              Previous
            </button>
            <input
              id="week-start"
              type="date"
              value={week.start}
              onChange={(event) => {
                if (isISODate(event.target.value)) setWeekStart(weekContaining(event.target.value).start);
              }}
              className="border border-line bg-card px-3 py-2"
            />
            <button type="button" onClick={() => shift(7)} className="border border-ink px-3 py-2 text-sm">
              Next
            </button>
          </div>
          <p className="mt-2 text-sm">{formatWeekLabel(week.start, week.end)}</p>
        </div>
        <div>
          <label htmlFor="revenue-csv" className="text-xs uppercase tracking-[0.14em] text-ink-soft">
            CSV import
          </label>
          <input
            id="revenue-csv"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => onCsv(event.target.files?.[0])}
            className="mt-2 block text-sm"
          />
          <a href="/sample-revenue.csv" className="mt-1 inline-block text-sm text-green-deep underline">
            Sample CSV
          </a>
        </div>
      </div>
      {csvNote ? <p className="mt-3 text-sm text-ink-soft">{csvNote}</p> : null}

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink text-left text-[0.7rem] uppercase tracking-[0.14em] text-ink-soft">
                <th className="px-4 py-3 font-medium">Stylist</th>
                <th className="px-3 py-3 font-medium">Net revenue</th>
                <th className="px-3 py-3 text-right font-medium">Rent</th>
                <th className="px-3 py-3 text-right font-medium">Fee</th>
                <th className="px-4 py-3 text-right font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {preview.charges.map((charge) => {
                const stylist = stylists.find((row) => row.id === charge.stylistId);
                if (!stylist) return null;
                return (
                  <tr key={charge.stylistId} className="border-b border-line align-top">
                    <td className="px-4 py-4">
                      <div className="font-medium">{stylist.name}</div>
                      <div className="mt-1 text-ink-soft">
                        {modelLabel(charge.billingModel)} · {termsLabel(termsFromStylist(stylist))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {chips(charge).map((chip) => (
                          <StatusPill key={chip.tone} tone={chip.tone}>
                            {chip.label}
                          </StatusPill>
                        ))}
                      </div>
                      <p className="mt-2 max-w-sm text-ink-soft">{charge.note}</p>
                    </td>
                    <td className="px-3 py-4">
                      <label className="sr-only" htmlFor={`rev-${stylist.id}`}>
                        Net service revenue for {stylist.name}
                      </label>
                      <span className="text-ink-soft">$</span>
                      <input
                        id={`rev-${stylist.id}`}
                        inputMode="decimal"
                        value={revenue[stylist.id] ?? ""}
                        onChange={(event) =>
                          setRevenue((current) => ({ ...current, [stylist.id]: event.target.value }))
                        }
                        className="ml-1 w-28 border border-line bg-paper px-2 py-1.5 nums"
                      />
                    </td>
                    <td className="px-3 py-4 text-right nums">{formatMoney(charge.rentAmount)}</td>
                    <td className="px-3 py-4 text-right nums">{formatMoney(charge.serviceFeeAmount)}</td>
                    <td className="px-4 py-4 text-right font-medium nums">{formatMoney(charge.totalAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {stylists.length === 0 ? (
            <p className="px-4 py-8 text-ink-soft">Add a stylist before running a week.</p>
          ) : null}
        </div>

        <aside className="border border-ink bg-card p-5 lg:sticky lg:top-24">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">To send</p>
          <p data-testid="billing-total" className="mt-2 font-display text-4xl nums leading-none">
            {formatMoney(preview.totalAmount)}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {preview.invoiceCount} {preview.invoiceCount === 1 ? "invoice" : "invoices"} · {preview.skippedCount} skipped
          </p>
          <button
            type="button"
            onClick={send}
            disabled={pending || preview.invoiceCount === 0}
            className="mt-5 w-full bg-ink px-4 py-3 text-sm text-paper disabled:opacity-40"
          >
            {pending ? "Sending…" : `Create & send ${preview.invoiceCount} ${preview.invoiceCount === 1 ? "invoice" : "invoices"}`}
          </button>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            The fee cap follows the month the week ends in. A failed invoice does not use the cap. ACH only — card is
            not offered.
          </p>
          {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
        </aside>
      </div>

      {results ? (
        <section className="mt-8 border border-line bg-card" aria-live="polite">
          <h2 className="border-b border-line px-4 py-3 font-display text-2xl">Send results</h2>
          <ul className="divide-y divide-line">
            {results.map((result) => {
              const stylist = stylists.find((row) => row.id === result.stylistId);
              return (
                <li key={result.stylistId} className="px-4 py-3 text-sm">
                  <span className="font-medium">{stylist?.name ?? "Stylist"}.</span> {result.message}{" "}
                  {result.invoiceUrl ? (
                    <a href={result.invoiceUrl} className="text-green-deep underline">
                      Open invoice
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function chips(charge: ChargeResult): { tone: string; label: string }[] {
  const items: { tone: string; label: string }[] = [];
  if (charge.capApplied) items.push({ tone: "cap", label: "Cap" });
  if (charge.minimumApplied) items.push({ tone: "minimum", label: "Minimum" });
  if (charge.retriedFailed) items.push({ tone: "retry", label: "Retry" });
  if (charge.skipped) items.push({ tone: "skip", label: "Skip" });
  return items;
}

function moneyInput(amount: number | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "";
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

function numberOrZero(value: string | undefined): number {
  if (!value || value.trim() === "") return 0;
  const parsed = Number(value.replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
