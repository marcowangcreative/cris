import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { Kicker } from "@/components/ui";

export const metadata = { title: "Inquiry received" };

export default function ReceivedPage() {
  return (
    <SiteFrame>
      <article className="mx-auto w-full max-w-3xl px-6 py-16">
        <div className="engraved bg-blush p-8 md:p-12">
          <Kicker>Inquiry received</Kicker>
          <h1 className="mt-3 font-serif text-6xl leading-[0.9]">We have your note.</h1>
          <p className="font-script text-4xl text-wine">the date stays open</p>
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
