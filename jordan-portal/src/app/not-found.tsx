import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="font-serif text-5xl">That page is not here.</h1>
      <Link href="/" className="mt-6 inline-block text-sm underline">
        Back to the studio
      </Link>
    </main>
  );
}
