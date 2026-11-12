import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEMO_COOKIE, isDemoMode } from "@/lib/config";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const jar = await cookies();
  jar.set(DEMO_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  if (!isDemoMode()) {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
