import { assignDateFields, parseLooseDate } from "./dates";
import { childrenForBlock } from "./filter";
import { collapseSpace, extractAmount, splitSentences } from "./text";
import type { AppConfig, Category, DigestItem, NormalizedMessage, SourceRef } from "./types";

const BOILERPLATE = /^(thanks|thank you|sincerely|regards|hello|hi|hey|dear)\b/i;

export function classify(text: string): Category {
  const value = text.toLowerCase();
  if (
    /\b(no school|school is closed|schools are closed|teacher work day|offices are closed|campus is closed|will be closed)\b/.test(
      value,
    )
  ) {
    return "closure";
  }
  if (/\b(early release|late start|early dismissal|schedule change)\b/.test(value)) return "schedule_change";
  if (/\b(permission slips?|permission forms?|waivers?|sign and return)\b/.test(value)) return "form";
  if (/\b(please reply|rsvp|sign-ups?|signups?|sign up)\b/.test(value)) return "reply_needed";
  if (/\b(homeworks?|projects?)\b/.test(value)) return "homework";
  if (/\b(please send|please bring|supply list|labeled folder|family photo)\b/.test(value)) return "supplies";
  if (/\b(tuitions?|invoices?|balances?|please pay)\b/.test(value) || (/\b(fees?|payments?)\b/.test(value) && /\$\s?\d/.test(value))) {
    return "payment";
  }
  if (/\b(concerts?|book fairs?|field trips?|picture days?|picture retakes?|conferences?|meetings?)\b/.test(value)) return "event";
  if (/\b(due|deadline)\b/.test(value)) return "deadline";
  return "other";
}

function splitBlocks(body: string): string[] {
  const blocks: string[] = [];
  for (const line of body.split(/\n/)) {
    const cleaned = line.trim().replace(/^([-*•]|\d+[.)])\s+/, "").trim();
    if (!cleaned) continue;
    if (cleaned.length < 40 && !/[0-9$]/.test(cleaned) && BOILERPLATE.test(cleaned)) continue;
    blocks.push(cleaned);
  }
  return blocks;
}

function isLowValueQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.endsWith("?")) return false;
  return !/\b(please|rsvp|due|deadline|fee|tuition|permission|no school|\$\s?\d)\b/i.test(trimmed);
}

function needsSplit(block: string): boolean {
  const sentences = splitSentences(block);
  if (sentences.length < 2) return false;
  const categories = sentences.map((sentence) => classify(sentence));
  const distinct = new Set(categories.filter((category) => category !== "other"));
  const hard = categories.filter((category) => category === "closure" || category === "schedule_change");
  return hard.length >= 1 && distinct.size > 1;
}

function meaningfulTitle(block: string, asOf: Date, config: AppConfig): string {
  const sentences = splitSentences(block);
  const meaningful = sentences.filter((sentence) => {
    if (classify(sentence) !== "other") return true;
    if (extractAmount(sentence)) return true;
    return Boolean(parseLooseDate(sentence, asOf, config.timezone, config.date_order));
  });
  const chosen = meaningful.length > 0 ? meaningful : sentences;
  return collapseSpace(chosen.join(" ")).slice(0, 300);
}

function actionFor(category: Category, text: string, amount: string | null): string | null {
  const sendSupplies =
    /\b(send|bring)\b/i.test(text) && /\b(folder|photo|pen|paper|supply|supplies|labeled)\b/i.test(text);
  switch (category) {
    case "form":
      return amount ? "Sign and return the form and pay the fee" : "Sign and return the form";
    case "payment":
      return amount ? `Pay ${amount}` : "Pay the balance";
    case "reply_needed":
      return "Reply needed";
    case "supplies":
      return "Send the supplies";
    case "homework":
      return sendSupplies ? "Turn in the assignment and send the supplies" : "Turn in the assignment";
    case "deadline":
      return "Take care of this by the deadline";
    default:
      return null;
  }
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

interface Draft {
  category: Category;
  title: string;
  date: string | null;
  deadline: string | null;
  amount: string | null;
  action_needed: string | null;
  text: string;
}

function draftFrom(piece: string, asOf: Date, config: AppConfig): Draft | null {
  const category = classify(piece);
  const parsed = parseLooseDate(piece, asOf, config.timezone, config.date_order);
  const amount = extractAmount(piece);
  if (category === "other" && !parsed && !amount) return null;
  const when = assignDateFields(piece, parsed);
  const normalized = category === "other" ? "event" : category;
  return {
    category: normalized,
    title: meaningfulTitle(piece, asOf, config),
    date: when.date,
    deadline: when.deadline,
    amount,
    action_needed: actionFor(normalized, piece, amount),
    text: piece,
  };
}

function foldDrafts(drafts: Draft[]): Draft[] {
  const folded: Draft[] = [];
  for (const draft of drafts) {
    const previous = folded[folded.length - 1];
    if (
      previous &&
      previous.category === "homework" &&
      draft.category === "supplies" &&
      !draft.date &&
      !draft.deadline
    ) {
      previous.title = collapseSpace(`${previous.title} ${draft.title}`).slice(0, 300);
      previous.action_needed = "Turn in the assignment and send the supplies";
      previous.amount = previous.amount ?? draft.amount;
      continue;
    }
    folded.push(draft);
  }
  return folded;
}

function itemsFromBlock(
  block: string,
  message: NormalizedMessage,
  config: AppConfig,
  asOf: Date,
): { items: DigestItem[]; skippedChatter: number } {
  const parsed = parseLooseDate(block, asOf, config.timezone, config.date_order);
  const empty = classify(block) === "other" && !extractAmount(block) && !parsed;
  if (isLowValueQuestion(block) || empty) {
    return { items: [], skippedChatter: message.info_type === "parent_chatter" ? 1 : 0 };
  }

  const pieces = needsSplit(block) ? splitSentences(block) : [block];
  const drafts = foldDrafts(
    pieces.flatMap((piece) => {
      const draft = draftFrom(piece, asOf, config);
      return draft ? [draft] : [];
    }),
  );

  const source = sourceFrom(message);
  const items: DigestItem[] = [];
  for (const draft of drafts) {
    const owners = childrenForBlock(draft.text, message, config);
    for (const child of owners) {
      items.push({
        child,
        category: draft.category,
        title: draft.title,
        date: draft.date,
        deadline: draft.deadline,
        amount: draft.amount,
        action_needed: draft.action_needed,
        info_type: message.info_type,
        source,
        sources: [source],
      });
    }
  }
  return { items, skippedChatter: 0 };
}

export function extractHeuristic(
  messages: NormalizedMessage[],
  config: AppConfig,
  asOf: Date,
): { items: DigestItem[]; skippedChatter: number } {
  const items: DigestItem[] = [];
  let skippedChatter = 0;
  const ordered = [...messages].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));
  for (const message of ordered) {
    for (const block of splitBlocks(message.body)) {
      const extracted = itemsFromBlock(block, message, config, asOf);
      items.push(...extracted.items);
      skippedChatter += extracted.skippedChatter;
    }
  }
  return { items, skippedChatter };
}
