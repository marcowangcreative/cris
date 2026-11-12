import { NextResponse } from "next/server";
import { renderContract } from "@/lib/contract";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { jsonError, readJson, routeParam } from "@/lib/http";
import { getStore } from "@/lib/store";
import { toPublic } from "@/lib/status";
import { planIntake } from "@/lib/transitions";
import { parseIntake } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<Record<string, string | string[] | undefined>> };

export async function GET(_request: Request, context: Context) {
  try {
    const id = await routeParam(context, "id");
    const booking = await getStore().getBooking(id);
    if (!booking) throw new NotFoundError("Booking not found.");
    const now = new Date();
    const contractPreview = booking.contract?.body ?? (booking.intake ? renderContract(booking) : null);
    return NextResponse.json({ booking: toPublic(booking, now), contractPreview });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const id = await routeParam(context, "id");
    const body = await readJson(request);
    if (!body.intake) throw new ValidationError("Event details are missing.");
    const intake = parseIntake(body.intake);
    const now = new Date();
    const booking = await getStore().updateBooking(id, (current) => planIntake(current, intake, now));
    return NextResponse.json({
      booking: toPublic(booking, now),
      contractPreview: renderContract(booking),
    });
  } catch (error) {
    return jsonError(error);
  }
}
