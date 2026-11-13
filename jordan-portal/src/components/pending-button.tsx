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
      className="inline-flex items-center justify-center bg-garden px-6 py-3 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-paper transition hover:bg-ink disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
