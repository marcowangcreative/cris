"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="sheet">
      <p className="eyebrow">Camara Wong</p>
      <h1>Something slipped.</h1>
      <p className="lede">The page did not finish. Try it once more.</p>
      <div className="actions">
        <button className="button" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
