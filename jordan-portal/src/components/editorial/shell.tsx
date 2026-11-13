import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/server/actions";
import { getConfig } from "@/lib/rules";
import { liveSupabaseConfigured } from "@/lib/supabase/server";

export function ZineHeader({
  trailing = { href: "/editorial/login", label: "Portal" },
}: {
  trailing?: { href: string; label: string } | "logout";
}) {
  return (
    <header className="zine-top">
      <p className="zine-kicker">JW SS/27</p>
      <nav className="zine-kicker" aria-label="Studio">
        <Link href="/editorial/transformations">Transformations</Link>
        <Link href="/editorial/weddings">Weddings</Link>
        {trailing === "logout" ? (
          <form action={logout} style={{ display: "inline" }}>
            <input type="hidden" name="next" value="/editorial" />
            <button type="submit" className="zine-kicker" style={{ border: 0, background: "none", padding: 0, cursor: "pointer" }}>
              Log out
            </button>
          </form>
        ) : (
          <Link href={trailing.href}>{trailing.label}</Link>
        )}
      </nav>
      <p className="zine-kicker">Houston, TX</p>
    </header>
  );
}

export function ZineFooter() {
  const demo = getConfig().demoMode;
  return (
    <footer className="zine-foot zine-kicker">
      <span>Jordan Wang</span>
      {demo ? (
        <span style={{ letterSpacing: "0.08em", textTransform: "none", fontSize: "13px" }}>
          Demo studio. Fictional clients. No live payments, calendars, or email.
          {liveSupabaseConfigured()
            ? " Supabase env vars are present, and this build still uses the local demo database."
            : " Supabase is not connected."}
        </span>
      ) : null}
      <span>
        <Link href="/">Atelier</Link>
        {" · "}
        <Link href="/apothecary">Apothecary</Link>
      </span>
    </footer>
  );
}

export function ZineFrame({ children }: { children: ReactNode }) {
  return (
    <div className="zine">
      <div className="zine-sheet">
        <ZineHeader />
        <main id="content">{children}</main>
        <ZineFooter />
      </div>
    </div>
  );
}
