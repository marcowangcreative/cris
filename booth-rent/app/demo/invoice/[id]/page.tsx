import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoStatusButtons } from "@/components/demo-status-buttons";
import { StatusPill } from "@/components/status-pill";
import { statusLabel } from "@/lib/billing/labels";
import { isDemoMode } from "@/lib/config";
import { formatWeekLabel } from "@/lib/dates";
import { loadDemoState } from "@/lib/demo/store";
import type { Invoice } from "@/lib/domain";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demo invoice" };

export default async function DemoInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  if (!isDemoMode()) notFound();
  const { id } = await params;
  const state = loadDemoState();
  const invoice = state.invoices.find((row) => row.id === id);
  if (!invoice) notFound();
  const stylist = state.stylists.find((row) => row.id === invoice.stylistId);

  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-12">
      <p className="text-xs uppercase tracking-[0.16em] text-clay">Demo stand-in for a Stripe hosted invoice</p>
      <h1 className="mt-3 font-display text-4xl italic">{state.salon.name}</h1>
      <p className="mt-2 text-ink-soft">
        Chair rent for {stylist?.name ?? "stylist"}, {formatWeekLabel(invoice.weekStart, invoice.weekEnd)}.
      </p>
      <div className="mt-6 border border-ink bg-card">
        <ul className="divide-y divide-line">
          {lines(invoice).map((line) => (
            <li key={line.label} className="flex justify-between gap-4 px-4 py-3 text-sm">
              <span>{line.label}</span>
              <span className="nums">{formatMoney(line.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-ink px-4 py-4">
          <span className="font-medium">Due {invoice.dueOn ?? "in 2 days"}</span>
          <span className="font-display text-3xl nums">{formatMoney(invoice.totalAmount)}</span>
        </div>
      </div>
      <p className="mt-4 text-sm text-ink-soft">
        Pay by US bank account (ACH). This invoice is not auto-charged. In live mode, Stripe emails this page and
        collects the debit.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <StatusPill tone={invoice.status}>{statusLabel(invoice.status)}</StatusPill>
      </div>
      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">Simulate the webhook</p>
        <DemoStatusButtons invoiceId={invoice.id} />
      </div>
      <p className="mt-8 text-sm">
        <Link href="/billing" className="underline">
          Back to the billing run
        </Link>
      </p>
    </main>
  );
}

function lines(invoice: Invoice): { label: string; amount: number }[] {
  const rows: { label: string; amount: number }[] = [];
  if (invoice.rentAmount > 0) {
    rows.push({
      label: invoice.billingModel === "flat_monthly" ? "Monthly chair rent" : "Weekly chair rent",
      amount: invoice.rentAmount,
    });
  }
  if (invoice.serviceFeeAmount > 0) {
    rows.push({
      label:
        invoice.billingModel === "percent_rent"
          ? invoice.minimumApplied
            ? "Chair rent (weekly minimum applied)"
            : "Chair rent"
          : invoice.capApplied
            ? "Service fee (monthly cap applied)"
            : "Service fee",
      amount: invoice.serviceFeeAmount,
    });
  }
  return rows;
}
