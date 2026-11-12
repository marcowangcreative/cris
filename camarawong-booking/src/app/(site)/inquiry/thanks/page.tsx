import Link from "next/link";

export const metadata = { title: "Inquiry received" };

export default function InquiryThanksPage() {
  return (
    <main className="sheet">
      <p className="eyebrow">Received</p>
      <h1>We have the note.</h1>
      <p className="lede">Someone from the studio will write back. The date is not held until a booking is signed and paid.</p>
      <div className="actions">
        <Link className="button" href="/">
          Back to collections
        </Link>
      </div>
    </main>
  );
}
