import Link from "next/link";
import { logout } from "@/server/actions";
import { Crest } from "./collage";

const navLink =
  "text-[0.62rem] font-light uppercase tracking-[0.22em] text-ink hover:text-garden";

export function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 border-b border-line px-6 py-5">
      <Link href="/" className="flex items-center gap-3">
        <Crest className="h-9 w-9" />
        <span className="font-serif text-xl font-normal tracking-tight">Jordan Wang</span>
      </Link>
      <nav className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2">
        <Link href="/transformations" className={navLink}>
          Transformations
        </Link>
        <Link href="/weddings" className={navLink}>
          Weddings
        </Link>
        <Link href="/login" className={navLink}>
          Portal
        </Link>
      </nav>
    </header>
  );
}

export function PortalHeader({ name }: { name: string }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-b border-line px-6 py-5">
      <div>
        <Link href="/portal" className="font-serif text-xl font-normal tracking-tight">
          Jordan Wang
        </Link>
        <p className="mt-1 text-[0.62rem] uppercase tracking-[0.22em] text-stone">
          Private client record
        </p>
      </div>
      <div className="flex items-center gap-5">
        <span className="text-[0.62rem] uppercase tracking-[0.18em] text-stone">{name}</span>
        <form action={logout}>
          <button type="submit" className={navLink}>
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}

export function AdminHeader() {
  const links = [
    ["/admin", "Schedule"],
    ["/admin/releases", "Releases"],
    ["/admin/weddings", "Weddings"],
    ["/admin/exceptions", "Exceptions"],
  ] as const;
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/admin" className="flex items-center gap-3">
          <Crest className="h-8 w-8" />
          <span>
            <span className="font-serif text-lg font-normal tracking-tight">Jordan Wang</span>
            <span className="mt-0.5 block text-[0.62rem] uppercase tracking-[0.22em] text-stone">
              Studio desk
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={navLink}>
              {label}
            </Link>
          ))}
          <a href="/api/admin/conflicts.ics" className={navLink}>
            Conflict feed
          </a>
          <form action={logout}>
            <button type="submit" className={navLink}>
              Log out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 border-t border-line px-6 py-8">
      <p className="font-serif text-lg font-normal">Jordan Wang</p>
      <p className="text-[0.62rem] uppercase tracking-[0.18em] text-stone">
        Houston · America/Chicago · jordanwangco.com
      </p>
    </footer>
  );
}
