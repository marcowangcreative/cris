import Link from "next/link";
import { MaisonBooking } from "@/components/maison/booking";
import { MaisonFrame } from "@/components/maison/shell";
import { loadAvailability } from "@/lib/booking/load";
import { publicCopy } from "@/lib/content";
import { formatUsd } from "@/lib/format";
import { getConfig, RULES } from "@/lib/rules";

export const metadata = { title: "The day" };

export default async function MaisonTransformations() {
  const availability = await loadAvailability();
  return (
    <MaisonFrame>
      <article className="maison-page">
        <p className="maison-kicker">
          {availability.source === "mock" ? "Sample calendar" : "Live calendar"}
        </p>
        <h1>The open days</h1>
        <p>
          The minimum is {formatUsd(RULES.transformationMinimumCents)}. The deposit is{" "}
          {formatUsd(RULES.depositCents)}, paid through Calendly, and it applies toward
          the total. One client each day, at 10:00 a.m. Central.
        </p>
        <MaisonBooking
          days={availability.days}
          live={availability.source === "calendly"}
          eventUrl={getConfig().calendlyTransformationUrl}
        />
        <p className="maison-kicker" style={{ marginTop: "2rem" }}>
          {publicCopy.bookingTerms}
        </p>
        <p style={{ marginTop: "1.2rem" }}>
          <Link href="/maison/weddings">Weddings & Bridal — inquire</Link>
        </p>
      </article>
    </MaisonFrame>
  );
}
