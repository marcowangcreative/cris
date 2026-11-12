import { draftsToItems, parseLlmPayload } from "./schema";
import { redactSecrets } from "./text";
import type { AppConfig, DigestItem, NormalizedMessage } from "./types";

const BATCH = 8;

export interface LlmSettings {
  provider: "openai" | "anthropic" | "openai-compatible";
  model: string;
  baseUrl: string;
  apiKey: string;
}

export function resolveLlmSettings(config: AppConfig): LlmSettings {
  const provider = (process.env.LLM_PROVIDER?.trim() || config.llm.provider) as LlmSettings["provider"];
  if (provider !== "openai" && provider !== "anthropic" && provider !== "openai-compatible") {
    throw new Error('LLM_PROVIDER must be "openai", "anthropic", or "openai-compatible".');
  }
  return {
    provider,
    model: process.env.LLM_MODEL?.trim() || config.llm.model,
    baseUrl: (process.env.LLM_BASE_URL?.trim() || config.llm.base_url).replace(/\/$/, ""),
    apiKey: process.env.LLM_API_KEY?.trim() ?? "",
  };
}

function systemPrompt(config: AppConfig): string {
  const children = config.children
    .map((child) => `${child.id} (${child.name}, ${child.grade}, ${child.program}; keywords: ${child.keywords.join(", ")})`)
    .join("\n");
  return [
    "You extract actionable school updates from a parent's messages.",
    "Return only JSON: {\"items\":[...]}.",
    "Each item has: message_id, child, category, title, date, deadline, amount, action_needed, info_type.",
    `child is one of: ${config.children.map((child) => child.id).join(", ")}, or "unclear".`,
    "Use unclear when the message does not name exactly one child, grade, program, or configured keyword, and it is not in that child's WhatsApp group or from a domain listed for only that child. Never guess.",
    "If one message clearly applies to several children, emit one item per child. If you cannot tell who it is for, emit one item with child unclear.",
    "Categories: deadline, event, closure, schedule_change, payment, form, supplies, homework, reply_needed.",
    "Skip routine noise and pure social chatter (lost water bottles, questions with no date or ask).",
    "Keep a parent-chat message when it states a date, a payment, or something the parent must do.",
    "info_type is official, parent_chatter, or unknown. For WhatsApp, the supplied info_hint is already decided from the sender list; copy it.",
    `Dates are school-local in ${config.timezone}: YYYY-MM-DD, or YYYY-MM-DDTHH:mm when a clock time is stated. Do not invent dates. Use null when there is no date.`,
    "Put due dates and sign-up close dates in deadline. Put events, closures, and schedule changes in date.",
    "amount is like \"$12\" or \"$180.00\", or null.",
    "action_needed is a short imperative when the parent must do something, otherwise null.",
    "title is one concise sentence from the message, not a paraphrase that adds facts.",
    "message_id must be copied from the input.",
    "",
    "Children:",
    children,
  ].join("\n");
}

function payloadFor(messages: NormalizedMessage[], config: AppConfig, asOf: Date): string {
  return JSON.stringify({
    timezone: config.timezone,
    as_of: asOf.toISOString(),
    messages: messages.map((message) => ({
      message_id: message.id,
      kind: message.kind,
      sender: message.person || message.sender,
      group: message.group ?? null,
      subject: message.subject ?? null,
      date: message.date.toISOString(),
      info_hint: message.info_type,
      likely_children: message.fallback_children,
      body: message.body.slice(0, 4000),
    })),
  });
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<{ status: number; text: string }> {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  return { status: response.status, text: await response.text() };
}

async function complete(settings: LlmSettings, system: string, user: string): Promise<string> {
  if (!settings.apiKey) {
    throw new Error("LLM_API_KEY is not set. Add it to .env, or run with --extractor heuristic.");
  }
  if (settings.provider === "anthropic") {
    const result = await postJson(
      "https://api.anthropic.com/v1/messages",
      {
        "content-type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
      },
      {
        model: settings.model,
        max_tokens: 4096,
        temperature: 0,
        system,
        messages: [{ role: "user", content: user }],
      },
    );
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Model request failed (${result.status}): ${redactSecrets(result.text).slice(0, 300)}`);
    }
    const parsed = JSON.parse(result.text) as { content?: { text?: string }[] };
    const text = parsed.content?.map((part) => part.text ?? "").join("\n") ?? "";
    if (!text.trim()) throw new Error("The model returned an empty response.");
    return text;
  }

  const body: Record<string, unknown> = {
    model: settings.model,
    temperature: 0,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  };
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${settings.apiKey}`,
  };
  let result = await postJson(`${settings.baseUrl}/chat/completions`, headers, body);
  if (result.status === 400 && result.text.includes("response_format")) {
    delete body.response_format;
    result = await postJson(`${settings.baseUrl}/chat/completions`, headers, body);
  }
  if ((result.status === 429 || result.status >= 500) && result.status !== 400) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    result = await postJson(`${settings.baseUrl}/chat/completions`, headers, body);
  }
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Model request failed (${result.status}): ${redactSecrets(result.text).slice(0, 300)}`);
  }
  const parsed = JSON.parse(result.text) as { choices?: { message?: { content?: string } }[] };
  const text = parsed.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("The model returned an empty response.");
  return text;
}

export async function extractWithLlm(
  messages: NormalizedMessage[],
  config: AppConfig,
  asOf: Date,
  settings = resolveLlmSettings(config),
): Promise<{ items: DigestItem[]; skippedChatter: number }> {
  if (!settings.apiKey) {
    throw new Error("LLM_API_KEY is not set. Add it to .env, or run with --extractor heuristic.");
  }
  const system = systemPrompt(config);
  const items: DigestItem[] = [];
  let rejected = 0;
  for (let index = 0; index < messages.length; index += BATCH) {
    const batch = messages.slice(index, index + BATCH);
    const text = await complete(settings, system, payloadFor(batch, config, asOf));
    const converted = draftsToItems(parseLlmPayload(text), batch, config);
    items.push(...converted.items);
    rejected += converted.rejected;
  }
  if (rejected > 0) {
    console.warn(`Dropped ${rejected} model item${rejected === 1 ? "" : "s"} that did not match the schema.`);
  }
  return { items, skippedChatter: 0 };
}
