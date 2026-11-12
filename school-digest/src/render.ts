import { childById } from "./config";
import { escapeHtml, shortFrom } from "./text";
import { formatCivilLabel, formatInstant } from "./time";
import type { AppConfig, DigestItem, SourceRef } from "./types";

export interface DigestStats {
  outsideWindow: number;
  ignored: number;
  unlisted: number;
  skippedChatter: number;
  extractor: "heuristic" | "llm";
  extractorDetail: string;
  asOf: string;
  windowStart: string;
}

function whenKey(item: DigestItem): string {
  return item.deadline ?? item.date ?? "9999-99-99";
}

export function sortItems(items: DigestItem[]): DigestItem[] {
  return [...items].sort(
    (left, right) =>
      whenKey(left).localeCompare(whenKey(right)) ||
      left.child.localeCompare(right.child) ||
      left.title.localeCompare(right.title) ||
      left.source.message_id.localeCompare(right.source.message_id),
  );
}

export function childLabel(config: AppConfig, id: string): string {
  if (id === "unclear") return "Unclear";
  return childById(config, id)?.name ?? id;
}

function whenLabel(item: DigestItem): string {
  const parts: string[] = [];
  if (item.deadline) parts.push(`due ${formatCivilLabel(item.deadline)}`);
  else if (item.date) parts.push(formatCivilLabel(item.date));
  if (item.amount) parts.push(item.amount);
  return parts.join(" · ");
}

export function formatSource(source: SourceRef, timeZone: string): string {
  const when = formatInstant(source.message_date, timeZone);
  if (source.kind === "whatsapp") {
    const where = source.sender_or_group;
    const who = source.sender && source.sender !== where ? `${source.sender} in ${where}` : where;
    return `WhatsApp · ${who} · ${when}`;
  }
  const channel = source.kind === "email" ? "Email" : "Saved file";
  const account = source.account ? ` (${source.account})` : "";
  const subject = source.subject ? ` · "${source.subject}"` : "";
  return `${channel}${account} · ${shortFrom(source.sender)}${subject} · ${when}`;
}

function isMoney(item: DigestItem): boolean {
  if (!item.amount) return false;
  return item.category === "payment" || /\b(due|fee|tuition|invoice|balance|pay)\b/i.test(`${item.title} ${item.action_needed ?? ""}`);
}

function calendarWhen(item: DigestItem): string | null {
  return item.deadline ?? item.date;
}

function cell(value: string): string {
  return value.replace(/\|/g, "/").replace(/\n/g, " ");
}

function sourceLines(item: DigestItem, timeZone: string, indent: string): string[] {
  const [first, ...rest] = item.sources;
  const lines = [`${indent}- ${formatSource(first ?? item.source, timeZone)}`];
  for (const source of rest) lines.push(`${indent}- Also: ${formatSource(source, timeZone)}`);
  return lines;
}

function itemBlock(item: DigestItem, config: AppConfig, heading: string): string[] {
  const when = whenLabel(item);
  const lines = [`- **${heading}** ${item.title}${when ? ` _(${when})_` : ""}`];
  lines.push(...sourceLines(item, config.timezone, "  "));
  return lines;
}

function statsLines(stats: DigestStats): string[] {
  const bits: string[] = [];
  if (stats.outsideWindow) {
    bits.push(`Left out ${stats.outsideWindow} message${stats.outsideWindow === 1 ? "" : "s"} older or newer than the window.`);
  }
  if (stats.ignored) {
    bits.push(`Ignored ${stats.ignored} routine message${stats.ignored === 1 ? "" : "s"} (pickup confirmations and similar).`);
  }
  if (stats.unlisted) {
    bits.push(`Left ${stats.unlisted} Gmail message${stats.unlisted === 1 ? "" : "s"} out of the sender and keyword allowlist.`);
  }
  if (stats.skippedChatter) {
    bits.push(`Set aside ${stats.skippedChatter} parent-chat message${stats.skippedChatter === 1 ? "" : "s"} with no date, payment, or ask.`);
  }
  if (bits.length === 0) bits.push("Every message in the window was kept for extraction.");
  return bits;
}

