import { addDays, priorWeekRange } from "@/lib/dates";
import { DAYS_UNTIL_DUE } from "@/lib/billing/calculate";
import type { Invoice, Salon, Stylist } from "@/lib/domain";

export const DEMO_OWNER_ID = "00000000-0000-4000-8000-0000000000a1";
export const DEMO_SALON_ID = "00000000-0000-4000-8000-0000000000b1";

export const DEMO_STYLIST_IDS = {
  maya: "00000000-0000-4000-8000-000000000101",
  andre: "00000000-0000-4000-8000-000000000102",
  priya: "00000000-0000-4000-8000-000000000103",
  jonah: "00000000-0000-4000-8000-000000000104",
  sofia: "00000000-0000-4000-8000-000000000105",
} as const;

export type DemoState = {
  version: 1;
  anchorWeekStart: string;
  salon: Salon;
  stylists: Stylist[];
  invoices: Invoice[];
  suggestedRevenue: Record<string, number>;
};

export function buildDemoState(now: Date = new Date()): DemoState {
  const week = priorWeekRange(now);
  const previousEnd = addDays(week.start, -1);
  const previousStart = addDays(previousEnd, -6);
  const sentOn = addDays(previousEnd, 1);
  const dueOn = addDays(sentOn, DAYS_UNTIL_DUE);
  const historyEnd = capHistoryDate(week.end);
  const historyStart = historyEnd ? addDays(historyEnd, -6) : null;

  const salon: Salon = {
    id: DEMO_SALON_ID,
    ownerId: DEMO_OWNER_ID,
    name: "Lumen Room",
    stripeAccountId: null,
  };

  const stylists: Stylist[] = [
    stylist({
      id: DEMO_STYLIST_IDS.maya,
      name: "Maya Chen",
      email: "maya.chen@lumenroom.example",
      billingModel: "rent_plus_fee",
      weeklyRent: 600,
      feeRate: 0.075,
      serviceFeeMonthlyCap: 1000,
      paymentMethodStatus: "verified",
    }),
    stylist({
      id: DEMO_STYLIST_IDS.andre,
      name: "Andre Walsh",
      email: "andre.walsh@lumenroom.example",
      billingModel: "percent_rent",
      feeRate: 0.35,
      minimumRemit: 600,
      paymentMethodStatus: "pending",
    }),
    stylist({
      id: DEMO_STYLIST_IDS.priya,
      name: "Priya Shah",
      email: "priya.shah@lumenroom.example",
      billingModel: "flat_weekly",
      weeklyRent: 750,
      paymentMethodStatus: "verified",
    }),
    stylist({
      id: DEMO_STYLIST_IDS.jonah,
      name: "Jonah Ellis",
      email: "jonah.ellis@lumenroom.example",
      billingModel: "flat_monthly",
      monthlyRent: 2200,
      paymentMethodStatus: "verified",
    }),
    stylist({
      id: DEMO_STYLIST_IDS.sofia,
      name: "Sofia Alvarez",
      email: "sofia.alvarez@lumenroom.example",
      billingModel: "rent_plus_fee",
      weeklyRent: 500,
      feeRate: 0.1,
      serviceFeeMonthlyCap: null,
      paymentMethodStatus: "none",
    }),
  ];

  const invoices: Invoice[] = [
    invoice({
      id: "00000000-0000-4000-8000-000000000201",
      stylistId: DEMO_STYLIST_IDS.andre,
      weekStart: previousStart,
      weekEnd: previousEnd,
      netServiceRevenue: 2000,
      rentAmount: 0,
      serviceFeeRate: 0.35,
      serviceFeeAmount: 700,
      totalAmount: 700,
      billingModel: "percent_rent",
      status: "sent",
      dueOn,
      sentAt: `${sentOn}T15:00:00.000Z`,
    }),
    invoice({
      id: "00000000-0000-4000-8000-000000000202",
      stylistId: DEMO_STYLIST_IDS.priya,
      weekStart: previousStart,
      weekEnd: previousEnd,
      netServiceRevenue: 1800,
      rentAmount: 750,
      serviceFeeRate: 0,
      serviceFeeAmount: 0,
      totalAmount: 750,
      billingModel: "flat_weekly",
      status: "processing",
      dueOn,
      sentAt: `${sentOn}T15:00:00.000Z`,
    }),
    invoice({
      id: "00000000-0000-4000-8000-000000000203",
      stylistId: DEMO_STYLIST_IDS.maya,
      weekStart: week.start,
      weekEnd: week.end,
      netServiceRevenue: 12000,
      rentAmount: 600,
      serviceFeeRate: 0.075,
      serviceFeeAmount: 900,
      totalAmount: 1500,
      billingModel: "rent_plus_fee",
      capApplied: false,
      status: "failed",
      errorMessage: "ACH payment failed.",
      dueOn,
      sentAt: `${week.start}T15:00:00.000Z`,
    }),
  ];

  if (historyStart && historyEnd) {
    invoices.push(
      invoice({
        id: "00000000-0000-4000-8000-000000000204",
        stylistId: DEMO_STYLIST_IDS.maya,
        weekStart: historyStart,
        weekEnd: historyEnd,
        netServiceRevenue: 10666.67,
        rentAmount: 600,
        serviceFeeRate: 0.075,
        serviceFeeAmount: 800,
        totalAmount: 1400,
        billingModel: "rent_plus_fee",
        status: "paid",
        dueOn: addDays(historyEnd, DAYS_UNTIL_DUE),
        sentAt: `${addDays(historyEnd, 1)}T15:00:00.000Z`,
      }),
      invoice({
        id: "00000000-0000-4000-8000-000000000205",
        stylistId: DEMO_STYLIST_IDS.jonah,
        weekStart: historyStart,
        weekEnd: historyEnd,
        netServiceRevenue: 0,
        rentAmount: 2200,
        serviceFeeRate: 0,
        serviceFeeAmount: 0,
        totalAmount: 2200,
        billingModel: "flat_monthly",
        status: "paid",
        dueOn: addDays(historyEnd, DAYS_UNTIL_DUE),
        sentAt: `${addDays(historyEnd, 1)}T15:00:00.000Z`,
      }),
    );
  }

  return {
    version: 1,
    anchorWeekStart: week.start,
    salon,
    stylists,
    invoices,
    suggestedRevenue: {
      [DEMO_STYLIST_IDS.maya]: 4200,
      [DEMO_STYLIST_IDS.andre]: 1200,
      [DEMO_STYLIST_IDS.priya]: 3100,
      [DEMO_STYLIST_IDS.jonah]: 2800,
      [DEMO_STYLIST_IDS.sofia]: 1800,
    },
  };
}

