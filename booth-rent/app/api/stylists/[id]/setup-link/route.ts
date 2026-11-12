import { NextResponse } from "next/server";
import { appUrl, isDemoMode } from "@/lib/config";
import { errorMessage, requireApiSalon } from "@/lib/http";
import { createBankSetupLink, ensureStripeCustomer } from "@/lib/stripe/billing";
import { stripeSecret } from "@/lib/stripe/client";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireApiSalon();
  if ("response" in gate) return gate.response;
  const { id } = await context.params;
  const stylist = await gate.context.repo.getStylist(gate.context.salon.id, id);
  if (!stylist) return NextResponse.json({ error: "Stylist not found." }, { status: 404 });

  if (isDemoMode()) {
    await gate.context.repo.setStylistStripe(gate.context.salon.id, stylist.id, {
      paymentMethodStatus: "pending",
    });
    return NextResponse.json({ url: `${appUrl()}/demo/setup/${stylist.id}` });
  }

  if (!stripeSecret()) {
    return NextResponse.json({ error: "Add STRIPE_SECRET_KEY before creating a bank setup link." }, { status: 400 });
  }

  try {
    const customerId = await ensureStripeCustomer({
      salon: gate.context.salon,
      stylistId: stylist.id,
      name: stylist.name,
      email: stylist.email,
      existingCustomerId: stylist.stripeCustomerId,
    });
    const url = await createBankSetupLink({
      salon: gate.context.salon,
      customerId,
      stylistId: stylist.id,
      successUrl: `${appUrl()}/setup/success?stylist=${stylist.id}`,
      cancelUrl: `${appUrl()}/setup/cancel`,
    });
    await gate.context.repo.setStylistStripe(gate.context.salon.id, stylist.id, {
      stripeCustomerId: customerId,
      paymentMethodStatus: "pending",
    });
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Stripe could not create a setup link.") },
      { status: 502 },
    );
  }
}
