import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/http";
import { getStore } from "@/lib/store";
import { toPublic } from "@/lib/status";
import { ValidationError } from "@/lib/errors";
import { parseAddons } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const packageId = body.packageId;
    const date = body.date;
    const startTime = body.startTime;
    if (typeof packageId !== "string" || typeof date !== "string" || typeof startTime !== "string") {
      throw new ValidationError("Choose a collection, a date, and a start time.");
    }
    const booking = await getStore().createHold({
      packageId,
      date,
      startTime,
      addons: parseAddons(body.addons),
    });
    return NextResponse.json({ booking: toPublic(booking, new Date()) });
  } catch (error) {
    return jsonError(error);
  }
}
