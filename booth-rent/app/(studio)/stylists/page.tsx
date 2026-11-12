import Link from "next/link";
import { StylistForm } from "@/components/stylist-form";
import { StatusPill } from "@/components/status-pill";
import { bankLabel, modelLabel, termsLabel } from "@/lib/billing/labels";
import { termsFromStylist } from "@/lib/billing/calculate";
import { requireSalon } from "@/lib/auth";

export const metadata = { title: "Stylists" };

export default async function StylistsPage() {
  const context = await requireSalon();
  const stylists = await context.repo.listStylists(context.salon.id);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Roster</p>
        <h1 className="mt-2 font-display text-4xl italic">Stylists</h1>
        <ul className="mt-6 divide-y divide-line border border-line bg-card">
          {stylists.map((stylist) => (
            <li key={stylist.id} className="px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <Link href={`/stylists/${stylist.id}`} className="font-medium underline decoration-line underline-offset-4">
                  {stylist.name}
                </Link>
                <StatusPill tone={stylist.paymentMethodStatus === "verified" ? "paid" : stylist.paymentMethodStatus === "pending" ? "processing" : "draft"}>
                  {bankLabel(stylist.paymentMethodStatus)}
                </StatusPill>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {modelLabel(stylist.billingModel)} · {termsLabel(termsFromStylist(stylist))}
                {stylist.active ? "" : " · archived"}
              </p>
            </li>
          ))}
          {stylists.length === 0 ? <li className="px-4 py-8 text-ink-soft">No stylists yet.</li> : null}
        </ul>
      </div>
      <StylistForm />
    </div>
  );
}
