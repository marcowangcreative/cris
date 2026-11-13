import Link from "next/link";
import { ZineFrame } from "@/components/editorial/shell";

export const metadata = { title: "Inquiry received" };

export default function Received() {
  return (
    <ZineFrame>
      <h1>Inquiry received</h1>
      <p>The studio has a wedding project. The date is not reserved, and no message was sent.</p>
      <p className="zine-kicker">
        <Link href="/editorial/login">Open the record</Link>
      </p>
    </ZineFrame>
  );
}
