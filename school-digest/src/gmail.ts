import fs from "node:fs";
import path from "node:path";
import { OAuth2Client, type Credentials } from "google-auth-library";
import { messagesFromEmailFile } from "./email";
import { requireEnv } from "./env";
import { htmlToText } from "./text";
import { gmailAfterQuery, windowBounds } from "./time";
import type { AppConfig, NormalizedMessage } from "./types";
import { looksLikeWhatsAppExport, parseWhatsAppExport } from "./whatsapp";

const MAX_MESSAGES = 500;
const GMAIL_ROOT = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailPart[];
}

export interface GmailApiMessage {
  id: string;
  internalDate?: string;
  payload?: GmailPart;
}

export function tokenPath(root: string, accountId: string): string {
  if (!/^[a-z0-9][a-z0-9_-]{0,40}$/.test(accountId)) {
    throw new Error(`Account id "${accountId}" must be a lowercase slug such as inbox-a.`);
  }
  return path.join(root, "tokens", `${accountId}.json`);
}

export function decodeBase64Url(data: string): Buffer {
  const pad = (4 - (data.length % 4)) % 4;
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad), "base64");
}

export function encodeBase64Url(data: Buffer | string): string {
  return Buffer.from(data)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export function collectParts(part: GmailPart | undefined, acc: GmailPart[] = []): GmailPart[] {
  if (!part) return acc;
  acc.push(part);
  for (const child of part.parts ?? []) collectParts(child, acc);
  return acc;
}

export function materializeTokenFiles(root: string, accountIds: string[]): void {
  const raw = process.env.SCHOOL_DIGEST_TOKENS_JSON?.trim();
  if (!raw) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("SCHOOL_DIGEST_TOKENS_JSON is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("SCHOOL_DIGEST_TOKENS_JSON must be an object keyed by Gmail account id.");
  }
  const record = parsed as Record<string, unknown>;
  fs.mkdirSync(path.join(root, "tokens"), { recursive: true });
  for (const accountId of accountIds) {
    const token = record[accountId];
    if (!token || typeof token !== "object") continue;
    const dest = tokenPath(root, accountId);
    if (fs.existsSync(dest)) continue;
    fs.writeFileSync(dest, JSON.stringify(token, null, 2), { mode: 0o600 });
  }
}

export function loadOAuthClient(root: string, accountId: string): OAuth2Client {
  const file = tokenPath(root, accountId);
  if (!fs.existsSync(file)) {
    throw new Error(`No token for Gmail account "${accountId}". Run: npm run auth -- --account ${accountId}`);
  }
  const saved = JSON.parse(fs.readFileSync(file, "utf8")) as Credentials;
  const client = new OAuth2Client({
    clientId: requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: `http://127.0.0.1:${process.env.GOOGLE_REDIRECT_PORT || "42813"}`,
  });
  client.setCredentials(saved);
  client.on("tokens", (next) => {
    const merged = { ...saved, ...next };
    fs.writeFileSync(file, JSON.stringify(merged, null, 2), { mode: 0o600 });
  });
  return client;
}

function messageDate(message: GmailApiMessage): Date {
  const header = headerValue(message.payload?.headers, "Date");
  const parsed = header ? new Date(header) : new Date(NaN);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const internal = Number(message.internalDate);
  if (Number.isFinite(internal) && internal > 0) return new Date(internal);
  return new Date(0);
}

export async function normalizedFromGmail(options: {
  accountId: string;
  message: GmailApiMessage;
  config: AppConfig;
  fetchAttachment?: (messageId: string, attachmentId: string) => Promise<Buffer>;
}): Promise<NormalizedMessage[]> {
  const parts = collectParts(options.message.payload);
  const plain: string[] = [];
  const html: string[] = [];
  const attachments: { filename: string; content: Buffer }[] = [];

  for (const part of parts) {
    const filename = part.filename?.trim() ?? "";
    const data = part.body?.data;
    const attachmentId = part.body?.attachmentId;
    if (filename) {
      let content: Buffer | null = data ? decodeBase64Url(data) : null;
      if (!content && attachmentId && options.fetchAttachment) {
        content = await options.fetchAttachment(options.message.id, attachmentId);
      }
      if (content) attachments.push({ filename, content });
      continue;
    }
    if (!data) continue;
    const text = decodeBase64Url(data).toString("utf8");
    if ((part.mimeType ?? "").includes("html")) html.push(text);
    else if ((part.mimeType ?? "text/plain").includes("plain") || !part.mimeType) plain.push(text);
  }

  const body = plain.find((entry) => entry.trim()) || (html[0] ? htmlToText(html[0]) : "");
  const groups = options.config.children.flatMap((child) => child.whatsapp_groups);
  const whatsappOptions = {
    timeZone: options.config.timezone,
    dateOrder: options.config.date_order,
    groups,
    account: options.accountId,
  };
  const messages: NormalizedMessage[] = [];
  let attachmentIndex = 0;
  for (const attachment of attachments) {
    const lower = attachment.filename.toLowerCase();
    const text = attachment.content.toString("utf8");
    if (lower.endsWith(".txt") && looksLikeWhatsAppExport(text)) {
      messages.push(
        ...parseWhatsAppExport({
          ...whatsappOptions,
          filename: attachment.filename,
          text,
          idPrefix: `gmail:${options.accountId}:${options.message.id}:att${attachmentIndex}`,
        }),
      );
    } else if (lower.endsWith(".eml")) {
      messages.push(
        ...(await messagesFromEmailFile({
          filename: attachment.filename,
          raw: attachment.content,
          fallbackDate: messageDate(options.message),
          whatsapp: whatsappOptions,
          idPrefix: `gmail:${options.accountId}:${options.message.id}:att${attachmentIndex}`,
          kind: "email",
          account: options.accountId,
        })),
      );
    }
    attachmentIndex += 1;
  }

  if (body.trim() && looksLikeWhatsAppExport(body, 2) && messages.length === 0) {
    messages.push(
      ...parseWhatsAppExport({
        ...whatsappOptions,
        filename: "WhatsApp Chat with pasted.txt",
        text: body,
        idPrefix: `gmail:${options.accountId}:${options.message.id}:pasted`,
      }),
    );
    return messages;
  }

  const coverIsJustTheExport = messages.length > 0 && (body.trim().length < 200 || /whatsapp|exported chat/i.test(body));
  if (!coverIsJustTheExport && body.trim()) {
    const from = headerValue(options.message.payload?.headers, "From") || "unknown sender";
    const subject = headerValue(options.message.payload?.headers, "Subject").replace(/\s+/g, " ").trim();
    messages.unshift({
      id: `gmail:${options.accountId}:${options.message.id}`,
      kind: "email",
      sender: from,
      person: from,
      subject: subject || undefined,
      body,
      date: messageDate(options.message),
      account: options.accountId,
      fallback_children: [],
      info_type: "unknown",
    });
  }
  return messages;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function ingestGmail(root: string, config: AppConfig, asOf: Date): Promise<NormalizedMessage[]> {
  if (config.gmail_accounts.length === 0) return [];
  materializeTokenFiles(
    root,
    config.gmail_accounts.map((account) => account.id),
  );
  const bounds = windowBounds(asOf, config.window_days);
  const query = gmailAfterQuery(bounds.start, config.timezone);
  const all: NormalizedMessage[] = [];

  for (const account of config.gmail_accounts) {
    const client = loadOAuthClient(root, account.id);
    const ids: string[] = [];
    let pageToken = "";
    do {
      const url = new URL(`${GMAIL_ROOT}/messages`);
      url.searchParams.set("q", query);
      url.searchParams.set("maxResults", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const listed = await client.request<{ messages?: { id: string }[]; nextPageToken?: string }>({
        url: url.toString(),
      });
      for (const message of listed.data.messages ?? []) ids.push(message.id);
      pageToken = listed.data.nextPageToken ?? "";
    } while (pageToken && ids.length < MAX_MESSAGES);

    if (ids.length >= MAX_MESSAGES) {
      console.warn(`Gmail account ${account.id} hit the ${MAX_MESSAGES}-message cap. Narrow the date window or archive mail.`);
    }

    const batches = await mapPool(ids.slice(0, MAX_MESSAGES), 4, async (id) => {
      const full = await client.request<GmailApiMessage>({
        url: `${GMAIL_ROOT}/messages/${id}?format=full`,
      });
      return normalizedFromGmail({
        accountId: account.id,
        message: full.data,
        config,
        fetchAttachment: async (messageId, attachmentId) => {
          const attachment = await client.request<{ data?: string }>({
            url: `${GMAIL_ROOT}/messages/${messageId}/attachments/${attachmentId}`,
          });
          return decodeBase64Url(attachment.data.data ?? "");
        },
      });
    });
    for (const batch of batches) all.push(...batch);
  }
  return all;
}
