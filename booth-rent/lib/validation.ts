import { BILLING_MODELS, type BillingModel } from "@/lib/domain";
import { roundMoney } from "@/lib/money";

export type StylistInput = {
  name: string;
  email: string;
  active: boolean;
  billingModel: BillingModel;
  weeklyRent: number;
  monthlyRent: number;
  feeRate: number;
  serviceFeeMonthlyCap: number | null;
  minimumRemit: number;
};

export function parseStylistInput(body: unknown): { ok: true; value: StylistInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Missing stylist details." };
  const record = body as Record<string, unknown>;
  const name = String(record.name ?? "").trim();
  const email = String(record.email ?? "").trim().toLowerCase();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Name should be between 2 and 80 characters." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const billingModel = String(record.billingModel ?? "");
  if (!BILLING_MODELS.includes(billingModel as BillingModel)) {
    return { ok: false, error: "Choose a billing model." };
  }
  const weeklyRent = moneyField(record.weeklyRent, "Weekly rent");
  const monthlyRent = moneyField(record.monthlyRent, "Monthly rent");
  const minimumRemit = moneyField(record.minimumRemit, "Weekly minimum");
  if (!weeklyRent.ok) return weeklyRent;
  if (!monthlyRent.ok) return monthlyRent;
  if (!minimumRemit.ok) return minimumRemit;

  const feePercent = Number(record.feePercent);
  if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
    return { ok: false, error: "Fee percent must be between 0 and 100." };
  }

  let cap: number | null = null;
  if (record.serviceFeeMonthlyCap !== null && record.serviceFeeMonthlyCap !== undefined && record.serviceFeeMonthlyCap !== "") {
    const parsedCap = moneyField(record.serviceFeeMonthlyCap, "Monthly fee cap");
    if (!parsedCap.ok) return parsedCap;
    cap = parsedCap.value;
  }

  return {
    ok: true,
    value: {
      name,
      email,
      active: record.active !== false,
      billingModel: billingModel as BillingModel,
      weeklyRent: weeklyRent.value,
      monthlyRent: monthlyRent.value,
      feeRate: Math.round((feePercent / 100) * 10000) / 10000,
      serviceFeeMonthlyCap: cap,
      minimumRemit: minimumRemit.value,
    },
  };
}

export function parseSalonName(value: unknown): { ok: true; name: string } | { ok: false; error: string } {
  const name = String(value ?? "").trim();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Salon name should be between 2 and 80 characters." };
  }
  return { ok: true, name };
}

function moneyField(
  value: unknown,
  label: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
    return { ok: false, error: `${label} must be a dollar amount from 0 to 1,000,000.` };
  }
  return { ok: true, value: roundMoney(amount) };
}
