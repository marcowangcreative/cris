import { NextResponse } from "next/server";
import { getPackage } from "@/lib/config";
import { sendInquiry } from "@/lib/email";
import { jsonError, readJson } from "@/lib/http";
import { getStore } from "@/lib/store";
import { parseInquiry } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const inquiry = await getStore().createInquiry(
      parseInquiry(await readJson(request), (id) => getPackage(id)?.name ?? null),
    );
    try {
      await sendInquiry(inquiry);
    } catch (error) {
      console.error("[camarawong] inquiry email failed", error);
    }
    return NextResponse.json({ inquiry });
  } catch (error) {
    return jsonError(error);
  }
}
