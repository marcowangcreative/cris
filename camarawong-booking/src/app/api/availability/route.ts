import { NextResponse } from "next/server";
import { monthAvailability } from "@/lib/availability";
import { isRealMonth } from "@/lib/civil-date";
import { getPackage } from "@/lib/config";
import { jsonError } from "@/lib/http";
import { getStore } from "@/lib/store";
import { parseAddonQuery } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const month = url.searchParams.get("month") ?? "";
    const packageId = url.searchParams.get("packageId") ?? "";
    if (!isRealMonth(month) || !getPackage(packageId)) {
      return NextResponse.json({ error: "Month and collection are required." }, { status: 400 });
    }
    const store = getStore();
    const [bookings, settings] = await Promise.all([store.listBookings(), store.getSettings()]);
    const calendar = monthAvailability({
      month,
      packageId,
      addons: parseAddonQuery(url.searchParams.get("addons")),
      bookings,
      settings,
      now: new Date(),
      ignoreBookingId: url.searchParams.get("exclude") || undefined,
    });
    return NextResponse.json(calendar, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
