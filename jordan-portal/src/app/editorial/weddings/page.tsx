import { ZineFrame } from "@/components/editorial/shell";
import { WeddingForm } from "@/components/wedding-form";
import { Flash } from "@/components/ui";
import { publicCopy } from "@/lib/content";

export const metadata = { title: "Weddings" };

export default async function EditorialWeddings({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <ZineFrame>
      <p className="zine-kicker">No. 03</p>
      <h1 style={{ margin: "0.35rem 0 0" }}>Weddings and bridal</h1>
      <div className="zine-columns" style={{ marginTop: "1rem" }}>
        <p>{publicCopy.weddingIntro}</p>
        <p>{publicCopy.bridalPricing}</p>
      </div>
      <figure className="zine-bleed">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/gown-1600.webp" alt="Bridal hair and a pale gown" />
        <p className="zine-note" style={{ color: "#d7261e" }}>
          inquire
        </p>
      </figure>
      <Flash error={query.error} />
      <WeddingForm returnTo="/editorial/weddings" />
    </ZineFrame>
  );
}
