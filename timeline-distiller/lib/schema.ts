import { z } from "zod";

const cited = {
  sourceLine: z
    .number()
    .int()
    .nullable()
    .describe("1-based line number from the numbered source, or null when inferred."),
  sourceExcerpt: z
    .string()
    .describe("Exact text of that source line. Empty when sourceLine is null."),
  inferred: z
    .boolean()
    .describe("True when this fact is not written on the cited line."),
};

export const extractionSchema = z.object({
  couple: z.string().describe("Couple names as written. Empty if absent."),
  coupleSourceLine: z.number().int().nullable(),
  coupleInferred: z.boolean(),
  date: z.string().describe("Wedding date as written. Empty if absent. Do not invent one."),
  dateSourceLine: z.number().int().nullable(),
  dateInferred: z.boolean(),
  sunsetNote: z
    .string()
    .describe('Standing note. Use "Check sunset." Do not calculate a sun time.'),
  sunsetSourceLine: z.number().int().nullable(),
  sunsetInferred: z.boolean(),
  transcription: z
    .string()
    .describe(
      "Empty for pasted text, PDF, and DOCX. For an image or scanned PDF, the verbatim transcription, one visual line per line.",
    ),
  locations: z.array(
    z.object({
      name: z.string(),
      address: z.string().describe("Street address as written. Empty if none."),
      role: z.string().describe("ceremony, reception, getting ready, or similar."),
      ...cited,
    }),
  ),
  contacts: z.array(
    z.object({
      role: z.string().describe("planner, day-of coordinator, officiant, or similar."),
      name: z.string(),
      phone: z.string().describe("Phone as written. Empty if the source has no number."),
      ...cited,
    }),
  ),
  constraints: z.array(
    z.object({
      kind: z.enum(["no-flash", "unplugged", "officiant", "other"]),
      text: z.string().describe("The rule in the planner's words, shortened only for clarity."),
      ...cited,
    }),
  ),
  beats: z.array(
    z.object({
      kind: z.enum([
        "details",
        "getting-ready",
        "first-look",
        "ceremony",
        "family-formals",
        "portraits",
        "sunset",
        "grand-entrance",
        "toasts",
        "first-dance",
        "cake",
        "send-off",
        "other",
      ]),
      time: z.string().describe('Start time as written, such as "4:00 PM". Empty if none.'),
      endTime: z.string().describe("End time as written. Empty if the source has no end."),
      title: z.string(),
      location: z.string().describe("Place name on the cited line. Empty if none."),
      address: z.string().describe("Street address only if it is on the cited line."),
      whatToShoot: z.string(),
      people: z.string().describe("Names on the cited line, comma-separated. Empty if none."),
      assignee: z.enum(["lead", "second", "both"]),
      assigneeInferred: z
        .boolean()
        .describe("True unless the source names which shooter covers this."),
      ...cited,
    }),
  ),
  gaps: z.array(
    z.object({
      text: z.string().describe("A question for the planner. Do not invent a missing fact to fill it."),
      severity: z.enum(["ask", "warning"]),
      ...cited,
    }),
  ),
});

export type ExtractionSchema = z.infer<typeof extractionSchema>;
