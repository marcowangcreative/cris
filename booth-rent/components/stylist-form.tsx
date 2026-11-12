"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BillingModel, Stylist } from "@/lib/domain";

type FormState = {
  name: string;
  email: string;
  billingModel: BillingModel;
  weeklyRent: string;
  monthlyRent: string;
  feePercent: string;
  capEnabled: boolean;
  cap: string;
  minimumRemit: string;
  active: boolean;
};

const MODELS: { value: BillingModel; label: string }[] = [
  { value: "flat_weekly", label: "Flat weekly rent" },
  { value: "flat_monthly", label: "Flat monthly rent" },
  { value: "rent_plus_fee", label: "Rent + percentage fee" },
  { value: "percent_rent", label: "% chair rent with a minimum" },
];

export function StylistForm({ initial }: { initial?: Stylist }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialForm(initial));
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setWarning(null);
    const payload = {
      name: form.name,
      email: form.email,
      active: form.active,
      billingModel: form.billingModel,
      weeklyRent: Number(form.weeklyRent || 0),
      monthlyRent: Number(form.monthlyRent || 0),
      feePercent: Number(form.feePercent || 0),
      serviceFeeMonthlyCap: form.capEnabled ? Number(form.cap || 0) : null,
      minimumRemit: Number(form.minimumRemit || 0),
    };
    const response = await fetch(initial ? `/api/stylists/${initial.id}` : "/api/stylists", {
      method: initial ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      warning?: string;
      stylist?: { id: string };
    } | null;
    setPending(false);
    if (!response.ok || !body?.stylist) {
      setError(body?.error ?? "Could not save the stylist.");
      return;
    }
    if (body.warning) setWarning(body.warning);
    router.refresh();
    if (!initial) router.push(`/stylists/${body.stylist.id}`);
  }

  const showWeekly = form.billingModel === "flat_weekly" || form.billingModel === "rent_plus_fee";
  const showMonthly = form.billingModel === "flat_monthly";
  const showFee = form.billingModel === "rent_plus_fee" || form.billingModel === "percent_rent";
  const showCap = form.billingModel === "rent_plus_fee";
  const showMinimum = form.billingModel === "percent_rent";

  return (
    <form onSubmit={onSubmit} className="space-y-4 border border-line bg-card p-5">
      <h2 className="font-display text-2xl">{initial ? "Billing terms" : "Add a stylist"}</h2>
      <Field label="Name" id="stylist-name">
        <input id="stylist-name" required value={form.name} onChange={(event) => set("name", event.target.value)} className={inputClass} />
      </Field>
      <Field label="Email" id="stylist-email">
        <input id="stylist-email" type="email" required value={form.email} onChange={(event) => set("email", event.target.value)} className={inputClass} />
      </Field>
      <Field label="Billing model" id="billing-model">
        <select
          id="billing-model"
          value={form.billingModel}
          onChange={(event) => set("billingModel", event.target.value as BillingModel)}
          className={inputClass}
        >
          {MODELS.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </Field>
      {showWeekly ? (
        <Field label="Weekly rent" id="weekly-rent">
          <input id="weekly-rent" inputMode="decimal" value={form.weeklyRent} onChange={(event) => set("weeklyRent", event.target.value)} className={inputClass} />
        </Field>
      ) : null}
      {showMonthly ? (
        <Field label="Monthly rent" id="monthly-rent">
          <input id="monthly-rent" inputMode="decimal" value={form.monthlyRent} onChange={(event) => set("monthlyRent", event.target.value)} className={inputClass} />
        </Field>
      ) : null}
      {showFee ? (
        <Field label="Percentage of net service revenue" id="fee-percent">
          <input id="fee-percent" inputMode="decimal" value={form.feePercent} onChange={(event) => set("feePercent", event.target.value)} className={inputClass} />
        </Field>
      ) : null}
      {showCap ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.capEnabled} onChange={(event) => set("capEnabled", event.target.checked)} />
            Cap the percentage fee each month
          </label>
          {form.capEnabled ? (
            <Field label="Monthly fee cap" id="fee-cap">
              <input id="fee-cap" inputMode="decimal" value={form.cap} onChange={(event) => set("cap", event.target.value)} className={inputClass} />
            </Field>
          ) : (
            <p className="text-sm text-ink-soft">No cap. The percentage is billed in full every week.</p>
          )}
        </div>
      ) : null}
      {showMinimum ? (
        <Field label="Weekly minimum" id="minimum-remit">
          <input id="minimum-remit" inputMode="decimal" value={form.minimumRemit} onChange={(event) => set("minimumRemit", event.target.value)} className={inputClass} />
        </Field>
      ) : null}
      {initial ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(event) => set("active", event.target.checked)} />
          Active on the weekly run
        </label>
      ) : null}
      <button type="submit" disabled={pending} className="bg-ink px-4 py-2.5 text-sm text-paper disabled:opacity-50">
        {pending ? "Saving…" : initial ? "Save terms" : "Add stylist"}
      </button>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      {warning ? <p className="text-sm text-brass">{warning}</p> : null}
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="mb-1 block text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full border border-line bg-paper px-3 py-2";

function initialForm(initial?: Stylist): FormState {
  if (!initial) {
    return {
      name: "",
      email: "",
      billingModel: "rent_plus_fee",
      weeklyRent: "600",
      monthlyRent: "2400",
      feePercent: "7.5",
      capEnabled: true,
      cap: "1000",
      minimumRemit: "600",
      active: true,
    };
  }
  return {
    name: initial.name,
    email: initial.email,
    billingModel: initial.billingModel,
    weeklyRent: String(initial.weeklyRent),
    monthlyRent: String(initial.monthlyRent),
    feePercent: String(Math.round(initial.feeRate * 10000) / 100),
    capEnabled: initial.serviceFeeMonthlyCap != null,
    cap: initial.serviceFeeMonthlyCap == null ? "1000" : String(initial.serviceFeeMonthlyCap),
    minimumRemit: String(initial.minimumRemit),
    active: initial.active,
  };
}
