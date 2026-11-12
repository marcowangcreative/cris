import { NextResponse } from "next/server";
import { renderContract } from "@/lib/contract";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { jsonError, routeParam } from "@/lib/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<Record<string, string | string[] | undefined>> }) {
  try {
    const id = await routeParam(context, "id");
    const booking = await getStore().getBooking(id);
    if (!booking) throw new NotFoundError("Booking not found.");
    if (booking.contract) return NextResponse.json({ text: booking.contract.body });
    if (!booking.intake) throw new ValidationError("Add the event details first.");
    return NextResponse.json({ text: renderContract(booking) });
  } catch (error) {
    return jsonError(error);
  }
}
