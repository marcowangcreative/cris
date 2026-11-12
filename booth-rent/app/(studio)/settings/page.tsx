import { requireSalon } from "@/lib/auth";
import { stripeKeyMode } from "@/lib/stripe/client";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const context = await requireSalon();
  const query = await searchParams;
  const mode = context.demo ? "demo" : stripeKeyMode();

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Salon</p>
      <h1 className="mt-2 font-display text-4xl italic">Settings</h1>
      <p className="mt-3 text-sm text-ink-soft">Signed in as {context.user.email}.</p>

      <form action="/api/salon" method="post" className="mt-8 space-y-3 border border-line bg-card p-5">
        <label htmlFor="salon-name" className="block text-sm">
          Salon name
        </label>
        <input
          id="salon-name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={context.salon.name}
          className="w-full border border-line bg-paper px-3 py-2"
        />
        <button type="submit" className="bg-ink px-4 py-2.5 text-sm text-paper">
          Save name
        </button>
        {query.saved ? <p className="text-sm text-green-deep">Saved.</p> : null}
        {query.error ? <p className="text-sm text-clay">{query.error}</p> : null}
      </form>

      <section className="mt-8 border border-line bg-card p-5">
        <h2 className="font-display text-2xl">Stripe</h2>
        <p className="mt-2 text-sm">
          Key mode: <span className="font-medium">{mode}</span>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Invoices are created in the Stripe account whose secret key is configured for this app — the salon
          owner&apos;s own account. Use a sandbox or test key while you are trying the product.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Stripe Connect is the path to real multi-tenant payouts. Each salon would connect its own account, and
          Booth Rent would create customers and invoices on that account so money never shares one Stripe balance.
          The schema already has <span className="font-medium">salons.stripe_account_id</span>, and the call sites
          go through <span className="font-medium">connectRequestOptions</span>. That function does not pass a
          connected account yet.
        </p>
      </section>
    </div>
  );
}
