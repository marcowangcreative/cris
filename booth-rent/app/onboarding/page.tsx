import { redirect } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { getOwnerContext } from "@/lib/auth";

export const metadata = { title: "Create your salon" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await getOwnerContext();
  if (!context) redirect("/login");
  if (context.salon) redirect("/dashboard");
  const query = await searchParams;

  return (
    <main id="main" className="mx-auto max-w-md px-6 py-16">
      <Wordmark href="/dashboard" />
      <h1 className="mt-10 font-display text-4xl italic">Name the salon</h1>
      <p className="mt-3 text-sm text-ink-soft">
        Signed in as {context.user.email}. This salon is the only one on this login for now.
      </p>
      <form action="/api/salon" method="post" className="mt-8 space-y-3">
        <label htmlFor="salon-name" className="block text-sm">
          Salon name
        </label>
        <input id="salon-name" name="name" required minLength={2} maxLength={80} className="w-full border border-line bg-card px-3 py-2" />
        <button type="submit" className="bg-ink px-4 py-2.5 text-sm text-paper">
          Create salon
        </button>
      </form>
      {query.error ? <p className="mt-4 text-sm text-clay">{query.error}</p> : null}
    </main>
  );
}
