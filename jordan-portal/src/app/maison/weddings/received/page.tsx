import { MaisonFrame } from "@/components/maison/shell";

export const metadata = { title: "Inquiry received" };

export default function MaisonReceived() {
  return (
    <MaisonFrame>
      <article className="maison-page">
        <p className="maison-kicker">Received</p>
        <h1>The studio has your note.</h1>
        <p>The date is not reserved, and no message was sent.</p>
      </article>
    </MaisonFrame>
  );
}
