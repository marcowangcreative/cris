import type { Category, DigestItem, InfoType, SourceRef } from "./types";

const STOP = new Set([
  "the",
  "a",
  "an",
  "for",
  "and",
  "or",
  "to",
  "of",
  "on",
  "in",
  "is",
  "are",
  "was",
  "were",
  "please",
  "this",
  "that",
  "with",
  "by",
  "at",
  "be",
  "it",
  "your",
  "you",
  "our",
  "we",
  "they",
  "their",
  "from",
  "as",
  "if",
  "not",
  "has",
  "have",
  "had",
  "but",
  "too",
  "also",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "jan",
  "feb",
  "mar",
  "apr",
  "jun",
  "jul",
  "aug",
  "sep",
  "sept",
  "oct",
  "nov",
  "dec",
  "due",
]);

const FAMILIES: Category[][] = [
  ["form", "payment", "deadline"],
  ["homework", "supplies", "deadline"],
  ["closure", "schedule_change"],
  ["event", "reply_needed", "deadline"],
  ["reply_needed", "form"],
];

function stem(token: string): string {
  if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function titleTokens(title: string): Set<string> {
  const out = new Set<string>();
  for (const raw of title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) {
    if (raw.length <= 2) continue;
    const token = stem(raw);
    if (STOP.has(token)) continue;
    out.add(token);
  }
  return out;
}

export function titlesSimilar(left: string, right: string): boolean {
  const a = titleTokens(left);
  const b = titleTokens(right);
  if (a.size === 0 || b.size === 0) return false;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  const union = a.size + b.size - overlap;
  const jaccard = overlap / union;
  const contain = overlap / Math.min(a.size, b.size);
  return (overlap >= 3 && (jaccard >= 0.5 || contain >= 0.6)) || (overlap >= 2 && contain >= 0.8);
}

function sameFamily(left: Category, right: Category): boolean {
  if (left === right) return true;
  return FAMILIES.some((family) => family.includes(left) && family.includes(right));
}

function dateKey(item: DigestItem): string | null {
  const value = item.deadline ?? item.date;
  return value ? value.slice(0, 10) : null;
}

export function isDuplicate(left: DigestItem, right: DigestItem): boolean {
  if (left.child !== right.child) return false;
  if (left.amount && right.amount && left.amount !== right.amount) return false;
  const leftDate = dateKey(left);
  const rightDate = dateKey(right);
  if (leftDate && rightDate && leftDate !== rightDate) return false;
  if (!sameFamily(left.category, right.category)) return false;
  return titlesSimilar(left.title, right.title);
}

function sourceRank(source: SourceRef): number {
  const info = source.info_type === "official" ? 30 : source.info_type === "unknown" ? 10 : 0;
  return info + (source.kind === "whatsapp" ? 0 : 5);
}

function compareSources(left: SourceRef, right: SourceRef): number {
  const rank = sourceRank(right) - sourceRank(left);
  if (rank !== 0) return rank;
  const date = left.message_date.localeCompare(right.message_date);
  if (date !== 0) return date;
  return left.message_id.localeCompare(right.message_id);
}

function infoRank(info: InfoType): number {
  if (info === "official") return 2;
  if (info === "unknown") return 1;
  return 0;
}

function preferWhen(values: (string | null)[]): string | null {
  const present = values.filter((value): value is string => Boolean(value));
  if (present.length === 0) return null;
  return present.find((value) => value.includes("T")) ?? present[0];
}

function mergeCluster(items: DigestItem[]): DigestItem {
  const ranked = [...items].sort((left, right) => compareSources(left.source, right.source));
  const primary = ranked[0];
  const sources: SourceRef[] = [];
  const seen = new Set<string>();
  for (const item of ranked) {
    for (const source of [...item.sources].sort(compareSources)) {
      const key = `${source.message_id}|${source.sender}|${source.message_date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push(source);
    }
  }
  sources.sort(compareSources);
  const info = sources.reduce<InfoType>((best, source) => (infoRank(source.info_type) > infoRank(best) ? source.info_type : best), "parent_chatter");
  return {
    ...primary,
    category: primary.category,
    title: primary.title,
    date: preferWhen(ranked.map((item) => item.date)),
    deadline: preferWhen(ranked.map((item) => item.deadline)),
    amount: ranked.find((item) => item.amount)?.amount ?? null,
    action_needed: primary.action_needed ?? ranked.find((item) => item.action_needed)?.action_needed ?? null,
    info_type: info,
    source: sources[0] ?? primary.source,
    sources,
  };
}

export function dedupeItems(items: DigestItem[]): DigestItem[] {
  const ordered = [...items].sort(
    (left, right) =>
      left.child.localeCompare(right.child) ||
      left.title.localeCompare(right.title) ||
      (left.deadline ?? left.date ?? "").localeCompare(right.deadline ?? right.date ?? "") ||
      left.source.message_id.localeCompare(right.source.message_id),
  );
  const clusters: DigestItem[][] = [];
  for (const item of ordered) {
    const cluster = clusters.find((existing) => existing.some((member) => isDuplicate(member, item)));
    if (cluster) cluster.push(item);
    else clusters.push([item]);
  }
  return clusters.map(mergeCluster);
}
