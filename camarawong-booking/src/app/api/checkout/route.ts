import { NextResponse } from "next/server";
import { PaymentError } from "@/lib/errors";
import { jsonError, readJson } from "@/lib/http";
import { requestOrigin } from "@/lib/origin";
import { checkoutCopy, getStripe } from "@/lib/stripe";
import { getStore } from "@/lib/store";
import { displayStatus } from "@/lib/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const bookingId = body.bookingId;
    if (typeof bookingId !== "string") throw new PaymentError("not_payable", "Booking is missing.");
    const store = getStore();
    const booking = await store.getBooking(bookingId);
    if (!booking) throw new PaymentError("not_payable", "Booking not found.");
    if (displayStatus(booking, new Date()) !== "pending_payment") {
      throw new PaymentError("not_payable", "Sign the agreement before payment.");
    }

    const origin = requestOrigin(request);
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ demo: true, url: `${origin}/pay/demo/${booking.id}` });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: booking.intake?.clientEmail,
      client_reference_id: booking.id,
      metadata: {
        bookingId: booking.id,
        packageId: booking.packageId,
        eventDate: booking.date,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: booking.quote.dueNowCents,
            product_data: {
              name: `Camara Wong — ${booking.quote.packageName}`,
              description: checkoutCopy(booking),
            },
          },
        },
      ],
      success_url: `${origin}/confirmation/${booking.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/book/${booking.packageId}?booking=${booking.id}&step=payment`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    await store.updateBooking(booking.id, (current) => {
      if (current.status !== "pending_payment") return current;
      return {
        ...current,
        updatedAt: new Date().toISOString(),
        payment: {
          ...current.payment,
          provider: "stripe",
          stripeSessionId: session.id,
          amountCents: current.quote.dueNowCents,
        },
      };
    });

    return NextResponse.json({ demo: false, url: session.url });
  } catch (error) {
    return jsonError(error);
  }
}
