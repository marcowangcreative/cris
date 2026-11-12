import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, createSessionToken, passwordsMatch, sessionCookieOptions } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!adminConfigured()) {
      return NextResponse.json(
        { error: "Set ADMIN_PASSWORD in the environment before opening the desk." },
        { status: 503 },
      );
    }
    const body = await readJson(request);
    const password = typeof body.password === "string" ? body.password : "";
    if (!passwordsMatch(password)) {
      return NextResponse.json({ error: "That password does not match." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, createSessionToken(), sessionCookieOptions());
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
