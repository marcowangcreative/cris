import { StudioNav } from "@/components/studio-nav";
import { Wordmark } from "@/components/wordmark";
import { requireSalon } from "@/lib/auth";
import { stripeKeyMode } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const context = await requireSalon();
  const live = !context.demo && stripeKeyMode() === "live";

  return (
    <div className="min-h-screen">
      {context.demo ? (
        <p className="bg-green-deep px-5 py-2 text-center text-sm text-paper">
          Demo salon. Lumen Room is sample data, and nothing is sent to Stripe.
        </p>
      ) : null}
      {live ? (
        <p className="bg-clay px-5 py-2 text-center text-sm text-paper">
          This server is using a live Stripe key. Invoices can move real money.
        </p>
      ) : null}
      <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex flex-wrap items-baseline gap-4">
            <Wordmark href="/dashboard" />
            <span className="text-sm text-ink-soft">{context.salon.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <StudioNav />
            <form action="/api/logout" method="post">
              <button type="submit" className="text-sm text-ink-soft hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-5 py-8">
        {children}
      </main>
    </div>
  );
}
