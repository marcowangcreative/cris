import Link from "next/link";
import { ApothecaryFrame } from "@/components/apothecary/shell";

export const metadata = { title: "Inquiry received" };

export default function Received() {
  return (
    <ApothecaryFrame>
      <header className="rx-center">
        <h1 className="rx-display">Inquiry received</h1>
        <p className="rx-body" style={{ marginTop: "1rem" }}>
          The studio has a wedding project. The date is not reserved, and no
          message was sent.
        </p>
        <p className="rx-jost" style={{ marginTop: "1.5rem" }}>
          <Link href="/apothecary/login">Open the record</Link>
        </p>
      </header>
    </ApothecaryFrame>
  );
}