export function renderMarkdown(items: DigestItem[], config: AppConfig, stats: DigestStats): string {
  const sorted = sortItems(items);
  const lines: string[] = [];
  const children = config.children
    .map((child) => `${child.name} (${child.grade}, ${child.program})`)
    .join("; ");
  lines.push("# School digest", "");
  lines.push(`**Week covered:** ${formatInstant(stats.windowStart, config.timezone)} – ${formatInstant(stats.asOf, config.timezone)} (${config.timezone})`);
  lines.push(`**Children:** ${children}`);
  lines.push(`**Extractor:** ${stats.extractorDetail}`);
  lines.push("");
  lines.push("Do first is the action list. Money and the calendar repeat items that also appear under a child. Parent-chat notes stay separate from official school info. A message that does not name one child is listed under Unclear.");
  lines.push("");

  const doFirst = sorted.filter((item) => item.action_needed);
  lines.push("## Do first", "");
  if (doFirst.length === 0) lines.push("_Nothing to sign, pay, send, or answer this week._", "");
  doFirst.forEach((item, index) => {
    const tag = item.info_type === "parent_chatter" ? " (parent chat)" : item.child === "unclear" ? " (unclear who)" : "";
    const when = whenLabel(item);
    lines.push(`${index + 1}. **${childLabel(config, item.child)}**${tag} — ${item.action_needed}${when ? ` — ${when}` : ""}`);
    lines.push(`   ${item.title}`);
    lines.push(...sourceLines(item, config.timezone, "   "));
    lines.push("");
  });

  for (const child of config.children) {
    const mine = sorted.filter((item) => item.child === child.id);
    const official = mine.filter((item) => item.info_type !== "parent_chatter");
    const chatter = mine.filter((item) => item.info_type === "parent_chatter");
    lines.push(`## ${child.name} — ${child.grade}, ${child.program}`, "");
    lines.push("### Official", "");
    if (official.length === 0) lines.push("_Nothing from the school this week._", "");
    for (const item of official) {
      lines.push(...itemBlock(item, config, item.action_needed ? `${item.action_needed}.` : "Note."));
      lines.push("");
    }
    lines.push("### From the parent chat", "");
    if (chatter.length === 0) lines.push("_No actionable parent-chat notes._", "");
    for (const item of chatter) {
      lines.push(...itemBlock(item, config, item.action_needed ? `${item.action_needed}.` : "Note."));
      lines.push("");
    }
  }

  const money = sorted.filter(isMoney);
  lines.push("## Money", "");
  if (money.length === 0) {
    lines.push("_No payments due._", "");
  } else {
    lines.push("| Child | What | Amount | Due | Source |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const item of money) {
      const due = item.deadline ? formatCivilLabel(item.deadline) : item.date ? formatCivilLabel(item.date) : "";
      lines.push(
        `| ${cell(childLabel(config, item.child))} | ${cell(item.title)} | ${cell(item.amount ?? "")} | ${cell(due)} | ${cell(formatSource(item.source, config.timezone))} |`,
      );
    }
    lines.push("");
  }

  const calendar = sorted.filter((item) => calendarWhen(item));
  lines.push("## Calendar candidates", "");
  lines.push("These are dated items worth a look before they go on a calendar. Parent-chat rows are unconfirmed.");
  lines.push("");
  if (calendar.length === 0) {
    lines.push("_No dated items._", "");
  } else {
    lines.push("| When | Child | What | Kind | Source |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const item of calendar) {
      const when = formatCivilLabel(calendarWhen(item) as string);
      const kind = item.info_type === "parent_chatter" ? "parent chat" : item.info_type === "official" ? "official" : "unknown";
      lines.push(
        `| ${cell(when)} | ${cell(childLabel(config, item.child))} | ${cell(item.title)} | ${kind} | ${cell(formatSource(item.source, config.timezone))} |`,
      );
    }
    lines.push("");
  }

  const unclear = sorted.filter((item) => item.child === "unclear");
  lines.push("## Unclear", "");
  lines.push("These messages did not name one child.");
  lines.push("");
  if (unclear.length === 0) lines.push("_Nothing unclear._", "");
  for (const item of unclear) {
    lines.push(...itemBlock(item, config, item.action_needed ? `${item.action_needed}.` : "Note."));
    lines.push("");
  }

  lines.push("---", "");
  for (const bit of statsLines(stats)) lines.push(bit);
  lines.push("");
  lines.push("Import the .ics only after you scan Calendar candidates. Events from a parent chat are prefixed \"Unconfirmed (parent chat)\".");
  lines.push("");
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

function htmlSource(item: DigestItem, timeZone: string): string {
  return item.sources
    .map((source, index) => {
      const text = escapeHtml(formatSource(source, timeZone));
      return index === 0 ? text : `Also: ${text}`;
    })
    .join("<br>");
}

function htmlItem(item: DigestItem, config: AppConfig): string {
  const when = whenLabel(item);
  const action = item.action_needed ? `<strong>${escapeHtml(item.action_needed)}.</strong> ` : "";
  const meta = when ? ` <span style="color:#57534e;">(${escapeHtml(when)})</span>` : "";
  return `<div style="background:#fff;border:1px solid #e7e5e4;border-radius:10px;padding:12px 14px;margin:0 0 10px;">
    <div style="font-size:15px;line-height:1.45;">${action}${escapeHtml(item.title)}${meta}</div>
    <div style="margin-top:6px;font-size:12px;line-height:1.4;color:#57534e;">${htmlSource(item, config.timezone)}</div>
  </div>`;
}

export function renderHtml(items: DigestItem[], config: AppConfig, stats: DigestStats): string {
  const sorted = sortItems(items);
  const doFirst = sorted.filter((item) => item.action_needed);
  const money = sorted.filter(isMoney);
  const calendar = sorted.filter((item) => calendarWhen(item));
  const unclear = sorted.filter((item) => item.child === "unclear");

  const childSections = config.children.map((child) => {
    const mine = sorted.filter((item) => item.child === child.id);
    const official = mine.filter((item) => item.info_type !== "parent_chatter");
    const chatter = mine.filter((item) => item.info_type === "parent_chatter");
    const block = (list: DigestItem[], empty: string) =>
      list.length === 0 ? `<p style="color:#57534e;margin:0 0 12px;">${empty}</p>` : list.map((item) => htmlItem(item, config)).join("");
    return `<h2 style="font-size:20px;margin:28px 0 8px;">${escapeHtml(child.name)} — ${escapeHtml(child.grade)}, ${escapeHtml(child.program)}</h2>
      <h3 style="font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#44403c;margin:12px 0 8px;">Official</h3>
      ${block(official, "Nothing from the school this week.")}
      <h3 style="font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#44403c;margin:12px 0 8px;">From the parent chat</h3>
      ${block(chatter, "No actionable parent-chat notes.")}`;
  });

  const table = (headers: string[], rows: string[][]) => {
    if (rows.length === 0) return `<p style="color:#57534e;">None this week.</p>`;
    const head = headers.map((header) => `<th style="text-align:left;padding:6px 8px;border-bottom:1px solid #d6d3d1;">${escapeHtml(header)}</th>`).join("");
    const body = rows
      .map(
        (row) =>
          `<tr>${row.map((value) => `<td style="padding:6px 8px;border-bottom:1px solid #f5f5f4;vertical-align:top;">${escapeHtml(value)}</td>`).join("")}</tr>`,
      )
      .join("");
    return `<table style="width:100%;border-collapse:collapse;font-size:14px;">${head ? `<thead><tr>${head}</tr></thead>` : ""}${body}</table>`;
  };

  const moneyRows = money.map((item) => [
    childLabel(config, item.child),
    item.title,
    item.amount ?? "",
    item.deadline ? formatCivilLabel(item.deadline) : item.date ? formatCivilLabel(item.date) : "",
    formatSource(item.source, config.timezone),
  ]);
  const calendarRows = calendar.map((item) => [
    formatCivilLabel(calendarWhen(item) as string),
    childLabel(config, item.child),
    item.title,
    item.info_type === "parent_chatter" ? "parent chat" : item.info_type,
    formatSource(item.source, config.timezone),
  ]);

  const doFirstHtml =
    doFirst.length === 0
      ? `<p style="color:#57534e;">Nothing to sign, pay, send, or answer this week.</p>`
      : `<ol style="margin:0;padding-left:18px;">${doFirst
          .map((item) => {
            const tag = item.info_type === "parent_chatter" ? " (parent chat)" : item.child === "unclear" ? " (unclear who)" : "";
            const when = whenLabel(item);
            return `<li style="margin:0 0 12px;"><strong>${escapeHtml(childLabel(config, item.child))}</strong>${escapeHtml(tag)} — ${escapeHtml(item.action_needed ?? "")}${when ? ` — ${escapeHtml(when)}` : ""}<div style="margin-top:4px;">${escapeHtml(item.title)}</div><div style="margin-top:4px;font-size:12px;color:#57534e;">${htmlSource(item, config.timezone)}</div></li>`;
          })
          .join("")}</ol>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>School digest</title>
</head>
<body style="margin:0;padding:0;background:#f6f3ee;color:#1c1917;">
  <div style="max-width:680px;margin:0 auto;padding:24px 16px 48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9a3412;">School digest</p>
    <h1 style="font-size:28px;line-height:1.2;margin:6px 0 8px;">Week of ${escapeHtml(formatInstant(stats.windowStart, config.timezone))} – ${escapeHtml(formatInstant(stats.asOf, config.timezone))}</h1>
    <p style="margin:0 0 8px;color:#44403c;">${escapeHtml(config.timezone)}. ${escapeHtml(stats.extractorDetail)}</p>
    <p style="margin:0 0 20px;color:#44403c;font-size:14px;line-height:1.5;">Do first is the action list. A message that does not name one child is listed under Unclear.</p>
    <h2 style="font-size:18px;margin:0 0 8px;color:#9a3412;">Do first</h2>
    ${doFirstHtml}
    ${childSections.join("")}
    <h2 style="font-size:18px;margin:28px 0 8px;color:#854d0e;">Money</h2>
    ${table(["Child", "What", "Amount", "Due", "Source"], moneyRows)}
    <h2 style="font-size:18px;margin:28px 0 8px;color:#1e3a5f;">Calendar candidates</h2>
    <p style="margin:0 0 8px;color:#44403c;font-size:14px;">Review these before importing the calendar file. Parent-chat rows are unconfirmed.</p>
    ${table(["When", "Child", "What", "Kind", "Source"], calendarRows)}
    <h2 style="font-size:18px;margin:28px 0 8px;color:#57534e;">Unclear</h2>
    ${unclear.length === 0 ? `<p style="color:#57534e;">Nothing unclear.</p>` : unclear.map((item) => htmlItem(item, config)).join("")}
    <hr style="border:none;border-top:1px solid #e7e5e4;margin:28px 0;">
    ${statsLines(stats).map((line) => `<p style="margin:0 0 6px;font-size:13px;color:#57534e;">${escapeHtml(line)}</p>`).join("")}
  </div>
</body>
</html>
`;
}
