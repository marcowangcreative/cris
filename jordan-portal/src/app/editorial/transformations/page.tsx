import Link from "next/link";
import { ReleaseBooking } from "@/components/editorial/release-booking";
import { ZineFrame } from "@/components/editorial/shell";
import { loadAvailability } from "@/lib/booking/load";
import { monthLabel } from "@/lib/domain/time";
import { readDemoDb } from "@/lib/demo/store";
import { publicCopy } from "@/lib/content";
import { formatUsd } from "@/lib/format";
import { getConfig, RULES } from "@/lib/rules";

export const metadata = { title: "The drop" };

export default async function EditorialTransformations() {
  const db = readDemoDb();
  const batch =
    db.release_batches.find((item) => item.status === "published") ??
    db.release_batches[0];
  const availability = await loadAvailability();
  const calendly = getConfig().calendlyTransformationUrl;
  const title = batch ? monthLabel(batch.target_year, batch.target_month) : "Release";
  return (
    <ZineFrame>
      <p className="zine-kicker">No. 01 — Private transformation</p>
      <h1 style={{ margin: "0.35rem 0 0", fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
        Cut, color, finish
      </h1>
      <p style={{ maxWidth: "36rem" }}>
        The minimum is {formatUsd(RULES.transformationMinimumCents)}. The reservation
        deposit is {formatUsd(RULES.depositCents)}, paid through Calendly, and it
        applies toward the total. One client each day, at 10:00 a.m. Central.
      </p>
      <div className="zine-film" aria-label="Before and after">
        <div className="zine-sprocket" />
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/before-1600.webp" alt="Close-up of brunette waves" />
          <figcaption className="zine-kicker">Before</figcaption>
        </figure>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/after-1600.webp" alt="Close-up of glossy straight hair" />
          <figcaption className="zine-kicker">After</figcaption>
        </figure>
        <div className="zine-sprocket" />
      </div>
      <figure className="zine-bleed">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-1600.webp" alt="Brunette hair lifted against a plain wall" />
        <p className="zine-note">the whole day, held</p>
      </figure>
      <section id="drop" className="zine-drop">
        <p className="zine-kicker">JW SS/27</p>
        <h1>{title.split(" ")[0]} Release</h1>
        <p className="zine-drop-count">— {availability.days.length} dates</p>
        <p className="zine-kicker">
          {availability.source === "mock" ? "Sample calendar" : "Live calendar"}
        </p>
        <ReleaseBooking
          days={availability.days}
          live={availability.source === "calendly"}
          eventUrl={calendly}
        />
        <p className="zine-kicker" style={{ marginTop: "1rem", letterSpacing: "0.06em", textTransform: "none" }}>
          {publicCopy.bookingTerms}
        </p>
        <p className="zine-kicker" style={{ marginTop: "0.8rem" }}>
          <Link href="/editorial/weddings">Weddings & Bridal — inquire</Link>
        </p>
      </section>
    </ZineFrame>
  );
}
