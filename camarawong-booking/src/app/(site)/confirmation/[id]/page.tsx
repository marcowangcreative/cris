import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDuration, formatLongDate, formatMoney, formatTimeRange, paymentSummary } from "@/lib/format";
import { getStore } from "@/lib/store";
import { displayStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await getStore().getBooking(id);
  if (!booking) notFound();
  const status = displayStatus(booking, new Date());
  const intake = booking.intake;

  if (status !== "paid") {
    return (
      <main className="sheet">
        <p className="eyebrow">{booking.quote.packageName}</p>
        <h1>{status === "expired" ? "This hold expired." : "Payment is still settling."}</h1>
        <p className="lede">
          {status === "expired"
            ? "The time was released. Choose another opening."
            : "If you just paid, refresh in a moment. The date is confirmed when this page says you’re booked."}
        </p>
        <div className="actions">
          <Link className="button" href={status === "expired" ? `/book/${booking.packageId}` : `/confirmation/${booking.id}`}>
            {status === "expired" ? "Choose another time" : "Refresh"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="sheet">
      <p className="eyebrow">Confirmed</p>
      <h1>You’re booked.</h1>
      <p className="lede">{intake?.eventName ?? booking.quote.packageName}</p>
      <dl className="facts">
        <dt>When</dt>
        <dd>
          {formatLongDate(booking.date)}
          <br />
          {formatTimeRange(booking.startTime, booking.quote.durationMinutes)} · {formatDuration(booking.quote.durationMinutes)}
        </dd>
        <dt>Where</dt>
        <dd>{intake?.venueAddress}</dd>
        <dt>Collection</dt>
        <dd>{booking.quote.packageName}</dd>
        <dt>Payment</dt>
        <dd>
          {paymentSummary(booking)}
          {booking.quote.balanceDueCents > 0 ? `. Balance ${formatMoney(booking.quote.balanceDueCents)} is due seven days before.` : ""}
        </dd>
        <dt>Gallery</dt>
        <dd>{intake?.galleryEmail}</dd>
        <dt>On site</dt>
        <dd>
          {intake?.onSiteContactName} · {intake?.onSiteContactPhone}
        </dd>
      </dl>
      <p>A note is on its way to {intake?.clientEmail}. In preview mode, that note is printed in the server log. You’ll also hear from us a week before, and the day before.</p>
      <div className="actions">
        <a className="button" href={`/api/bookings/${booking.id}/calendar`}>
          Add to calendar
        </a>
        <Link className="text-link" href="/">
          All collections
        </Link>
      </div>
    </main>
  );
}
