import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="font-serif text-6xl uppercase leading-[0.85]">That page is not here.</h1>
      <Link href="/" className="mt-6 inline-block text-[0.68rem] uppercase tracking-[0.18em] text-garden">
        Back to the studio
      </Link>
    </main>
  );
}
