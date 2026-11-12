import { NextResponse } from "next/server";
import { getOwnerContext } from "@/lib/auth";
import { isConflict } from "@/lib/data/types";
import { errorMessage } from "@/lib/http";
import { parseSalonName } from "@/lib/validation";

export async function POST(request: Request) {
  const context = await getOwnerContext();
  if (!context) return NextResponse.redirect(new URL("/login", request.url), 303);
  const form = await request.formData();
  const parsed = parseSalonName(form.get("name"));
  const back = context.salon ? "/settings" : "/onboarding";
  if (!parsed.ok) {
    return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent(parsed.error)}`, request.url), 303);
  }
  try {
    if (context.salon) {
      await context.repo.updateSalon(context.salon.id, context.user.id, parsed.name);
      return NextResponse.redirect(new URL("/settings?saved=1", request.url), 303);
    }
    await context.repo.createSalon({ ownerId: context.user.id, name: parsed.name });
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  } catch (error) {
    const message = isConflict(error) ? errorMessage(error, "That salon already exists.") : "Could not save the salon.";
    return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent(message)}`, request.url), 303);
  }
}
