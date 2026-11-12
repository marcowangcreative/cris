import Link from "next/link";
import { getOwnerContext } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { Wordmark } from "@/components/wordmark";

export default async function HomePage() {
  const context = await getOwnerContext();
  const demo = isDemoMode();
  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <Wordmark />
      <p className="mt-10 text-xs uppercase tracking-[0.18em] text-ink-soft">For booth-rent salons</p>
      <h1 className="mt-3 font-display text-5xl italic leading-[0.95] sm:text-6xl">
        Collect chair rent without the awkward text.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-ink-soft">
        Each salon owner signs in, keeps their own stylists, and runs the week: net service revenue in, ACH invoice
        out. Stylists pay themselves. Nothing is charged automatically.
      </p>
      <ul className="mt-8 space-y-3 text-sm">
        <li className="border-l-2 border-green pl-3">Flat weekly or monthly rent.</li>
        <li className="border-l-2 border-brass pl-3">Rent plus a percentage fee, with an optional monthly cap.</li>
        <li className="border-l-2 border-ink pl-3">A percent of the chair, or a weekly minimum — whichever is greater.</li>
      </ul>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        {context?.salon ? (
          <Link href="/dashboard" className="bg-ink px-4 py-2.5 text-sm text-paper">
            Open {context.salon.name}
          </Link>
        ) : demo ? (
          <form action="/api/demo/enter" method="post">
            <button type="submit" className="bg-ink px-4 py-2.5 text-sm text-paper">
              Open the demo salon
            </button>
          </form>
        ) : (
          <Link href="/login" className="bg-ink px-4 py-2.5 text-sm text-paper">
            Sign in
          </Link>
        )}
      </div>
    </main>
  );
}
