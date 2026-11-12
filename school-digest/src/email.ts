import { simpleParser, type Attachment } from "mailparser";
import { htmlToText, slug } from "./text";
import type { NormalizedMessage } from "./types";
import { looksLikeWhatsAppExport, parseWhatsAppExport, type WhatsAppParseOptions } from "./whatsapp";

export interface ParsedEmail {
  from: string;
  subject: string;
  date: Date | null;
  text: string;
  attachments: Attachment[];
}

export async function parseEmailSource(raw: string | Buffer): Promise<ParsedEmail> {
  const parsed = await simpleParser(raw);
  const html = typeof parsed.html === "string" ? parsed.html : "";
  const text = parsed.text?.trim() || (html ? htmlToText(html) : "");
  return {
    from: parsed.from?.text?.trim() ?? "",
    subject: (parsed.subject ?? "").replace(/\s+/g, " ").trim(),
    date: parsed.date ?? null,
    text,
    attachments: parsed.attachments ?? [],
  };
}

function blankMessage(partial: Omit<NormalizedMessage, "fallback_children" | "info_type">): NormalizedMessage {
  return { ...partial, fallback_children: [], info_type: "unknown" };
}

export async function messagesFromEmailFile(options: {
  filename: string;
  raw: Buffer | string;
  fallbackDate: Date;
  whatsapp: Omit<WhatsAppParseOptions, "filename" | "text" | "idPrefix">;
  idPrefix: string;
  kind: "drop" | "email";
  account?: string;
}): Promise<NormalizedMessage[]> {
  const email = await parseEmailSource(options.raw);
  const messages: NormalizedMessage[] = [];
  let attachmentIndex = 0;

  for (const attachment of email.attachments) {
    const filename = attachment.filename ?? `attachment-${attachmentIndex}`;
    const content = attachment.content?.toString("utf8") ?? "";
    const lower = filename.toLowerCase();
    if (lower.endsWith(".txt") && looksLikeWhatsAppExport(content)) {
      messages.push(
        ...parseWhatsAppExport({
          ...options.whatsapp,
          filename,
          text: content,
          idPrefix: `${options.idPrefix}:att${attachmentIndex}`,
          account: options.account,
        }),
      );
    } else if (lower.endsWith(".eml")) {
      const nested = await messagesFromEmailFile({
        ...options,
        filename,
        raw: attachment.content,
        idPrefix: `${options.idPrefix}:att${attachmentIndex}`,
      });
      messages.push(...nested);
    }
    attachmentIndex += 1;
  }

  const coverIsJustTheExport =
    messages.length > 0 && (email.text.trim().length < 200 || /whatsapp|exported chat/i.test(email.text));
  if (!coverIsJustTheExport && email.text.trim()) {
    const date = email.date && !Number.isNaN(email.date.getTime()) ? email.date : options.fallbackDate;
    messages.unshift(
      blankMessage({
        id: options.idPrefix,
        kind: options.kind,
        sender: email.from || "unknown sender",
        person: email.from || "unknown sender",
        subject: email.subject || undefined,
        body: email.text,
        date,
        account: options.account,
      }),
    );
  }
  return messages;
}

export function dropId(filename: string): string {
  return `drop:${slug(filename) || "file"}`;
}
