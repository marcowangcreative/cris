import Link from "next/link";
import { logout } from "@/server/actions";

export function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="font-serif text-xl tracking-tight">
        Jordan Wang
      </Link>
      <nav className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm text-ink-soft">
        <Link href="/transformations" className="hover:text-ink">
          Transformations
        </Link>
        <Link href="/weddings" className="hover:text-ink">
          Weddings
        </Link>
        <Link href="/login" className="hover:text-ink">
          Client portal
        </Link>
      </nav>
    </header>
  );
}

export function PortalHeader({ name }: { name: string }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6">
      <div>
        <Link href="/portal" className="font-serif text-xl">
          Jordan Wang
        </Link>
        <p className="text-xs uppercase tracking-[0.18em] text-stone">Client portal</p>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-ink-soft">{name}</span>
        <form action={logout}>
          <button type="submit" className="text-ink underline-offset-4 hover:underline">
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
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <Link href="/admin" className="font-serif text-xl">
            Jordan Wang
          </Link>
          <p className="text-xs uppercase tracking-[0.18em] text-stone">Studio</p>
        </div>
        <nav className="flex flex-wrap items-center gap-5 text-sm">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="text-ink-soft hover:text-ink">
              {label}
            </Link>
          ))}
          <a href="/api/admin/conflicts.ics" className="text-ink-soft hover:text-ink">
            Conflict feed
          </a>
          <form action={logout}>
            <button type="submit" className="text-ink underline-offset-4 hover:underline">
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
    <footer className="mx-auto w-full max-w-6xl px-6 py-12 text-sm text-stone">
      <p>Jordan Wang · Houston · America/Chicago</p>
      <p className="mt-1">jordanwangco.com · planned domain</p>
    </footer>
  );
}
