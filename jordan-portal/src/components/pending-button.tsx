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
      className="btn w-full disabled:opacity-50 sm:w-auto"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
