import { NextResponse } from "next/server";
import { jsonError, readJson, routeParam } from "@/lib/http";
import { getStore } from "@/lib/store";
import { toPublic } from "@/lib/status";
import { planSignature } from "@/lib/transitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<Record<string, string | string[] | undefined>> }) {
  try {
    const id = await routeParam(context, "id");
    const body = await readJson(request);
    const now = new Date();
    const booking = await getStore().updateBooking(id, (current) =>
      planSignature(current, typeof body.signerName === "string" ? body.signerName : "", body.agreed === true, now),
    );
    return NextResponse.json({ booking: toPublic(booking, now) });
  } catch (error) {
    return jsonError(error);
  }
}
