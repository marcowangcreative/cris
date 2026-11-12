import Link from "next/link";
import { studio } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="footer">
      <p>
        {studio.brandName}
        <br />
        {studio.city} · a studio of {studio.photographer}
      </p>
      <p>
        <a href={studio.siteUrl}>camarawong.com</a>
        <br />
        <Link href="/admin">Staff desk</Link>
      </p>
    </footer>
  );
}
