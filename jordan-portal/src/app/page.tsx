import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { Kicker } from "@/components/ui";
import { publicCopy } from "@/lib/content";

export default function HomePage() {
  return (
    <SiteFrame>
      <section className="mx-auto flex min-h-[calc(100vh-8.5rem)] w-full max-w-6xl flex-col justify-end px-6 pb-16 pt-8">
        <Kicker>Houston</Kicker>
        <h1 className="mt-6 max-w-5xl font-serif text-[clamp(3.5rem,8vw,7.4rem)] leading-[0.92] tracking-tight">
          The day
          <br />
          is yours.
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-8 text-ink-soft">
          Private transformations, reserved one client at a time. Weddings and
          bridal, planned through a personal inquiry.
        </p>
        <div className="mt-16 grid gap-5 md:grid-cols-2">
          <Link
            href="/transformations"
            className="flex min-h-72 flex-col justify-between border border-line bg-card p-8 transition hover:border-ink"
          >
            <div>
              <Kicker>01</Kicker>
              <h2 className="mt-4 font-serif text-4xl leading-tight">
                Private Transformations
              </h2>
            </div>
            <p className="mt-8 max-w-sm text-ink-soft">
              Cut, color, and a finished style. Minimum investment {publicCopy.minimum}.
              One client each day, starting at 10:00 a.m.
            </p>
          </Link>
          <Link
            href="/weddings"
            className="flex min-h-72 flex-col justify-between border border-line bg-card p-8 transition hover:border-ink"
          >
            <div>
              <Kicker>02</Kicker>
              <h2 className="mt-4 font-serif text-4xl leading-tight">
                Weddings & Bridal
              </h2>
            </div>
            <p className="mt-8 max-w-sm text-ink-soft">
              Hair, makeup, or a full bridal journey, shaped in consultation.
              An inquiry does not reserve a date.
            </p>
          </Link>
        </div>
      </section>
    </SiteFrame>
  );
}
