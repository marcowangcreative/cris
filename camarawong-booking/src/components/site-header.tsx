import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="header">
      <Link className="wordmark" href="/">
        Camara Wong
      </Link>
      <nav className="nav" aria-label="Primary">
        <a href="/#collections">Collections</a>
        <Link href="/inquiry">Inquire</Link>
      </nav>
    </header>
  );
}
