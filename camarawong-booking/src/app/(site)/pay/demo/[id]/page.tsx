import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DemoPay } from "@/components/demo-pay";
import { formatMoney } from "@/lib/format";
import { getStore } from "@/lib/store";
import { displayStatus } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demo payment" };

export default async function DemoPayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (process.env.STRIPE_SECRET_KEY) redirect(`/confirmation/${id}`);
  const booking = await getStore().getBooking(id);
  if (!booking) notFound();
  const status = displayStatus(booking, new Date());
  if (status === "paid") redirect(`/confirmation/${booking.id}`);

  return (
    <main className="narrow">
      <p className="eyebrow">Demo payment</p>
      <h1>{formatMoney(booking.quote.dueNowCents)}</h1>
      {status === "pending_payment" ? (
        <DemoPay bookingId={booking.id} amount={formatMoney(booking.quote.dueNowCents)} packageName={booking.quote.packageName} />
      ) : (
        <div>
          <p className="lede">This reservation is not waiting on payment.</p>
          <Link className="button" href={`/book/${booking.packageId}`}>
            Start again
          </Link>
        </div>
      )}
    </main>
  );
}
