import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/server/actions";
import { getConfig } from "@/lib/rules";
import { liveSupabaseConfigured } from "@/lib/supabase/server";
import { LabelFrame } from "./frame";

const links = [
  ["/apothecary/transformations", "Transformations"],
  ["/apothecary/weddings", "Weddings"],
  ["/apothecary/login", "Portal"],
] as const;

export function ApothecaryHeader({
  portalHref = "/apothecary/login",
  portalLabel = "Portal",
  showLogout = false,
}: {
  portalHref?: string;
  portalLabel?: string;
  showLogout?: boolean;
}) {
  return (
    <header className="rx-header">
      <Link href="/apothecary" className="rx-mark" aria-label="Jordan Wang, home">
        <LabelFrame tight>
          <span>JW</span>
        </LabelFrame>
      </Link>
      <nav className="rx-nav" aria-label="Studio">
        <Link href={links[0][0]}>{links[0][1]}</Link>
        <Link href={links[1][0]}>{links[1][1]}</Link>
        {showLogout ? (
          <form action={logout}>
            <input type="hidden" name="next" value="/apothecary" />
            <button type="submit" className="rx-nav-button">
              {portalLabel}
            </button>
          </form>
        ) : (
          <Link href={portalHref}>{portalLabel}</Link>
        )}
      </nav>
    </header>
  );
}

export function ApothecaryFooter() {
  const demo = getConfig().demoMode;
  return (
    <footer className="rx-footer">
      <p className="rx-italic">Atelier of hair · Houston</p>
      <p className="rx-jost rx-muted" style={{ marginTop: "0.8rem" }}>
        America/Chicago · jordanwangco.com
      </p>
      {demo ? (
        <p className="rx-muted" style={{ marginTop: "0.9rem", fontSize: "1rem" }}>
          Demo studio. Fictional clients. No live payments, calendars, or email.
          {liveSupabaseConfigured()
            ? " Supabase env vars are present, and this build still uses the local demo database."
            : " Supabase is not connected."}
        </p>
      ) : null}
      <p className="rx-jost" style={{ marginTop: "1rem" }}>
        <Link href="/">Atelier</Link>
        {" · "}
        <Link href="/editorial">Editorial</Link>
      </p>
    </footer>
  );
}

export function ApothecaryFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rx">
      <ApothecaryHeader />
      <main id="content" className="rx-main">
        {children}
      </main>
      <ApothecaryFooter />
    </div>
  );
}
