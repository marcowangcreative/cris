import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { isConflict } from "@/lib/data/types";
import { errorMessage, requireApiSalon } from "@/lib/http";
import { ensureStripeCustomer } from "@/lib/stripe/billing";
import { stripeSecret } from "@/lib/stripe/client";
import { parseStylistInput } from "@/lib/validation";

export async function POST(request: Request) {
  const gate = await requireApiSalon();
  if ("response" in gate) return gate.response;
  const { context } = gate;
  const parsed = parseStylistInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const stylist = await context.repo.createStylist(context.salon.id, parsed.value);
    let warning: string | null = null;
    if (!isDemoMode()) {
      if (!stripeSecret()) {
        warning = "Stylist saved. Add STRIPE_SECRET_KEY before sending a bank-setup link.";
      } else {
        try {
          const customerId = await ensureStripeCustomer({
            salon: context.salon,
            stylistId: stylist.id,
            name: stylist.name,
            email: stylist.email,
            existingCustomerId: stylist.stripeCustomerId,
          });
          await context.repo.setStylistStripe(context.salon.id, stylist.id, {
            stripeCustomerId: customerId,
          });
          stylist.stripeCustomerId = customerId;
        } catch (error) {
          warning = errorMessage(error, "Stylist saved, but Stripe did not create a customer.");
        }
      }
    }
    return NextResponse.json({ stylist, warning });
  } catch (error) {
    const status = isConflict(error) ? 409 : 400;
    return NextResponse.json({ error: errorMessage(error, "Could not add the stylist.") }, { status });
  }
}
