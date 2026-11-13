import { Specimen } from "@/components/apothecary/frame";
import { ApothecaryFrame } from "@/components/apothecary/shell";
import { WeddingForm } from "@/components/wedding-form";
import { Flash } from "@/components/ui";
import { publicCopy } from "@/lib/content";

export const metadata = { title: "Weddings" };

export default async function ApothecaryWeddings({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <ApothecaryFrame>
      <header className="rx-center">
        <p className="rx-jost">No. 03</p>
        <h1 className="rx-display" style={{ marginTop: "0.4rem" }}>
          Weddings and bridal
        </h1>
        <p className="rx-body" style={{ marginTop: "1rem" }}>
          {publicCopy.weddingIntro}
        </p>
        <p className="rx-body rx-muted" style={{ marginTop: "0.8rem" }}>
          {publicCopy.bridalPricing}
        </p>
      </header>
      <div style={{ width: "min(28rem, 100%)", margin: "2rem auto 0" }}>
        <Specimen name="gown" />
      </div>
      <div style={{ marginTop: "2rem" }}>
        <Flash error={query.error} />
      </div>
      <div style={{ marginTop: "1.5rem" }}>
        <WeddingForm returnTo="/apothecary/weddings" />
      </div>
    </ApothecaryFrame>
  );
}
