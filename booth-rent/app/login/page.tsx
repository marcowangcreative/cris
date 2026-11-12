import Link from "next/link";
import { redirect } from "next/navigation";
import { MagicLinkForm } from "@/components/magic-link-form";
import { Wordmark } from "@/components/wordmark";
import { getOwnerContext } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await getOwnerContext();
  if (context?.salon) redirect("/dashboard");
  if (context && !context.salon) redirect("/onboarding");
  const query = await searchParams;
  const demo = isDemoMode();

  return (
    <main id="main" className="mx-auto max-w-md px-6 py-16">
      <Wordmark />
      <h1 className="mt-10 font-display text-4xl italic">Owner sign in</h1>
      <p className="mt-3 text-sm text-ink-soft">
        A magic link from Supabase Auth. Each owner only sees their own salon. There is no shared admin password.
      </p>
      {query.error === "link" ? (
        <p className="mt-4 text-sm text-clay">That sign-in link expired or was already used. Request another.</p>
      ) : null}
      <div className="mt-8">
        {demo ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">
              Supabase is not configured, so this server is in demo mode. The Lumen Room salon is fake and Stripe is
              not called.
            </p>
            <form action="/api/demo/enter" method="post">
              <button type="submit" className="bg-ink px-4 py-2.5 text-sm text-paper">
                Continue as the demo owner
              </button>
            </form>
          </div>
        ) : (
          <MagicLinkForm />
        )}
      </div>
      <p className="mt-8 text-sm">
        <Link href="/" className="text-ink-soft underline">
          Back
        </Link>
      </p>
    </main>
  );
}
