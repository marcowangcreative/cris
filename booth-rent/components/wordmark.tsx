import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="font-display text-[1.7rem] leading-none tracking-tight">
      Booth Rent
    </Link>
  );
}
