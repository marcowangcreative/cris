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
      className="inline-flex items-center justify-center bg-ink px-5 py-3 text-sm tracking-wide text-paper transition hover:bg-wine disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
