import Link from "next/link";
import { DemoStatusButtons } from "@/components/demo-status-buttons";
import { StatusPill } from "@/components/status-pill";
import { oweTotals, owesRows } from "@/lib/billing/owes";
import { statusLabel } from "@/lib/billing/labels";
import { requireSalon } from "@/lib/auth";
import { formatWeekLabel, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Who owes what" };

export default async function DashboardPage() {
  const context = await requireSalon();
  const [stylists, invoices] = await Promise.all([
    context.repo.listStylists(context.salon.id),
    context.repo.listInvoices(context.salon.id),
  ]);
  const today = todayISO();
  const rows = owesRows(invoices, stylists, today);
  const totals = oweTotals(rows);
  const recent = invoices.slice(0, 8);

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Collections</p>
      <h1 className="mt-2 font-display text-4xl italic sm:text-5xl">Who owes what</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Sent and failed invoices are still to collect. Processing means the ACH debit has started. Overdue means a
        sent invoice is past its 2-day due date.
      </p>

      <dl className="mt-8 grid gap-3 sm:grid-cols-4">
        <Tile label="To collect" value={formatMoney(totals.toCollect)} />
        <Tile label="Overdue" value={formatMoney(totals.overdue)} emphasis={totals.overdue > 0} />
        <Tile label="Failed" value={formatMoney(totals.failed)} />
        <Tile label="Processing" value={formatMoney(totals.processing)} />
      </dl>

      <div className="mt-8 overflow-x-auto border border-line bg-card">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-ink-soft">
            Nobody owes anything.{" "}
            <Link href="/billing" className="text-green-deep underline">
              Run a week
            </Link>{" "}
            when you have revenue.
          </p>
        ) : (
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink text-left text-[0.7rem] uppercase tracking-[0.14em] text-ink-soft">
                <th className="px-4 py-3 font-medium">Stylist</th>
                <th className="px-3 py-3 font-medium">Week</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Due</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const invoice = invoices.find((item) => item.id === row.invoiceId);
                return (
                  <tr key={row.invoiceId} className={`border-b border-line align-top ${row.overdue ? "bg-clay/10" : ""}`}>
                    <td className="px-4 py-4 font-medium">{row.stylistName}</td>
                    <td className="px-3 py-4">{formatWeekLabel(row.weekStart, row.weekEnd)}</td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone={row.status}>{statusLabel(row.status)}</StatusPill>
                        {row.overdue ? <StatusPill tone="overdue">Overdue</StatusPill> : null}
                      </div>
                      {invoice?.stripeInvoiceUrl ? (
                        <a href={invoice.stripeInvoiceUrl} className="mt-2 inline-block text-green-deep underline">
                          Open invoice
                        </a>
                      ) : null}
                      {context.demo && invoice ? <DemoStatusButtons invoiceId={invoice.id} /> : null}
                    </td>
                    <td className="px-3 py-4 nums">{row.dueOn ?? "—"}</td>
                    <td className="px-4 py-4 text-right nums">{formatMoney(row.totalAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Recent invoices</h2>
        <ul className="mt-3 divide-y divide-line border border-line bg-card">
          {recent.map((invoice) => {
            const stylist = stylists.find((row) => row.id === invoice.stylistId);
            return (
              <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  {stylist?.name ?? "Stylist"} · {formatWeekLabel(invoice.weekStart, invoice.weekEnd)}
                </span>
                <span className="flex items-center gap-3">
                  <StatusPill tone={invoice.status}>{statusLabel(invoice.status)}</StatusPill>
                  <span className="nums">{formatMoney(invoice.totalAmount)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`border bg-card px-4 py-3 ${emphasis ? "border-clay" : "border-line"}`}>
      <dt className="text-xs uppercase tracking-[0.14em] text-ink-soft">{label}</dt>
      <dd className={`mt-1 font-display text-2xl nums ${emphasis ? "text-clay" : ""}`}>{value}</dd>
    </div>
  );
}
