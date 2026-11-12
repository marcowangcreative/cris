import Link from "next/link";

export const metadata = { title: "Bank connected" };

export default function SetupSuccessPage() {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-display text-4xl italic">Bank setup received</h1>
      <p className="mt-4 text-ink-soft">
        Stripe has the bank details. You can close this tab. The salon will see the bank as linked after the webhook
        arrives — that can take a moment, and micro-deposits can take longer.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/" className="underline">
          Booth Rent
        </Link>
      </p>
    </main>
  );
}
