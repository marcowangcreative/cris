import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { handleWebhookPayload } from "@/lib/payments";
import { getStore } from "@/lib/store";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  try {
    const result = await handleWebhookPayload({
      store: getStore(),
      payload: await request.text(),
      signature,
      secret,
      stripe: getStripe(),
    });
    return NextResponse.json({ received: true, outcome: result.outcome });
  } catch (error) {
    return jsonError(error);
  }
}
