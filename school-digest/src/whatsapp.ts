import path from "node:path";
import { parseClock, parseStamp } from "./dates";
import type { AppConfig, NormalizedMessage } from "./types";

const BIDI = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
const UNICODE_SPACE = /[\u00a0\u202f\u2007]/g;

const HEADER_RE =
  /^(?:\[)?(\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}),\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp]\.?[Mm]\.?)?)\]?(?:\s+-\s+|\s+)([\s\S]+)$/;

const NOISE_BODY =
  /^(<media omitted>|image omitted|video omitted|audio omitted|sticker omitted|gif omitted|contact card omitted|document omitted)$/i;

export function normalizeWhatsAppText(raw: string): string {
  return raw.replace(/^\uFEFF/, "").replace(BIDI, "").replace(UNICODE_SPACE, " ").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function groupNameFromFilename(filename: string, groups: string[]): string | undefined {
  const base = path.basename(filename).replace(/\.txt$/i, "").replace(/ \(\d+\)$/, "");
  const named = base.match(/^WhatsApp Chat with (.+)$/i);
  if (named) return named[1].trim();
  return groups.find((group) => group.toLowerCase() === base.toLowerCase());
}

export function looksLikeWhatsAppExport(text: string, minHits = 1): boolean {
  let hits = 0;
  for (const line of normalizeWhatsAppText(text).split("\n")) {
    if (HEADER_RE.test(line.trim())) hits += 1;
    if (hits >= minHits) return true;
  }
  return false;
}

export function looksLikeRfc822(text: string): boolean {
  const head = normalizeWhatsAppText(text).split("\n").slice(0, 12).join("\n");
  return /^(from|subject|date):\s/im.test(head);
}

function splitSender(rest: string): { sender: string; body: string } | null {
  const match = rest.match(/^([^:]{1,80}?):\s([\s\S]*)$/);
  if (!match) return null;
  const sender = match[1].trim();
  if (!sender) return null;
  return { sender, body: match[2] };
}

export interface WhatsAppParseOptions {
  filename: string;
  text: string;
  timeZone: string;
  dateOrder: AppConfig["date_order"];
  groups: string[];
  idPrefix: string;
  account?: string;
}

/**
 * Parse an iOS or Android "export chat without media" text file.
 * System lines (encryption notice, joins) are dropped. Continuation lines
 * stay with the previous message. Every returned message still needs the
 * date-window filter.
 */
export function parseWhatsAppExport(options: WhatsAppParseOptions): NormalizedMessage[] {
  const group = groupNameFromFilename(options.filename, options.groups);
  const lines = normalizeWhatsAppText(options.text).split("\n");
  const messages: NormalizedMessage[] = [];
  let current: NormalizedMessage | null = null;

  const flush = () => {
    if (!current) return;
    current.body = current.body.replace(/\s+$/g, "").trim();
    if (current.body && !NOISE_BODY.test(current.body)) messages.push(current);
    current = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) current.body += "\n";
      continue;
    }
    const header = trimmed.match(HEADER_RE);
    if (!header || !parseClock(header[2])) {
      if (current) current.body += (current.body.endsWith("\n") || current.body.length === 0 ? "" : "\n") + trimmed;
      continue;
    }
    const instant = parseStamp(header[1], header[2], options.timeZone, options.dateOrder);
    const sender = splitSender(header[3].trim());
    if (!instant || !sender) {
      flush();
      continue;
    }
    flush();
    current = {
      id: `${options.idPrefix}:${messages.length}`,
      kind: "whatsapp",
      sender: sender.sender,
      person: sender.sender,
      group,
      body: sender.body,
      date: instant,
      account: options.account,
      fallback_children: [],
      info_type: "unknown",
    };
  }
  flush();

  return messages.map((message, index) => ({ ...message, id: `${options.idPrefix}:${index}` }));
}
