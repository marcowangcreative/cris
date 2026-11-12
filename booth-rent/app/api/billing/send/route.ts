import { NextResponse } from "next/server";
import {
  DAYS_UNTIL_DUE,
  calculateCharge,
  isSendable,
  snapshotFromInvoice,
  termsFromStylist,
} from "@/lib/billing/calculate";
import { isDemoMode } from "@/lib/config";
import { addDays, formatWeekLabel, todayISO, weekRangeFromMonday } from "@/lib/dates";
import { isConflict } from "@/lib/data/types";
import type { Invoice } from "@/lib/domain";
import { errorMessage, requireApiSalon } from "@/lib/http";
import { createHostedAchInvoice, ensureStripeCustomer } from "@/lib/stripe/billing";
import { stripeSecret } from "@/lib/stripe/client";

type Entry = { stylistId?: unknown; netServiceRevenue?: unknown };

export async function POST(request: Request) {
  const gate = await requireApiSalon();
  if ("response" in gate) return gate.response;
  const { context } = gate;
  const body = (await request.json().catch(() => null)) as {
    weekStart?: unknown;
    entries?: unknown;
  } | null;
  const weekStart = String(body?.weekStart ?? "");
  const week = weekRangeFromMonday(weekStart);
  if (!week) {
    return NextResponse.json({ error: "Pick a week that starts on Monday." }, { status: 400 });
  }
  if (!Array.isArray(body?.entries)) {
    return NextResponse.json({ error: "Add at least one stylist entry." }, { status: 400 });
  }

  const [stylists, invoices] = await Promise.all([
    context.repo.listStylists(context.salon.id),
    context.repo.listInvoices(context.salon.id),
  ]);
  const history = invoices.map(snapshotFromInvoice);
  const results: {
    stylistId: string;
    ok: boolean;
    skipped: boolean;
    message: string;
    invoiceUrl: string | null;
  }[] = [];

  for (const entry of body.entries as Entry[]) {
    const stylistId = String(entry.stylistId ?? "");
    const stylist = stylists.find((row) => row.id === stylistId && row.active);
    if (!stylist) {
      results.push({
        stylistId,
        ok: false,
        skipped: false,
        message: "Stylist not found.",
        invoiceUrl: null,
      });
      continue;
    }
    const revenue = Number(entry.netServiceRevenue);
    if (!Number.isFinite(revenue) || revenue < 0) {
      results.push({
        stylistId,
        ok: false,
        skipped: false,
        message: "Net revenue must be a number zero or greater.",
        invoiceUrl: null,
      });
      continue;
    }

    const charge = calculateCharge({
      stylist: termsFromStylist(stylist),
      weekStart: week.start,
      weekEnd: week.end,
      netServiceRevenue: revenue,
      history,
    });
    if (!isSendable(charge)) {
      results.push({
        stylistId,
        ok: true,
        skipped: true,
        message: charge.note || charge.skipReason || "Nothing to send.",
        invoiceUrl: null,
      });
      continue;
    }

    if (!isDemoMode() && !stripeSecret()) {
      results.push({
        stylistId,
        ok: false,
        skipped: false,
        message: "Add STRIPE_SECRET_KEY to send invoices. The preview above is still accurate.",
        invoiceUrl: null,
      });
      continue;
    }

    let invoice: Invoice;
    try {
      invoice = await context.repo.insertInvoice({
        salonId: context.salon.id,
        stylistId: stylist.id,
        weekStart: week.start,
        weekEnd: week.end,
        netServiceRevenue: charge.netServiceRevenue,
        rentAmount: charge.rentAmount,
        serviceFeeRate: charge.serviceFeeRate,
        serviceFeeAmount: charge.serviceFeeAmount,
        totalAmount: charge.totalAmount,
        billingModel: charge.billingModel,
        minimumApplied: charge.minimumApplied,
        capApplied: charge.capApplied,
        stripeInvoiceId: null,
        stripeInvoiceUrl: null,
        stripePaymentIntentId: null,
        status: "draft",
        errorMessage: null,
        dueOn: null,
        sentAt: null,
      });
    } catch (error) {
      results.push({
        stylistId,
        ok: false,
        skipped: false,
        message: isConflict(error) ? "Already billed for this week." : errorMessage(error, "Could not save the invoice."),
        invoiceUrl: null,
      });
      continue;
    }

    try {
      const sentAt = new Date().toISOString();
      if (isDemoMode()) {
        const dueOn = addDays(todayISO(), DAYS_UNTIL_DUE);
        const url = `/demo/invoice/${invoice.id}`;
        await context.repo.updateInvoice(context.salon.id, invoice.id, {
          status: "sent",
          stripeInvoiceId: `in_demo_${invoice.id.slice(0, 8)}`,
          stripeInvoiceUrl: url,
          stripePaymentIntentId: `pi_demo_${invoice.id.slice(0, 8)}`,
          dueOn,
          sentAt,
          errorMessage: null,
        });
        history.push(snapshotFromInvoice({ ...invoice, status: "sent", serviceFeeAmount: charge.serviceFeeAmount }));
        results.push({
          stylistId,
          ok: true,
          skipped: false,
          message: `Demo invoice created for ${charge.totalAmount.toFixed(2)}. No bank was charged.`,
          invoiceUrl: url,
        });
        continue;
      }

      const customerId = await ensureStripeCustomer({
        salon: context.salon,
        stylistId: stylist.id,
        name: stylist.name,
        email: stylist.email,
        existingCustomerId: stylist.stripeCustomerId,
      });
      if (customerId !== stylist.stripeCustomerId) {
        await context.repo.setStylistStripe(context.salon.id, stylist.id, { stripeCustomerId: customerId });
        stylist.stripeCustomerId = customerId;
      }
      const hosted = await createHostedAchInvoice({
        salon: context.salon,
        customerId,
        boothInvoiceId: invoice.id,
        stylistId: stylist.id,
        weekStart: week.start,
        weekEnd: week.end,
        billingModel: charge.billingModel,
        description: `${context.salon.name} — chair rent, ${formatWeekLabel(week.start, week.end)}`,
        lineItems: charge.lineItems,
      });
      await context.repo.updateInvoice(context.salon.id, invoice.id, {
        status: "sent",
        stripeInvoiceId: hosted.stripeInvoiceId,
        stripeInvoiceUrl: hosted.hostedInvoiceUrl,
        stripePaymentIntentId: hosted.paymentIntentId,
        dueOn: hosted.dueOn ?? addDays(todayISO(), DAYS_UNTIL_DUE),
        sentAt,
        errorMessage: null,
      });
      history.push(
        snapshotFromInvoice({
          ...invoice,
          status: "sent",
          serviceFeeAmount: charge.serviceFeeAmount,
          billingModel: charge.billingModel,
        }),
      );
      results.push({
        stylistId,
        ok: true,
        skipped: false,
        message: "Hosted ACH invoice emailed. The stylist has 2 days to pay and will not be auto-charged.",
        invoiceUrl: hosted.hostedInvoiceUrl,
      });
    } catch (error) {
      const message = errorMessage(error, "Stripe could not send the invoice.");
      await context.repo
        .updateInvoice(context.salon.id, invoice.id, { status: "failed", errorMessage: message })
        .catch(() => undefined);
      results.push({ stylistId, ok: false, skipped: false, message, invoiceUrl: null });
    }
  }

  return NextResponse.json({ results });
}
