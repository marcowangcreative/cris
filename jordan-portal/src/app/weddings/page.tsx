import { Photo } from "@/components/collage";
import { SiteFrame } from "@/components/site-frame";
import { Flash } from "@/components/ui";
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
        <div className="grid items-end md:grid-cols-2">
          <div className="order-2 px-0 py-10 md:order-1 md:py-16 md:pr-12">
            <h1 className="text-[32px] leading-[1.15] tracking-[0.08em] md:text-[48px] md:tracking-[0.1em]">
              Weddings & Bridal
            </h1>
            <p className="mt-6 max-w-md text-[14px] leading-[20px]">{publicCopy.weddingIntro}</p>
          </div>
          <Photo name="gown" className="order-1 aspect-[4/5] md:order-2 md:aspect-auto md:min-h-[560px]" />
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
