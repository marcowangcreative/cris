import { includesPhrase, senderDomain } from "./text";
import type { AppConfig, InfoType, NormalizedMessage } from "./types";

const STRONG_SIGNAL =
  /\b(permission|no school|tuition|homework|project|concert|field trip|rsvp|early release|due|deadline)\b/i;

export function fallbackChildren(message: NormalizedMessage, config: AppConfig): string[] {
  const ids = new Set<string>();
  if (message.group) {
    const group = message.group.toLowerCase();
    for (const child of config.children) {
      if (child.whatsapp_groups.some((name) => name.toLowerCase() === group)) ids.add(child.id);
    }
  }
  const domain = senderDomain(message.sender);
  if (domain) {
    const hits = config.children.filter((child) => child.sender_domains.some((entry) => entry.toLowerCase() === domain));
    if (hits.length === 1) ids.add(hits[0].id);
  }
  return [...ids];
}

export function inferInfoType(message: NormalizedMessage, config: AppConfig): InfoType {
  if (message.kind === "whatsapp") {
    const person = message.person.trim().toLowerCase();
    const official = config.official_whatsapp_senders.some((name) => name.trim().toLowerCase() === person);
    return official ? "official" : "parent_chatter";
  }
  const domain = senderDomain(message.sender);
  if (!domain) return "unknown";
  if (config.official_email_domains.some((entry) => entry === domain)) return "official";
  if (config.children.some((child) => child.sender_domains.some((entry) => entry === domain))) return "official";
  return "unknown";
}

export function decorateMessage(message: NormalizedMessage, config: AppConfig): NormalizedMessage {
  return {
    ...message,
    fallback_children: fallbackChildren(message, config),
    info_type: inferInfoType(message, config),
  };
}

/** Children the text itself names, plus a unique sender domain or group. */
export function mentionedChildren(message: NormalizedMessage, config: AppConfig): string[] {
  const text = `${message.subject ?? ""}\n${message.body}`;
  const ids = new Set<string>();
  for (const child of config.children) {
    if (child.keywords.some((keyword) => includesPhrase(text, keyword))) ids.add(child.id);
    if (message.group && child.whatsapp_groups.some((group) => group.toLowerCase() === message.group?.toLowerCase())) {
      ids.add(child.id);
    }
  }
  for (const id of fallbackChildren(message, config)) ids.add(id);
  return [...ids];
}

export function isIgnored(message: NormalizedMessage, config: AppConfig): boolean {
  const sender = message.sender.toLowerCase();
  const subject = (message.subject ?? "").toLowerCase();
  const body = message.body.toLowerCase();
  const domain = senderDomain(message.sender);
  const ignore = config.ignore;

  if (domain && ignore.sender_domains.some((entry) => entry === domain)) return true;
  if (ignore.sender_addresses.some((entry) => sender.includes(entry))) return true;
  if (ignore.subject_keywords.some((keyword) => keyword && subject.includes(keyword.toLowerCase()))) return true;

  const bodyHit = ignore.body_keywords.some((keyword) => keyword && body.includes(keyword.toLowerCase()));
  if (bodyHit && message.body.length < 500 && !STRONG_SIGNAL.test(message.body)) return true;
  return false;
}

/**
 * Gmail is allowlisted. A file the parent dropped in, or a WhatsApp export,
 * was handed over on purpose and skips the allowlist (the ignore list still applies).
 */
export function passesAllowlist(message: NormalizedMessage, config: AppConfig): boolean {
  if (message.kind !== "email") return true;
  const domain = senderDomain(message.sender);
  if (domain && config.children.some((child) => child.sender_domains.includes(domain))) return true;
  if (domain && config.also_include_sender_domains.includes(domain)) return true;
  const text = `${message.subject ?? ""}\n${message.body}`;
  return config.children.some((child) => child.keywords.some((keyword) => includesPhrase(text, keyword)));
}

export function childrenForBlock(block: string, message: NormalizedMessage, config: AppConfig): string[] {
  const inBlock = config.children
    .filter((child) => child.keywords.some((keyword) => includesPhrase(block, keyword)))
    .map((child) => child.id);
  if (inBlock.length >= 1) return inBlock;

  const subject = message.subject ?? "";
  const inSubject = config.children
    .filter((child) => child.keywords.some((keyword) => includesPhrase(subject, keyword)))
    .map((child) => child.id);
  if (inSubject.length === 1) return inSubject;
  if (inSubject.length > 1) return ["unclear"];
  if (message.fallback_children.length === 1) return message.fallback_children;
  if (message.fallback_children.length > 1) return ["unclear"];
  return ["unclear"];
}
