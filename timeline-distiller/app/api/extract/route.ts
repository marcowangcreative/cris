import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import mammoth from "mammoth";
import { extractText } from "unpdf";
import { enforceCitations } from "@/lib/citations";
import { buildTextPrompt, SYSTEM_PROMPT, VISION_PROMPT } from "@/lib/prompt";
import { extractionSchema } from "@/lib/schema";
import type { ModelExtraction } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 4_000_000;
const MAX_CHARS = 120_000;
const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("Send the timeline as a form upload.", 400);
  }

  const pasted = String(form.get("sourceText") ?? "");
  const uploaded = form.get("file");
  const file = uploaded instanceof File && uploaded.size > 0 ? uploaded : null;

  if (!file && !pasted.trim()) {
    return error("Paste a timeline or upload a PDF, Word doc, text file, or photo.", 400);
  }
  if (file && file.size > MAX_BYTES) {
    return error("That file is over 4 MB. Export a smaller PDF or paste the text.", 413);
  }
  if (pasted.length > MAX_CHARS) {
    return error("That paste is too long. Cut the vendor sections you already know you can ignore.", 413);
  }

  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return error(
      "No AI Gateway credential is set. Load the demo, or set AI_GATEWAY_API_KEY locally. On Vercel the project OIDC token is used.",
      503,
    );
  }

  try {
    const prepared = file ? await readFile(file) : { kind: "text" as const, text: pasted };
    if (prepared.kind === "text" && prepared.text.trim().length < 20) {
      return error(
        prepared.scanned
          ? "That PDF has almost no text layer. Upload a photo of it, or paste the text."
          : "That file didn't contain enough text to distill.",
        422,
      );
    }

    const modelId = process.env.AI_GATEWAY_MODEL?.trim() || DEFAULT_MODEL;
    const result =
      prepared.kind === "vision"
        ? await generateText({
            model: modelId,
            system: SYSTEM_PROMPT,
            maxOutputTokens: 8000,
            output: Output.object({
              name: "PhotographerTimeline",
              description: "Photographer-only wedding day sheet extracted from a planner timeline.",
              schema: extractionSchema,
            }),
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: VISION_PROMPT },
                  prepared.mediaType.startsWith("image/")
                    ? { type: "image", image: prepared.data, mediaType: prepared.mediaType }
                    : { type: "file", data: prepared.data, mediaType: prepared.mediaType },
                ],
              },
            ],
          })
        : await generateText({
            model: modelId,
            system: SYSTEM_PROMPT,
            maxOutputTokens: 8000,
            output: Output.object({
              name: "PhotographerTimeline",
              description: "Photographer-only wedding day sheet extracted from a planner timeline.",
              schema: extractionSchema,
            }),
            prompt: buildTextPrompt(prepared.text),
          });

    const raw = result.output;
    if (!raw) return error("The model didn't return a usable sheet. Try again.", 502);

    const extraction: ModelExtraction = {
      ...raw,
      coupleSourceExcerpt: "",
      dateSourceExcerpt: "",
      sunsetSourceExcerpt: "",
    };
    const sourceText = prepared.kind === "vision" ? extraction.transcription : prepared.text;
    if (prepared.kind === "vision" && sourceText.trim().length < 20) {
      return error("The photo couldn't be read as a timeline. Try a clearer picture or paste the text.", 422);
    }

    const grounded = enforceCitations(extraction, sourceText);
    return Response.json({
      extraction: grounded.extraction,
      rejected: grounded.rejected,
      sourceText,
      sourceKind: prepared.kind === "vision" ? "transcription" : "text",
    });
  } catch (caught) {
    if (NoObjectGeneratedError.isInstance(caught)) {
      return error("The model didn't return a usable sheet. Try again or shorten the timeline.", 502);
    }
    if (APICallError.isInstance(caught)) {
      if (caught.statusCode === 401 || caught.statusCode === 403) {
        return error("AI Gateway rejected the credential. Check AI_GATEWAY_API_KEY and AI_GATEWAY_MODEL.", 502);
      }
      return error("The model request failed. Try again in a moment.", 502);
    }
    console.error("extract failed", caught instanceof Error ? caught.name : "unknown");
    return error("Could not distill that timeline.", 500);
  }
}

type Prepared =
  | { kind: "text"; text: string; scanned?: boolean }
  | { kind: "vision"; data: Uint8Array; mediaType: string };

async function readFile(file: File): Promise<Prepared> {
  const name = file.name.toLowerCase();
  const type = file.type;
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(name)) {
    return { kind: "vision", data: bytes, mediaType: type || "image/jpeg" };
  }

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    try {
      const extracted = await extractText(bytes, { mergePages: true });
      const text = extracted.text;
      if (text.trim().length >= 80) return { kind: "text", text };
      return { kind: "vision", data: bytes, mediaType: "application/pdf" };
    } catch {
      return { kind: "text", text: "", scanned: true };
    }
  }

  if (name.endsWith(".docx") || type.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return { kind: "text", text: result.value };
  }

  if (type.startsWith("text/") || /\.(txt|md|text|csv)$/.test(name) || !type) {
    return { kind: "text", text: new TextDecoder().decode(bytes) };
  }

  return { kind: "text", text: "" };
}

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
