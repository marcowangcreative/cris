import { MaisonFrame } from "@/components/maison/shell";
import { WeddingForm } from "@/components/wedding-form";
import { Flash } from "@/components/ui";
import { publicCopy } from "@/lib/content";

export const metadata = { title: "Weddings" };

export default async function MaisonWeddings({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <MaisonFrame>
      <article className="maison-page">
        <p className="maison-kicker">Weddings & Bridal — inquire</p>
        <h1>For the day itself.</h1>
        <p>{publicCopy.weddingIntro}</p>
        <p>{publicCopy.bridalPricing}</p>
        <Flash error={query.error} />
        <WeddingForm returnTo="/maison/weddings" />
      </article>
    </MaisonFrame>
  );
}
