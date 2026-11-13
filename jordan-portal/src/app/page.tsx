import Link from "next/link";
import { Portrait } from "@/components/collage";
import { SiteFrame } from "@/components/site-frame";
import { publicCopy } from "@/lib/content";

export default function HomePage() {
  return (
    <SiteFrame>
      <section className="mx-auto grid w-full max-w-6xl items-start gap-12 px-6 py-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-20 md:py-16">
        <Portrait />
        <div className="flex min-h-full flex-col justify-between md:min-h-[70vh] md:py-2">
          <p className="text-[0.62rem] uppercase tracking-[0.28em] text-stone">Houston</p>
          <div>
            <h1 className="font-serif text-[clamp(4.2rem,7vw,6.6rem)] font-normal leading-[0.88] tracking-tight">
              Jordan Wang
            </h1>
            <p className="mt-8 max-w-md text-base font-light leading-7 text-ink-soft">
              Private transformations, reserved one client at a time. Weddings and
              bridal, planned through a personal inquiry.
            </p>
            <p className="mt-6 text-[0.68rem] uppercase tracking-[0.2em] text-stone">
              Minimum investment {publicCopy.minimum}
            </p>
          </div>
          <div className="mt-14 border-t border-line">
            <Link
              href="/transformations"
              className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 border-b border-line py-6"
            >
              <span className="text-[0.62rem] uppercase tracking-[0.2em] text-stone">01</span>
              <span>
                <span className="block font-serif text-3xl font-normal">Private Transformations</span>
                <span className="mt-2 block max-w-sm text-sm font-light leading-6 text-ink-soft">
                  Cut, color, and a finished style. One client each day, at 10:00 a.m.
                </span>
              </span>
              <span className="text-[0.62rem] uppercase tracking-[0.2em]">Enter</span>
            </Link>
            <Link
              href="/weddings"
              className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 border-b border-line py-6"
            >
              <span className="text-[0.62rem] uppercase tracking-[0.2em] text-stone">02</span>
              <span>
                <span className="block font-serif text-3xl font-normal">Weddings & Bridal</span>
                <span className="mt-2 block max-w-sm text-sm font-light leading-6 text-ink-soft">
                  Hair, makeup, or a full bridal journey. An inquiry does not reserve a date.
                </span>
              </span>
              <span className="text-[0.62rem] uppercase tracking-[0.2em]">Inquire</span>
            </Link>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
