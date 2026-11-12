import Link from "next/link";

export const metadata = { title: "Bank setup canceled" };

export default function SetupCancelPage() {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-display text-4xl italic">Bank setup canceled</h1>
      <p className="mt-4 text-ink-soft">
        No bank was linked. Ask the salon for a fresh setup link, or add the bank when the next invoice arrives.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/" className="underline">
          Booth Rent
        </Link>
      </p>
    </main>
  );
}
