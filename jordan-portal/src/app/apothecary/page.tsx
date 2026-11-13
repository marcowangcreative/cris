import Link from "next/link";
import { Catalogue } from "@/components/apothecary/catalogue";
import { LabelFrame, Ornament, Specimen } from "@/components/apothecary/frame";
import { ApothecaryFrame } from "@/components/apothecary/shell";

export const metadata = { title: "Apothecary" };

export default function ApothecaryHome() {
  return (
    <ApothecaryFrame>
      <section className="rx-center">
        <LabelFrame>
          <h1 className="rx-display">Jordan Wang</h1>
          <Ornament />
          <p className="rx-italic">Atelier of hair · Est. Houston</p>
        </LabelFrame>
        <p className="rx-body" style={{ marginTop: "1.5rem" }}>
          Private transformations, reserved one client at a time. Weddings and
          bridal, planned through a personal inquiry.
        </p>
        <div style={{ marginTop: "1.25rem" }}>
          <Link className="rx-button" href="/apothecary/transformations">
            Request a date
          </Link>
        </div>
      </section>
      <div className="rx-grid rx-grid-2" style={{ marginTop: "2.5rem" }}>
        <Specimen name="hero" />
        <Specimen name="salon" />
      </div>
      <Catalogue />
      <p className="rx-center rx-jost" style={{ marginTop: "1.25rem" }}>
        <Link href="/apothecary/transformations">The list and the ledger</Link>
      </p>
    </ApothecaryFrame>
  );
}
