import { NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/admin-guard";
import { sortBookings } from "@/lib/format";
import { jsonError } from "@/lib/http";
import { getStore } from "@/lib/store";
import { toPublic } from "@/lib/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  try {
    const store = getStore();
    const now = new Date();
    const [bookings, inquiries, settings] = await Promise.all([
      store.listBookings(),
      store.listInquiries(),
      store.getSettings(),
    ]);
    return NextResponse.json({
      bookings: sortBookings(bookings).map((booking) => toPublic(booking, now)),
      inquiries,
      settings,
    });
  } catch (error) {
    return jsonError(error);
  }
}
