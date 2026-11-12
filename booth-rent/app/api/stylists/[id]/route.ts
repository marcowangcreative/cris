import { NextResponse } from "next/server";
import { isConflict } from "@/lib/data/types";
import { errorMessage, requireApiSalon } from "@/lib/http";
import { parseStylistInput } from "@/lib/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireApiSalon();
  if ("response" in gate) return gate.response;
  const { id } = await context.params;
  const parsed = parseStylistInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const stylist = await gate.context.repo.updateStylist(gate.context.salon.id, id, parsed.value);
    return NextResponse.json({ stylist });
  } catch (error) {
    const status = isConflict(error) ? 409 : 400;
    return NextResponse.json({ error: errorMessage(error, "Could not update the stylist.") }, { status });
  }
}
