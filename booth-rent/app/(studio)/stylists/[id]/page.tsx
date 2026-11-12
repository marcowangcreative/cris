import Link from "next/link";
import { notFound } from "next/navigation";
import { SetupLinkButton } from "@/components/setup-link";
import { StatusPill } from "@/components/status-pill";
import { StylistForm } from "@/components/stylist-form";
import { bankLabel, statusLabel } from "@/lib/billing/labels";
import { requireSalon } from "@/lib/auth";
import { formatWeekLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Stylist" };

export default async function StylistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bank?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const context = await requireSalon();
  const stylist = await context.repo.getStylist(context.salon.id, id);
  if (!stylist) notFound();
  const invoices = (await context.repo.listInvoices(context.salon.id)).filter(
    (invoice) => invoice.stylistId === stylist.id,
  );

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
          <Link href="/stylists" className="underline">
            Stylists
          </Link>
        </p>
        <h1 className="mt-2 font-display text-4xl italic">{stylist.name}</h1>
        <p className="mt-2 text-ink-soft">{stylist.email}</p>
        <div className="mt-4">
          <StatusPill tone={stylist.paymentMethodStatus === "verified" ? "paid" : "processing"}>
            {bankLabel(stylist.paymentMethodStatus)}
          </StatusPill>
        </div>
        {query.bank === "linked" ? (
          <p className="mt-4 text-sm text-green-deep">Bank marked as linked in the demo.</p>
        ) : null}
        <div className="mt-8 border border-line bg-card p-5">
          <h2 className="font-display text-2xl">Bank setup</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Send a Stripe setup link so the stylist can connect a US bank account. They can also add the bank when
            they open their first invoice. Either way, Booth Rent never charges them automatically.
          </p>
          <div className="mt-4">
            <SetupLinkButton stylistId={stylist.id} />
          </div>
        </div>
        <h2 className="mt-8 font-display text-2xl">Invoices</h2>
        <ul className="mt-3 divide-y divide-line border border-line bg-card">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>{formatWeekLabel(invoice.weekStart, invoice.weekEnd)}</span>
              <span className="flex items-center gap-3">
                <StatusPill tone={invoice.status}>{statusLabel(invoice.status)}</StatusPill>
                <span className="nums">{formatMoney(invoice.totalAmount)}</span>
              </span>
            </li>
          ))}
          {invoices.length === 0 ? <li className="px-4 py-6 text-sm text-ink-soft">No invoices yet.</li> : null}
        </ul>
      </div>
      <StylistForm initial={stylist} />
    </div>
  );
}
