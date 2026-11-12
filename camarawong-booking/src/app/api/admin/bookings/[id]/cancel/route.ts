import { NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/admin-guard";
import { jsonError, routeParam } from "@/lib/http";
import { getStore } from "@/lib/store";
import { toPublic } from "@/lib/status";
import { planCancel } from "@/lib/transitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<Record<string, string | string[] | undefined>> }) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  try {
    const id = await routeParam(context, "id");
    const now = new Date();
    const booking = await getStore().updateBooking(id, (current) => planCancel(current, now, "admin"));
    return NextResponse.json({ booking: toPublic(booking, now) });
  } catch (error) {
    return jsonError(error);
  }
}
