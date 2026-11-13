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
      <article className="mx-auto w-full max-w-3xl px-6 py-10">
        <Kicker>Weddings & Bridal</Kicker>
        <h1 className="mt-4 font-serif text-5xl leading-tight md:text-6xl">
          Planned around the celebration.
        </h1>
        <p className="mt-6 text-lg leading-8 text-ink-soft">{publicCopy.weddingIntro}</p>
        <p className="mt-4 text-sm leading-6 text-stone">{publicCopy.bridalPricing}</p>
        <div className="mt-10">
          <Flash error={query.error} />
        </div>
        <div className="mt-10">
          <WeddingForm />
        </div>
      </article>
    </SiteFrame>
  );
}
