import Link from "next/link";
import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import { loadDemoState } from "@/lib/demo/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connect a bank" };

export default async function DemoSetupPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isDemoMode()) notFound();
  const { id } = await params;
  const state = loadDemoState();
  const stylist = state.stylists.find((row) => row.id === id);
  if (!stylist) notFound();

  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-16">
      <p className="text-xs uppercase tracking-[0.16em] text-clay">Demo stand-in for Stripe Checkout</p>
      <h1 className="mt-3 font-display text-4xl italic">Connect a bank</h1>
      <p className="mt-4 text-ink-soft">
        {stylist.name}, this is where Stripe Checkout would link a US bank account with Plaid, or fall back to
        micro-deposits. No bank is contacted in the demo.
      </p>
      <form action={`/api/demo/stylists/${stylist.id}/bank`} method="post" className="mt-8">
        <button type="submit" className="bg-ink px-4 py-2.5 text-sm text-paper">
          Mark bank as linked
        </button>
      </form>
      <p className="mt-6 text-sm">
        <Link href={`/stylists/${stylist.id}`} className="underline">
          Back to {stylist.name}
        </Link>
      </p>
    </main>
  );
}
