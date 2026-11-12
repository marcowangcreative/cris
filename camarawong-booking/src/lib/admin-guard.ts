import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth";

export async function adminOk(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(ADMIN_COOKIE)?.value);
}

export async function denyUnlessAdmin(): Promise<NextResponse | null> {
  if (await adminOk()) return null;
  return NextResponse.json({ error: "Sign in to the staff desk." }, { status: 401 });
}
