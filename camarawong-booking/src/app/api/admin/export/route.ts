import { NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/admin-guard";
import { bookingsToCsv } from "@/lib/csv";
import { jsonError } from "@/lib/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  try {
    const bookings = await getStore().listBookings();
    return new NextResponse(bookingsToCsv(bookings), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"camara-wong-bookings.csv\"",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
