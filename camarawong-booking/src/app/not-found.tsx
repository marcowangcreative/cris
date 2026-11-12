import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="sheet">
        <p className="eyebrow">404</p>
        <h1>Not on the book.</h1>
        <p className="lede">That page is not part of the booking studio.</p>
        <div className="actions">
          <Link className="button" href="/">
            Back to collections
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
