import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { OAuth2Client } from "google-auth-library";
import { requireEnv } from "./env";
import { tokenPath } from "./gmail";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

function waitForCode(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      if (error) {
        res.end("Authorization failed. You can close this tab.");
        server.close();
        reject(new Error(`Google authorization was denied (${error}).`));
        return;
      }
      if (!code) {
        res.statusCode = 400;
        res.end("Missing code.");
        return;
      }
      res.end("School digest is authorized. You can close this tab.");
      server.close();
      resolve(code);
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1");
  });
}

export async function authorizeAccount(root: string, accountId: string): Promise<void> {
  const file = tokenPath(root, accountId);
  const port = Number(process.env.GOOGLE_REDIRECT_PORT || 42813);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("GOOGLE_REDIRECT_PORT must be a port number.");
  }
  const redirectUri = `http://127.0.0.1:${port}`;
  const client = new OAuth2Client({
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri,
  });
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
  console.log("Open this URL in a browser on this computer and approve access:\n");
  console.log(url);
  console.log(`\nWaiting for the redirect to ${redirectUri} ...`);
  const code = await waitForCode(port);
  const { tokens } = await client.getToken(code);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  console.log(`Saved a token for ${accountId}.`);
  console.log("That file is gitignored. Repeat for each Gmail account, with a different --account id.");
}
