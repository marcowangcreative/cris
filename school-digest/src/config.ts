import fs from "node:fs";
import path from "node:path";
import { assertTimeZone } from "./time";
import type { AppConfig, ChildConfig } from "./types";

const SECRET_KEYS = new Set([
  "api_key",
  "apikey",
  "token",
  "access_token",
  "refresh_token",
  "client_secret",
  "password",
  "secret",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertNoSecrets(value: unknown, at = "config"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecrets(entry, `${at}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (SECRET_KEYS.has(key.toLowerCase()) && entry) {
      throw new Error(`Remove "${key}" from ${at}. Secrets belong in .env, which is gitignored.`);
    }
    assertNoSecrets(entry, `${at}.${key}`);
  }
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Config field ${field} must be a non-empty string.`);
  }
  return value.trim();
}

function asStringList(value: unknown, field: string): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`Config field ${field} must be a list of strings.`);
  }
  return value.map((entry) => entry.trim()).filter(Boolean);
}

function parseChild(value: unknown, index: number): ChildConfig {
  if (!isRecord(value)) throw new Error(`children[${index}] must be an object.`);
  const id = asString(value.id, `children[${index}].id`);
  if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(id)) {
    throw new Error(`children[${index}].id must be a lowercase slug such as "kid-a".`);
  }
  return {
    id,
    name: asString(value.name, `children[${index}].name`),
    grade: asString(value.grade, `children[${index}].grade`),
    program: asString(value.program, `children[${index}].program`),
    sender_domains: asStringList(value.sender_domains, `children[${index}].sender_domains`).map((d) => d.toLowerCase()),
    keywords: asStringList(value.keywords, `children[${index}].keywords`),
    whatsapp_groups: asStringList(value.whatsapp_groups, `children[${index}].whatsapp_groups`),
  };
}

