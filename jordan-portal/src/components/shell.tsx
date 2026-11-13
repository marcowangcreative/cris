import Link from "next/link";
import { logout } from "@/server/actions";
import { Crest, Wordmark } from "./collage";

const navLink =
  "text-[0.68rem] uppercase tracking-[0.2em] text-ink hover:text-wine";

export function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6">
      <Link href="/" className="flex items-center gap-3">
        <Crest className="h-11 w-11" />
        <Wordmark className="text-2xl md:text-3xl" />
      </Link>
      <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
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
    <header className="mx-auto flex w-full max-w-6xl items-end justify-between gap-4 px-6 py-7">
      <div>
        <Link href="/portal">
          <Wordmark className="text-3xl md:text-4xl" />
        </Link>
        <p className="font-script text-3xl text-wine">Your invitation</p>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-[0.68rem] uppercase tracking-[0.18em] text-stone">{name}</span>
        <form action={logout}>
          <button type="submit" className="text-[0.68rem] uppercase tracking-[0.18em] text-ink underline-offset-4 hover:underline">
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
    <header className="border-b border-garden/30 bg-card/80">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/admin" className="flex items-center gap-3">
          <Crest className="h-9 w-9" />
          <span>
            <Wordmark className="text-xl" />
            <span className="mt-1 block text-[0.62rem] uppercase tracking-[0.22em] text-garden">
              Studio desk
            </span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4">
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
    <footer className="mx-auto flex w-full max-w-6xl items-end justify-between gap-6 px-6 py-14">
      <div>
        <p className="font-serif text-2xl uppercase tracking-tight">Jordan Wang {"//"}</p>
        <p className="mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-stone">
          Houston · America/Chicago · jordanwangco.com
        </p>
      </div>
      <Crest className="h-14 w-14" />
    </footer>
  );
}
