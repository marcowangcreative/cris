import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { Kicker } from "@/components/ui";

export const metadata = { title: "Inquiry received" };

export default function ReceivedPage() {
  return (
    <SiteFrame>
      <article className="mx-auto w-full max-w-3xl px-6 py-16">
        <div className="max-w-xl border-t border-line pt-10">
          <Kicker>Inquiry received</Kicker>
          <h1 className="mt-4 font-serif text-6xl font-normal leading-[0.9]">We have your note.</h1>
          <p className="mt-6 max-w-xl leading-7 text-ink-soft">
            A wedding project is open. This inquiry does not reserve a date. The
            studio confirms availability, scope, and pricing later. This demo does
            not send email.
          </p>
          <Link href="/" className="mt-10 inline-block text-[0.68rem] uppercase tracking-[0.18em] text-garden">
            Back to the studio
          </Link>
        </div>
      </article>
    </SiteFrame>
  );
}
