import { createHash } from "node:crypto";
import { childById } from "./config";
import { escapeIcs } from "./text";
import { formatSource } from "./render";
import { zonedTimeToUtc } from "./time";
import type { AppConfig, DigestItem } from "./types";

function fold(line: string): string {
  if (Buffer.byteLength(line) <= 75) return line;
  const chunks: string[] = [];
  let start = 0;
  while (start < line.length) {
    const budget = chunks.length === 0 ? 75 : 74;
    let end = start;
    let size = 0;
    while (end < line.length) {
      const charSize = Buffer.byteLength(line[end]);
      if (size + charSize > budget) break;
      size += charSize;
      end += 1;
    }
    if (end === start) end += 1;
    const piece = line.slice(start, end);
    chunks.push(chunks.length === 0 ? piece : ` ${piece}`);
    start = end;
  }
  return chunks.join("\r\n");
}

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function nextDay(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function civilToUtc(value: string, timeZone: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Expected a civil date-time, got "${value}".`);
  return zonedTimeToUtc(
    {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
      second: 0,
    },
    timeZone,
  );
}

function summary(item: DigestItem, config: AppConfig): string {
  const name = item.child === "unclear" ? "Unclear" : childById(config, item.child)?.name ?? item.child;
  const prefix =
    item.child === "unclear" ? "Unclear: " : item.info_type === "parent_chatter" ? "Unconfirmed (parent chat): " : "";
  const title = item.title.length > 120 ? `${item.title.slice(0, 119)}…` : item.title;
  return `${prefix}${name}: ${title}`;
}

function description(item: DigestItem, config: AppConfig): string {
  const lines = [item.title];
  if (item.action_needed) lines.push(`Action: ${item.action_needed}`);
  if (item.amount) lines.push(`Amount: ${item.amount}`);
  for (const source of item.sources) lines.push(formatSource(source, config.timezone));
  return lines.join("\n");
}

export function renderIcs(items: DigestItem[], config: AppConfig, asOf: Date): string {
  const dated = items
    .filter((item) => item.deadline || item.date)
    .sort((left, right) => (left.deadline ?? left.date ?? "").localeCompare(right.deadline ?? right.date ?? "") || left.title.localeCompare(right.title));
  const events = dated.map((item) => {
    const when = (item.deadline ?? item.date) as string;
    const hash = createHash("sha1").update(`${item.child}|${item.title}|${when}`).digest("hex").slice(0, 16);
    let start: string;
    let end: string;
    if (when.includes("T")) {
      const utc = civilToUtc(when, config.timezone);
      start = `DTSTART:${stamp(utc)}`;
      end = `DTEND:${stamp(new Date(utc.getTime() + 60 * 60 * 1000))}`;
    } else {
      const compact = when.slice(0, 10).replace(/-/g, "");
      start = `DTSTART;VALUE=DATE:${compact}`;
      end = `DTEND;VALUE=DATE:${nextDay(when.slice(0, 10))}`;
    }
    return [
      "BEGIN:VEVENT",
      `UID:school-digest-${hash}@local`,
      `DTSTAMP:${stamp(asOf)}`,
      start,
      end,
      `SUMMARY:${escapeIcs(summary(item, config))}`,
      `DESCRIPTION:${escapeIcs(description(item, config))}`,
      "END:VEVENT",
    ].map(fold);
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//school-digest//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:School digest",
    ...events.flat(),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
