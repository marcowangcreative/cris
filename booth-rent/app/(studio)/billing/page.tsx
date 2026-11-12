import { BillingRun } from "@/components/billing-run";
import { snapshotFromInvoice } from "@/lib/billing/calculate";
import { requireSalon } from "@/lib/auth";
import { priorWeekRange } from "@/lib/dates";
import { loadDemoState } from "@/lib/demo/store";

export const metadata = { title: "Billing run" };

export default async function BillingPage() {
  const context = await requireSalon();
  const [stylists, invoices] = await Promise.all([
    context.repo.listStylists(context.salon.id),
    context.repo.listInvoices(context.salon.id),
  ]);
  const week = priorWeekRange();
  const suggested = context.demo ? loadDemoState().suggestedRevenue : {};

  return (
    <BillingRun
      stylists={stylists.filter((stylist) => stylist.active)}
      history={invoices.map(snapshotFromInvoice)}
      initialWeekStart={week.start}
      initialRevenue={suggested}
    />
  );
}
