"use client";

import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  pendingLabel = "Saving…",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center border border-ink bg-ink px-5 py-3 text-[0.68rem] font-light uppercase tracking-[0.2em] text-paper transition hover:bg-transparent hover:text-ink disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
