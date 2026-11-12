"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/dashboard", "Who owes"],
  ["/billing", "Billing run"],
  ["/stylists", "Stylists"],
  ["/settings", "Settings"],
] as const;

export function StudioNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Salon" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {LINKS.map(([href, label]) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "text-ink underline decoration-green decoration-2 underline-offset-[6px]"
                : "text-ink-soft hover:text-ink"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
