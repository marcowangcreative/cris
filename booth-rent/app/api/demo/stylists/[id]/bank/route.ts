import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { requireApiSalon } from "@/lib/http";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDemoMode()) return NextResponse.json({ error: "Not available." }, { status: 404 });
  const gate = await requireApiSalon();
  if ("response" in gate) return gate.response;
  const { id } = await context.params;
  const stylist = await gate.context.repo.getStylist(gate.context.salon.id, id);
  if (!stylist || !stylist.stripeCustomerId) {
    return NextResponse.json({ error: "Stylist not found." }, { status: 404 });
  }
  await gate.context.repo.setStylistStripe(gate.context.salon.id, stylist.id, {
    paymentMethodId: stylist.paymentMethodId ?? `pm_demo_${stylist.id.slice(0, 8)}`,
    paymentMethodStatus: "verified",
  });
  return NextResponse.redirect(new URL(`/stylists/${stylist.id}?bank=linked`, _request.url), 303);
}
