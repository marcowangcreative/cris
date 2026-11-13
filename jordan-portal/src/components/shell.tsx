import Link from "next/link";
import { logout } from "@/server/actions";

const link =
  "text-[12px] uppercase tracking-[0.05em] text-black hover:opacity-60";

export function PublicHeader() {
  return (
    <header className="border-b border-[#e5e7eb] bg-white">
      <div className="grid grid-cols-3 items-center px-4 py-7 md:px-6">
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/transformations" className={link}>
            Transformations
          </Link>
          <Link href="/weddings" className={`${link} hidden sm:inline`}>
            Weddings
          </Link>
        </nav>
        <Link href="/" className="text-center text-[13px] uppercase tracking-[0.22em]">
          Jordan Wang
        </Link>
        <div className="text-right">
          <Link href="/login" className={link}>
            Portal
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PortalHeader({ name }: { name: string }) {
  return (
    <header className="border-b border-[#e5e7eb] bg-white">
      <div className="grid grid-cols-3 items-center px-4 py-7 md:px-6">
        <Link href="/portal" className={link}>
          Record
        </Link>
        <Link href="/" className="text-center text-[13px] uppercase tracking-[0.22em]">
          Jordan Wang
        </Link>
        <div className="flex items-center justify-end gap-4">
          <span className="hidden text-[12px] uppercase tracking-[0.05em] sm:inline">{name}</span>
          <form action={logout}>
            <button type="submit" className={link}>
              Log out
            </button>
          </form>
        </div>
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
    <header className="border-b border-[#e5e7eb] bg-white">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-6 md:px-6">
        <Link href="/admin" className="text-[13px] uppercase tracking-[0.22em]">
          Jordan Wang
        </Link>
        <nav className="hidden flex-wrap justify-center gap-x-4 md:flex">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={link}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-4">
          <a href="/api/admin/conflicts.ics" className={link}>
            Feed
          </a>
          <form action={logout}>
            <button type="submit" className={link}>
              Log out
            </button>
          </form>
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-[#e5e7eb] px-4 py-3 md:hidden">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className={link}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[#e5e7eb] px-4 py-10 md:px-6">
      <p className="text-[12px] uppercase tracking-[0.22em]">Jordan Wang</p>
      <p className="mt-3 text-[12px] uppercase tracking-[0.05em] text-[#6a6a6a]">
        Houston · America/Chicago · jordanwangco.com
      </p>
      <p className="mt-3 text-[12px] uppercase tracking-[0.05em] text-[#6a6a6a]">
        <Link href="/apothecary">Apothecary</Link>
        {" · "}
        <Link href="/editorial">Editorial</Link>
        {" · "}
        <Link href="/maison">Maison</Link>
      </p>
    </footer>
  );
}
