import { checkPricingPassword } from "../server/password";

interface UnlockRequest {
  method?: string;
  body?: { password?: unknown };
}

interface UnlockResponse {
  status: (code: number) => { json: (body: unknown) => void };
}

/** Vercel serverless check. PRICING_PASSWORD is read here, never bundled into the page. */
export default function handler(req: UnlockRequest, res: UnlockResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Use POST." });
    return;
  }
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const result = checkPricingPassword(password, process.env.PRICING_PASSWORD);
  res.status(result.status).json(result.body);
}
