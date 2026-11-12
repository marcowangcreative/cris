import { isValidYmd } from "./dates";
import { mentionedChildren } from "./filter";
import { extractAmount } from "./text";
import { CATEGORIES, type AppConfig, type Category, type DigestItem, type InfoType, type NormalizedMessage, type SourceRef } from "./types";

const INFO: InfoType[] = ["official", "parent_chatter", "unknown"];
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;

export interface LlmDraft {
  message_id: string;
  child: string;
  category: Category;
  title: string;
  date: string | null;
  deadline: string | null;
  amount: string | null;
  action_needed: string | null;
  info_type: InfoType;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseLlmPayload(text: string): unknown[] {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("The model did not return JSON.");
  }
  if (Array.isArray(parsed)) return parsed;
  if (isRecord(parsed) && Array.isArray(parsed.items)) return parsed.items;
  throw new Error('The model JSON must be an object with an "items" array.');
}

function nullableString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function validDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(DATE_RE);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidYmd(year, month, day)) return null;
  if (match[4]) {
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    if (hour > 23 || minute > 59) return null;
  }
  return value;
}

function canonicalizeChild(value: string, config: AppConfig): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "unclear") return "unclear";
  const byId = config.children.find((child) => child.id.toLowerCase() === trimmed.toLowerCase());
  if (byId) return byId.id;
  const byName = config.children.find((child) => child.name.toLowerCase() === trimmed.toLowerCase());
  if (byName) return byName.id;
  return "unclear";
}

/**
 * Keep a child id only when that child is named by the message
 * (keyword, WhatsApp group, or a sender domain that belongs to one child).
 * Anything else becomes "unclear".
 */
export function guardChild(child: string, message: NormalizedMessage, config: AppConfig): string {
  const canonical = canonicalizeChild(child, config);
  if (canonical === "unclear") return "unclear";
  return mentionedChildren(message, config).includes(canonical) ? canonical : "unclear";
}

function sourceFrom(message: NormalizedMessage): SourceRef {
  return {
    kind: message.kind,
    sender_or_group: message.kind === "whatsapp" ? message.group || message.person : message.sender,
    sender: message.person || message.sender,
    message_date: message.date.toISOString(),
    subject: message.subject,
    info_type: message.info_type,
    message_id: message.id,
    account: message.account,
  };
}

export function draftsToItems(
  rawItems: unknown[],
  messages: NormalizedMessage[],
  config: AppConfig,
): { items: DigestItem[]; rejected: number } {
  const byId = new Map(messages.map((message) => [message.id, message]));
  const items: DigestItem[] = [];
  let rejected = 0;

  for (const raw of rawItems) {
    if (!isRecord(raw) || typeof raw.message_id !== "string") {
      rejected += 1;
      continue;
    }
    const message = byId.get(raw.message_id);
    if (!message) {
      rejected += 1;
      continue;
    }
    if (typeof raw.category !== "string" || !CATEGORIES.includes(raw.category as Category) || raw.category === "other") {
      rejected += 1;
      continue;
    }
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!title) {
      rejected += 1;
      continue;
    }
    const category = raw.category as Category;
    const child = guardChild(typeof raw.child === "string" ? raw.child : "unclear", message, config);
    const requestedInfo = typeof raw.info_type === "string" && INFO.includes(raw.info_type as InfoType)
      ? (raw.info_type as InfoType)
      : message.info_type;
    const infoType = message.kind === "whatsapp" ? message.info_type : requestedInfo;
    const source = { ...sourceFrom(message), info_type: infoType };
    const amount = nullableString(raw.amount);
    items.push({
      child,
      category,
      title: title.slice(0, 300),
      date: validDate(nullableString(raw.date)),
      deadline: validDate(nullableString(raw.deadline)),
      amount: amount ? extractAmount(amount) ?? ( /^\$\d+(?:\.\d{2})?$/.test(amount) ? amount : null) : null,
      action_needed: nullableString(raw.action_needed)?.slice(0, 200) ?? null,
      info_type: infoType,
      source,
      sources: [source],
    });
  }
  return { items, rejected };
}
