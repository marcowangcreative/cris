import { dedupeItems } from "./dedupe";
import { decorateMessage, isIgnored, passesAllowlist } from "./filter";
import { ingestGmail } from "./gmail";
import { extractHeuristic } from "./heuristic";
import { ingestDropDir, ingestWhatsAppDir } from "./ingest";
import { extractWithLlm, resolveLlmSettings } from "./llm";
import { renderHtml, renderMarkdown, type DigestStats } from "./render";
import { renderIcs } from "./ics";
import { inWindow, windowBounds } from "./time";
import type { AppConfig, DigestItem, NormalizedMessage } from "./types";

export interface RunOptions {
  config: AppConfig;
  root: string;
  asOf: Date;
  extractor: "heuristic" | "llm";
  whatsappDir: string;
  dropDir: string;
  includeGmail: boolean;
  strictFolders: boolean;
}

export interface DigestResult {
  items: DigestItem[];
  markdown: string;
  html: string;
  ics: string;
  stats: DigestStats;
  messages: NormalizedMessage[];
}

export async function runDigest(options: RunOptions): Promise<DigestResult> {
  const raw = [
    ...ingestWhatsAppDir(options.whatsappDir, options.config, options.strictFolders),
    ...(await ingestDropDir(options.dropDir, options.config, options.strictFolders)),
  ];
  if (options.includeGmail) {
    raw.push(...(await ingestGmail(options.root, options.config, options.asOf)));
  }

  const decorated = raw.map((message) => decorateMessage(message, options.config));
  const bounds = windowBounds(options.asOf, options.config.window_days);
  let outsideWindow = 0;
  let ignored = 0;
  let unlisted = 0;
  const kept: NormalizedMessage[] = [];
  for (const message of decorated) {
    if (!inWindow(message.date, bounds)) {
      outsideWindow += 1;
      continue;
    }
    if (isIgnored(message, options.config)) {
      ignored += 1;
      continue;
    }
    if (!passesAllowlist(message, options.config)) {
      unlisted += 1;
      continue;
    }
    kept.push(message);
  }

  const extracted =
    options.extractor === "llm"
      ? await extractWithLlm(kept, options.config, options.asOf)
      : extractHeuristic(kept, options.config, options.asOf);
  const items = dedupeItems(extracted.items);
  const settings = options.extractor === "llm" ? resolveLlmSettings(options.config) : null;
  const stats: DigestStats = {
    outsideWindow,
    ignored,
    unlisted,
    skippedChatter: extracted.skippedChatter,
    extractor: options.extractor,
    extractorDetail:
      options.extractor === "llm"
        ? `Model ${settings?.model ?? ""} via ${settings?.provider ?? "the configured provider"}.`
        : "Offline heuristic. No model was called. Set LLM_API_KEY and run without --extractor heuristic to use a model.",
    asOf: options.asOf.toISOString(),
    windowStart: bounds.start.toISOString(),
  };

  return {
    items,
    markdown: renderMarkdown(items, options.config, stats),
    html: renderHtml(items, options.config, stats),
    ics: renderIcs(items, options.config, options.asOf),
    stats,
    messages: kept,
  };
}
