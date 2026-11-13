import { getConfig } from "@/lib/rules";
import { updateDemoDb } from "@/lib/demo/store";
import { verifyCalendlySignature } from "@/lib/domain/signature";
import { parseCalendlyWebhook, processCalendlyEvent } from "@/lib/domain/webhook";

export async function POST(request: Request) {
  if (!getConfig().demoMode) {
    return Response.json(
      { ok: false, error: "Live webhook processing is disabled in this public MVP." },
      { status: 409 },
    );
  }
  const raw = await request.text();
  const header = request.headers.get("calendly-webhook-signature");
  if (!verifyCalendlySignature(raw, header, getConfig().webhookSecret)) {
    return Response.json({ ok: false, error: "Invalid webhook signature." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const event = parseCalendlyWebhook(body);
  if (!event) {
    return Response.json({ ok: false, error: "Unsupported webhook payload." }, { status: 400 });
  }
  const result = await updateDemoDb((db) =>
    processCalendlyEvent(db, event, new Date().toISOString()),
  );
  return Response.json(result, { status: result.httpStatus });
}
