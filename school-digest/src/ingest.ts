import fs from "node:fs";
import path from "node:path";
import { dropId, messagesFromEmailFile } from "./email";
import { slug } from "./text";
import type { AppConfig, NormalizedMessage } from "./types";
import { looksLikeRfc822, looksLikeWhatsAppExport, parseWhatsAppExport } from "./whatsapp";

function listFiles(dir: string, strict: boolean, label: string): string[] {
  if (!fs.existsSync(dir)) {
    if (strict) throw new Error(`Missing ${label} folder: ${dir}`);
    console.warn(`${label} folder does not exist yet: ${dir}`);
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => !name.startsWith("."))
    .sort((a, b) => a.localeCompare(b));
}

export function ingestWhatsAppDir(dir: string, config: AppConfig, strict: boolean): NormalizedMessage[] {
  const groups = config.children.flatMap((child) => child.whatsapp_groups);
  const messages: NormalizedMessage[] = [];
  for (const name of listFiles(dir, strict, "WhatsApp")) {
    if (!name.toLowerCase().endsWith(".txt")) continue;
    const full = path.join(dir, name);
    if (!fs.statSync(full).isFile()) continue;
    const text = fs.readFileSync(full, "utf8");
    messages.push(
      ...parseWhatsAppExport({
        filename: name,
        text,
        timeZone: config.timezone,
        dateOrder: config.date_order,
        groups,
        idPrefix: `wa:${slug(name) || "chat"}`,
      }),
    );
  }
  return messages;
}

export async function ingestDropDir(dir: string, config: AppConfig, strict: boolean): Promise<NormalizedMessage[]> {
  const groups = config.children.flatMap((child) => child.whatsapp_groups);
  const messages: NormalizedMessage[] = [];
  for (const name of listFiles(dir, strict, "Drop")) {
    const full = path.join(dir, name);
    if (!fs.statSync(full).isFile()) continue;
    const lower = name.toLowerCase();
    if (!lower.endsWith(".txt") && !lower.endsWith(".eml")) continue;
    const raw = fs.readFileSync(full);
    const text = raw.toString("utf8");
    const whatsappOptions = {
      timeZone: config.timezone,
      dateOrder: config.date_order,
      groups,
    };
    if (lower.endsWith(".txt") && (lower.startsWith("whatsapp chat") || looksLikeWhatsAppExport(text)) && !looksLikeRfc822(text)) {
      messages.push(
        ...parseWhatsAppExport({
          ...whatsappOptions,
          filename: name,
          text,
          idPrefix: `${dropId(name)}:wa`,
        }),
      );
      continue;
    }
    const stat = fs.statSync(full);
    messages.push(
      ...(await messagesFromEmailFile({
        filename: name,
        raw,
        fallbackDate: stat.mtime,
        whatsapp: whatsappOptions,
        idPrefix: dropId(name),
        kind: "drop",
      })),
    );
  }
  return messages;
}
