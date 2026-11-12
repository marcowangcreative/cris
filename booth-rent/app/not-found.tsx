import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-display text-4xl italic">Not found</h1>
      <p className="mt-4 text-ink-soft">That page is not in this salon.</p>
      <p className="mt-6">
        <Link href="/" className="underline">
          Home
        </Link>
      </p>
    </main>
  );
}
