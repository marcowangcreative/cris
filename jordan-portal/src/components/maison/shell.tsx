import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/server/actions";
import { getConfig } from "@/lib/rules";
import { liveSupabaseConfigured } from "@/lib/supabase/server";

export function MaisonNav({
  trailing = { href: "/maison/login", label: "Record" },
}: {
  trailing?: { href: string; label: string } | "logout";
}) {
  return (
    <header className="maison-nav">
      <nav aria-label="Studio">
        <Link href="/maison/transformations">The day</Link>
        <Link href="/maison/weddings">Weddings</Link>
      </nav>
      <Link href="/maison" className="maison-mark" aria-label="Jordan Wang, home">
        jw
      </Link>
      {trailing === "logout" ? (
        <form action={logout}>
          <input type="hidden" name="next" value="/maison" />
          <button type="submit">Leave</button>
        </form>
      ) : (
        <Link href={trailing.href}>{trailing.label}</Link>
      )}
    </header>
  );
}

export function MaisonFooter() {
  const demo = getConfig().demoMode;
  return (
    <footer className="maison-foot">
      <p>Jordan Wang</p>
      {demo ? (
        <p>
          Demo studio. Fictional clients. No live payments, calendars, or email.
          {liveSupabaseConfigured()
            ? " Supabase env vars are present, and this build still uses the local demo database."
            : " Supabase is not connected."}
        </p>
      ) : null}
      <p>
        <Link href="/">Atelier</Link>
        {" · "}
        <Link href="/apothecary">Apothecary</Link>
        {" · "}
        <Link href="/editorial">Editorial</Link>
      </p>
    </footer>
  );
}

export function MaisonFrame({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: { href: string; label: string } | "logout";
}) {
  return (
    <div className="maison">
      <MaisonNav trailing={trailing} />
      <main id="content">{children}</main>
      <MaisonFooter />
    </div>
  );
}
