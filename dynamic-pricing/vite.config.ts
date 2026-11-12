import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { checkPricingPassword } from "./server/password";

function readConfiguredPassword(mode: string): string | undefined {
  const fromFile = loadEnv(mode, process.cwd(), "").PRICING_PASSWORD;
  const value = fromFile || process.env.PRICING_PASSWORD;
  return value ? value : undefined;
}

async function readPassword(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { password?: unknown };
    return typeof parsed.password === "string" ? parsed.password : "";
  } catch {
    return "";
  }
}

function pricingPasswordPlugin(): Plugin {
  return {
    name: "pricing-password",
    configureServer(server) {
      const configured = readConfiguredPassword(server.config.mode);
      server.middlewares.use((req, res, next) => {
        void handleUnlock(req, res, next, configured);
      });
    },
    configurePreviewServer(server) {
      const configured = readConfiguredPassword("production");
      server.middlewares.use((req, res, next) => {
        void handleUnlock(req, res, next, configured);
      });
    },
  };
}

async function handleUnlock(
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
  configured: string | undefined,
) {
  const path = req.url?.split("?")[0];
  if (path !== "/api/unlock") {
    next();
    return;
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "Use POST." }));
    return;
  }
  const password = await readPassword(req);
  const result = checkPricingPassword(password, configured);
  res.statusCode = result.status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(result.body));
}

export default defineConfig({
  plugins: [react(), pricingPasswordPlugin()],
});
