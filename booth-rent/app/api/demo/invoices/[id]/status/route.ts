import { NextResponse } from "next/server";
import { getAdminRepo } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import type { InvoiceStatus } from "@/lib/domain";
import { errorMessage, requireApiSalon } from "@/lib/http";

const ALLOWED: InvoiceStatus[] = ["processing", "paid", "failed", "void"];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDemoMode()) return NextResponse.json({ error: "Not available." }, { status: 404 });
  const gate = await requireApiSalon();
  if ("response" in gate) return gate.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = String(body?.status ?? "") as InvoiceStatus;
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Choose processing, paid, failed, or void." }, { status: 400 });
  }
  const invoice = await gate.context.repo.getInvoice(gate.context.salon.id, id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  try {
    const applied = await getAdminRepo().applyInvoiceStatus({
      boothInvoiceId: invoice.id,
      status,
      errorMessage: status === "failed" ? "ACH payment failed." : null,
    });
    if (!applied) {
      return NextResponse.json({ error: `Cannot mark a ${invoice.status} invoice as ${status}.` }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Could not update the invoice.") }, { status: 400 });
  }
}
