import { NextResponse } from "next/server";
import { PaymentError } from "@/lib/errors";
import { jsonError, readJson } from "@/lib/http";
import { applyDemoPayment, fulfillIfPaid } from "@/lib/payments";
import { getStore } from "@/lib/store";
import { toPublic } from "@/lib/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Demo payment is off because Stripe is configured." }, { status: 404 });
    }
    const body = await readJson(request);
    if (typeof body.bookingId !== "string") throw new PaymentError("not_payable", "Booking is missing.");
    const store = getStore();
    const now = new Date();
    const applied: { outcome: "paid" | "already_paid" | "ignored" } = { outcome: "ignored" };
    const booking = await store.updateBooking(body.bookingId, (current) => {
      const next = applyDemoPayment(current, now);
      applied.outcome = next.outcome;
      return next.booking;
    });
    const saved = applied.outcome === "paid" ? await fulfillIfPaid(store, booking.id) : booking;
    return NextResponse.json({ booking: toPublic(saved, now) });
  } catch (error) {
    return jsonError(error);
  }
}
