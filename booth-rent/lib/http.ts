import { NextResponse } from "next/server";
import { getOwnerContext, type OwnerContext } from "@/lib/auth";
import type { Salon } from "@/lib/domain";

export async function requireApiSalon(): Promise<
  { context: OwnerContext & { salon: Salon } } | { response: NextResponse }
> {
  const context = await getOwnerContext();
  if (!context) {
    return { response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  if (!context.salon) {
    return { response: NextResponse.json({ error: "Create a salon first." }, { status: 400 }) };
  }
  return { context: context as OwnerContext & { salon: Salon } };
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
