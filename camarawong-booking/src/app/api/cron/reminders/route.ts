import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { sendDueReminders } from "@/lib/reminders";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const sent = await sendDueReminders(getStore());
    return NextResponse.json({ sent });
  } catch (error) {
    return jsonError(error);
  }
}

export function GET(request: Request) {
  return run(request);
}

export function POST(request: Request) {
  return run(request);
}