/** An earlier date in the same month as weekEnd, used so the demo can show the cap. */
export function capHistoryDate(weekEnd: string): string | null {
  const monthStart = `${weekEnd.slice(0, 7)}-01`;
  if (monthStart >= weekEnd) return null;
  const weekBefore = addDays(weekEnd, -7);
  return weekBefore >= monthStart ? weekBefore : monthStart;
}

function stylist(partial: Partial<Stylist> & Pick<Stylist, "id" | "name" | "email" | "billingModel">): Stylist {
  return {
    salonId: DEMO_SALON_ID,
    active: true,
    weeklyRent: 0,
    monthlyRent: 0,
    feeRate: 0,
    serviceFeeMonthlyCap: null,
    minimumRemit: 0,
    stripeCustomerId: `cus_demo_${partial.id.slice(-4)}`,
    paymentMethodId: partial.paymentMethodStatus === "verified" ? `pm_demo_${partial.id.slice(-4)}` : null,
    paymentMethodStatus: "none",
    ...partial,
  };
}

function invoice(
  partial: Partial<Invoice> &
    Pick<
      Invoice,
      | "id"
      | "stylistId"
      | "weekStart"
      | "weekEnd"
      | "netServiceRevenue"
      | "rentAmount"
      | "serviceFeeRate"
      | "serviceFeeAmount"
      | "totalAmount"
      | "billingModel"
      | "status"
    >,
): Invoice {
  return {
    salonId: DEMO_SALON_ID,
    minimumApplied: false,
    capApplied: false,
    stripeInvoiceId: `in_demo_${partial.id.slice(-4)}`,
    stripeInvoiceUrl: `/demo/invoice/${partial.id}`,
    stripePaymentIntentId: `pi_demo_${partial.id.slice(-4)}`,
    errorMessage: null,
    dueOn: null,
    sentAt: null,
    createdAt: partial.sentAt ?? `${partial.weekEnd}T15:00:00.000Z`,
    ...partial,
  };
}
