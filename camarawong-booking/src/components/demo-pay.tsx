"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";

export function DemoPay({
  bookingId,
  amount,
  packageName,
}: {
  bookingId: string;
  amount: string;
  packageName: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function pay() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/payments/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "The demo payment did not complete.");
      window.location.href = `/confirmation/${bookingId}`;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The demo payment did not complete.");
      setPending(false);
    }
  }

  return (
    <div>
      <p className="lede">
        Stripe is not connected in this environment, so nothing is charged. This marks {packageName} paid for {amount}.
      </p>
      {error ? <p className="alert" role="alert">{error}</p> : null}
      <div className="actions">
        <button className="button" type="button" onClick={pay} disabled={pending}>
          {pending ? "Marking…" : "Mark as paid"}
        </button>
      </div>
    </div>
  );
}