export function parseConfig(raw: unknown): AppConfig {
  assertNoSecrets(raw);
  if (!isRecord(raw)) throw new Error("Config must be a JSON object.");
  const timezone = asString(raw.timezone, "timezone");
  assertTimeZone(timezone);

  const childrenRaw = raw.children;
  if (!Array.isArray(childrenRaw) || childrenRaw.length === 0) {
    throw new Error("Config field children must list at least one child.");
  }
  const children = childrenRaw.map(parseChild);
  const ids = new Set<string>();
  for (const child of children) {
    if (ids.has(child.id)) throw new Error(`Duplicate child id "${child.id}".`);
    ids.add(child.id);
  }

  const windowDays = raw.window_days == null ? 7 : raw.window_days;
  if (typeof windowDays !== "number" || !Number.isInteger(windowDays) || windowDays < 1 || windowDays > 60) {
    throw new Error("window_days must be an integer from 1 to 60.");
  }

  const dateOrder = raw.date_order == null ? "MDY" : raw.date_order;
  if (dateOrder !== "MDY" && dateOrder !== "DMY") {
    throw new Error('date_order must be "MDY" or "DMY".');
  }

  const accountsRaw = raw.gmail_accounts == null ? [] : raw.gmail_accounts;
  if (!Array.isArray(accountsRaw)) throw new Error("gmail_accounts must be a list.");
  const gmailAccounts = accountsRaw.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`gmail_accounts[${index}] must be an object.`);
    const id = asString(entry.id, `gmail_accounts[${index}].id`);
    if (!/^[a-z0-9][a-z0-9_-]{0,40}$/.test(id)) {
      throw new Error(`gmail_accounts[${index}].id must be a lowercase slug such as "inbox-a".`);
    }
    return { id };
  });

  const ignoreRaw = isRecord(raw.ignore) ? raw.ignore : {};
  const pathsRaw = isRecord(raw.paths) ? raw.paths : {};
  const llmRaw = isRecord(raw.llm) ? raw.llm : {};
  const deliveryRaw = isRecord(raw.delivery) ? raw.delivery : {};

  const provider = llmRaw.provider == null ? "openai" : llmRaw.provider;
  if (provider !== "openai" && provider !== "anthropic" && provider !== "openai-compatible") {
    throw new Error('llm.provider must be "openai", "anthropic", or "openai-compatible".');
  }

  const mode = deliveryRaw.mode == null ? "file" : deliveryRaw.mode;
  if (mode !== "file" && mode !== "gmail") {
    throw new Error('delivery.mode must be "file" or "gmail".');
  }

  const config: AppConfig = {
    timezone,
    window_days: windowDays,
    date_order: dateOrder,
    gmail_accounts: gmailAccounts,
    children,
    official_whatsapp_senders: asStringList(raw.official_whatsapp_senders, "official_whatsapp_senders"),
    official_email_domains: asStringList(raw.official_email_domains, "official_email_domains").map((d) => d.toLowerCase()),
    also_include_sender_domains: asStringList(raw.also_include_sender_domains, "also_include_sender_domains").map((d) =>
      d.toLowerCase(),
    ),
    ignore: {
      sender_domains: asStringList(ignoreRaw.sender_domains, "ignore.sender_domains").map((d) => d.toLowerCase()),
      sender_addresses: asStringList(ignoreRaw.sender_addresses, "ignore.sender_addresses").map((d) => d.toLowerCase()),
      subject_keywords: asStringList(ignoreRaw.subject_keywords, "ignore.subject_keywords"),
      body_keywords: asStringList(ignoreRaw.body_keywords, "ignore.body_keywords"),
    },
    paths: {
      whatsapp_dir: asString(pathsRaw.whatsapp_dir ?? "inbox/whatsapp", "paths.whatsapp_dir"),
      drop_dir: asString(pathsRaw.drop_dir ?? "inbox/drop", "paths.drop_dir"),
      output_dir: asString(pathsRaw.output_dir ?? "out", "paths.output_dir"),
    },
    llm: {
      provider,
      model: typeof llmRaw.model === "string" && llmRaw.model.trim() ? llmRaw.model.trim() : defaultModel(provider),
      base_url:
        typeof llmRaw.base_url === "string" && llmRaw.base_url.trim()
          ? llmRaw.base_url.trim().replace(/\/$/, "")
          : "https://api.openai.com/v1",
    },
    delivery: {
      mode,
      to: typeof deliveryRaw.to === "string" ? deliveryRaw.to.trim() : "",
      from_account: typeof deliveryRaw.from_account === "string" ? deliveryRaw.from_account.trim() : "",
      write_ics: deliveryRaw.write_ics == null ? true : Boolean(deliveryRaw.write_ics),
    },
  };

  if (config.delivery.mode === "gmail") {
    if (!config.delivery.to) throw new Error("delivery.to is required when delivery.mode is gmail.");
    if (!config.delivery.from_account) {
      throw new Error("delivery.from_account is required when delivery.mode is gmail.");
    }
  }
  return config;
}

function defaultModel(provider: AppConfig["llm"]["provider"]): string {
  return provider === "anthropic" ? "claude-3-5-haiku-latest" : "gpt-4o-mini";
}

export function resolveConfigPaths(config: AppConfig, root: string): AppConfig {
  return {
    ...config,
    paths: {
      whatsapp_dir: path.resolve(root, config.paths.whatsapp_dir),
      drop_dir: path.resolve(root, config.paths.drop_dir),
      output_dir: path.resolve(root, config.paths.output_dir),
    },
  };
}

export function loadConfig(file: string, root: string): AppConfig {
  if (!fs.existsSync(file)) {
    throw new Error(`Config not found at ${file}. Copy config.example.json to config.json and edit the copy.`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse ${file}: ${message}`);
  }
  return resolveConfigPaths(parseConfig(raw), root);
}

export function childById(config: AppConfig, id: string): ChildConfig | undefined {
  return config.children.find((child) => child.id === id);
}
