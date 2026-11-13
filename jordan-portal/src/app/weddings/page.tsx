import { Portrait } from "@/components/collage";
import { SiteFrame } from "@/components/site-frame";
import { Flash, Kicker } from "@/components/ui";
import { WeddingForm } from "@/components/wedding-form";
import { publicCopy } from "@/lib/content";

export const metadata = { title: "Weddings & Bridal" };

export default async function WeddingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <SiteFrame>
      <article className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Kicker>Weddings & Bridal</Kicker>
            <h1 className="mt-4 font-serif text-6xl font-normal leading-[0.9] md:text-7xl">
              Planned around the celebration.
            </h1>
            <p className="mt-8 max-w-xl text-base font-light leading-7 text-ink-soft">{publicCopy.weddingIntro}</p>
          </div>
          <Portrait label="Portrait of Jordan here" />
        </div>
        <p className="mt-10 max-w-2xl text-sm leading-6 text-stone">{publicCopy.bridalPricing}</p>
        <div className="mt-8">
          <Flash error={query.error} />
        </div>
        <div className="mt-12 border-t border-line pt-12">
          <WeddingForm />
        </div>
      </article>
    </SiteFrame>
  );
}
