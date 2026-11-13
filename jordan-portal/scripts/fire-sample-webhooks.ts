import {
  cancelParkerPayload,
  failedPaymentPayload,
  missingPaymentPayload,
  paidTransformationPayload,
} from "../src/lib/domain/samples";
import { signCalendly } from "../src/lib/domain/signature";

const base = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3000";
const secret =
  process.env.CALENDLY_WEBHOOK_SIGNING_SECRET ?? "whsec_demo_only_not_a_real_secret";

async function post(label: string, body: unknown, signature?: string) {
  const raw = JSON.stringify(body);
  const header = signature ?? signCalendly(raw, secret);
  const response = await fetch(`${base}/api/webhooks/calendly`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "calendly-webhook-signature": header,
    },
    body: raw,
  });
  const text = await response.text();
  console.log(`\n${label} → ${response.status}`);
  console.log(text);
}

async function main() {
  console.log(`Posting sample Calendly webhooks to ${base}`);
  const paid = paidTransformationPayload();
  await post("paid booking", paid);
  await post("duplicate paid booking", paid);
  await post("failed payment", failedPaymentPayload());
  await post("missing payment", missingPaymentPayload());
  await post("cancellation", cancelParkerPayload());
  await post("bad signature", paid, "t=1,v1=deadbeef");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  console.error("Start the demo with npm run dev, then run this script again.");
  process.exit(1);
});
