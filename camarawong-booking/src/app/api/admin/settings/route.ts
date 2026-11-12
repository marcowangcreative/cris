import { NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/admin-guard";
import { ValidationError } from "@/lib/errors";
import { jsonError, readJson } from "@/lib/http";
import { getStore } from "@/lib/store";
import { parseSettingsDate } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  try {
    const body = await readJson(request);
    const store = getStore();
    if (body.action === "block") {
      const settings = await store.changeSettings({ type: "block", date: parseSettingsDate(body.date) });
      return NextResponse.json({ settings });
    }
    if (body.action === "unblock") {
      const settings = await store.changeSettings({ type: "unblock", date: parseSettingsDate(body.date) });
      return NextResponse.json({ settings });
    }
    if (body.action === "max") {
      const settings = await store.changeSettings({ type: "max", maxEventsPerDate: Number(body.maxEventsPerDate) });
      return NextResponse.json({ settings });
    }
    throw new ValidationError("Unknown settings action.");
  } catch (error) {
    return jsonError(error);
  }
}
