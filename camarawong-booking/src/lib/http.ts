import { NextResponse } from "next/server";
import {
  NotFoundError,
  PaymentError,
  PricingError,
  SlotUnavailableError,
  ValidationError,
} from "@/lib/errors";

export function jsonError(error: unknown) {
  if (error instanceof SlotUnavailableError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof PricingError || error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof PaymentError) {
    const status =
      error.code === "invalid_signature" || error.code === "amount_mismatch"
        ? 400
        : error.code === "not_configured"
          ? 500
          : 409;
    return NextResponse.json({ error: error.message }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export async function routeParam(
  context: { params: Promise<Record<string, string | string[] | undefined>> },
  key: string,
): Promise<string> {
  const params = await context.params;
  const value = params[key];
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new NotFoundError("That page is missing.");
  return id;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new ValidationError("The request body is missing.");
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("The request body is not valid JSON.");
  }
}
