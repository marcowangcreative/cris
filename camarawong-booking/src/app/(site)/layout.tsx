import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { paymentsAreSimulated } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {paymentsAreSimulated() ? (
        <p className="banner">Preview · card payments are simulated until Stripe is connected.</p>
      ) : null}
      <a className="skip" href="#content">
        Skip to content
      </a>
      <SiteHeader />
      <div id="content">{children}</div>
      <SiteFooter />
    </>
  );
}
