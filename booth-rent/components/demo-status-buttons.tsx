"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DemoStatusButtons({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function mark(status: string) {
    setPending(status);
    setError(null);
    const response = await fetch(`/api/demo/invoices/${invoiceId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(null);
    if (!response.ok) {
      setError(body?.error ?? "Could not update the invoice.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {["processing", "paid", "failed"].map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => mark(status)}
          disabled={pending !== null}
          className="border border-line bg-card px-2 py-1 text-xs capitalize text-ink-soft hover:border-ink hover:text-ink disabled:opacity-50"
        >
          {pending === status ? "Updating…" : `Mark ${status}`}
        </button>
      ))}
      {error ? <span className="text-xs text-clay">{error}</span> : null}
    </div>
  );
}
