import { NextResponse } from "next/server";
import { jsonError, routeParam } from "@/lib/http";
import { getStore } from "@/lib/store";
import { toPublic } from "@/lib/status";
import { planCancel } from "@/lib/transitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<Record<string, string | string[] | undefined>> }) {
  try {
    const id = await routeParam(context, "id");
    const now = new Date();
    const booking = await getStore().updateBooking(id, (current) => planCancel(current, now, "client"));
    return NextResponse.json({ booking: toPublic(booking, now) });
  } catch (error) {
    return jsonError(error);
  }
}
