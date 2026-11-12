import { notFound, redirect } from "next/navigation";
import { BookingWizard } from "@/components/booking-wizard";
import { firstBookableMonth, lastBookableMonth } from "@/lib/civil-date";
import { getPackage } from "@/lib/config";
import { paymentsAreSimulated } from "@/lib/demo-mode";
import { getStore } from "@/lib/store";
import { displayStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: Promise<{ packageId: string }> }) {
  return params.then(async ({ packageId }) => {
    const pkg = getPackage(packageId);
    return { title: pkg ? `Book ${pkg.name}` : "Book" };
  });
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ packageId: string }>;
  searchParams: Promise<{ booking?: string; step?: string }>;
}) {
  const [{ packageId }, query] = await Promise.all([params, searchParams]);
  const pkg = getPackage(packageId);
  if (!pkg) notFound();

  const now = new Date();
  const stored = query.booking ? await getStore().getBooking(query.booking) : null;
  const booking = stored && stored.packageId === pkg.id ? { ...stored, displayStatus: displayStatus(stored, now) } : null;
  if (booking?.displayStatus === "paid") redirect(`/confirmation/${booking.id}`);

  return (
    <BookingWizard
      pkg={pkg}
      initialBooking={booking}
      requestedStep={query.step}
      minMonth={firstBookableMonth(now)}
      maxMonth={lastBookableMonth(now)}
      paymentsSimulated={paymentsAreSimulated()}
    />
  );
}
