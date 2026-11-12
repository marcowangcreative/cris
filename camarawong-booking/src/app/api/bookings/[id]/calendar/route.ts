import { NextResponse } from "next/server";
import { buildIcs } from "@/lib/ics";
import { jsonError, routeParam } from "@/lib/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<Record<string, string | string[] | undefined>> }) {
  try {
    const id = await routeParam(context, "id");
    const booking = await getStore().getBooking(id);
    if (!booking || booking.payment.status !== "paid") {
      return NextResponse.json({ error: "The calendar file is ready after payment." }, { status: 404 });
    }
    return new NextResponse(buildIcs(booking), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="camara-wong-${booking.date}.ics"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
