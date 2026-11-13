import { Botanical, Crest, Squiggle } from "@/components/collage";
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
            <h1 className="mt-3 font-serif text-6xl leading-[0.9] md:text-7xl">
              Planned around the celebration.
            </h1>
            <p className="font-script text-4xl text-wine">an inquiry, not a date</p>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink-soft">{publicCopy.weddingIntro}</p>
            <Squiggle className="mt-4 h-6 w-28" />
          </div>
          <div className="relative">
            <div className="arch overflow-hidden border-2 border-ink bg-blush">
              <Botanical className="h-80 w-full" />
            </div>
            <Crest className="absolute -left-3 -top-3 h-16 w-16" />
          </div>
        </div>
        <p className="mt-10 max-w-2xl text-sm leading-6 text-stone">{publicCopy.bridalPricing}</p>
        <div className="mt-8">
          <Flash error={query.error} />
        </div>
        <div className="engraved mt-8 bg-card p-6 md:p-10">
          <WeddingForm />
        </div>
      </article>
    </SiteFrame>
  );
}
