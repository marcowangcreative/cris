import { describe, expect, it } from "vitest";
import { extractionSchema } from "./schema";
import { enforceCitations } from "./citations";
import { sheetToIcs } from "./ics";
import { buildDemoSheet, SAMPLE_MODEL_OUTPUT, SAMPLE_SOURCE } from "./sample";
import type { ModelExtraction } from "./types";

function model(partial: Partial<ModelExtraction>): ModelExtraction {
  return {
    couple: "",
    coupleSourceLine: null,
    coupleSourceExcerpt: "",
    coupleInferred: true,
    date: "",
    dateSourceLine: null,
    dateSourceExcerpt: "",
    dateInferred: true,
    sunsetNote: "Check sunset.",
    sunsetSourceLine: null,
    sunsetSourceExcerpt: "",
    sunsetInferred: true,
    transcription: "",
    locations: [],
    contacts: [],
    constraints: [],
    beats: [],
    gaps: [],
    ...partial,
  };
}

const source = ["1:00 PM Bride getting ready at the hotel.", "Ceremony is at 5:00 PM.", "Planner Ada, no phone on this line."].join("\n");

describe("citation enforcement", () => {
  it("replaces the excerpt with the real line and drops a bad line number", () => {
    const result = enforceCitations(
      model({
        beats: [
          {
            kind: "getting-ready",
            time: "1:00 PM",
            endTime: "",
            title: "Bride getting ready",
            location: "hotel",
            address: "",
            whatToShoot: "dress",
            people: "",
            assignee: "second",
            assigneeInferred: true,
            sourceLine: 1,
            sourceExcerpt: "this quote was invented",
            inferred: false,
          },
          {
            kind: "other",
            time: "9:00 PM",
            endTime: "",
            title: "Invented send-off",
            location: "",
            address: "",
            whatToShoot: "",
            people: "",
            assignee: "lead",
            assigneeInferred: true,
            sourceLine: 40,
            sourceExcerpt: "nope",
            inferred: false,
          },
        ],
      }),
      source,
    );
    expect(result.extraction.beats).toHaveLength(1);
    expect(result.extraction.beats[0].sourceExcerpt).toBe("1:00 PM Bride getting ready at the hotel.");
    expect(result.rejected.some((item) => item.label.includes("Invented"))).toBe(true);
  });

  it("flags a clock time that is not on the cited line", () => {
    const result = enforceCitations(
      model({
        beats: [
          {
            kind: "ceremony",
            time: "4:00 PM",
            endTime: "",
            title: "Ceremony",
            location: "",
            address: "",
            whatToShoot: "",
            people: "",
            assignee: "lead",
            assigneeInferred: true,
            sourceLine: 2,
            sourceExcerpt: "",
            inferred: false,
          },
        ],
      }),
      source,
    );
    expect(result.extraction.beats[0].inferred).toBe(true);
    expect(result.extraction.beats[0].sourceExcerpt).toMatch(/5:00 PM/);
  });

  it("clears a phone number that is not on the cited line", () => {
    const result = enforceCitations(
      model({
        contacts: [
          {
            role: "Planner",
            name: "Ada",
            phone: "713-555-0199",
            sourceLine: 3,
            sourceExcerpt: "",
            inferred: false,
          },
        ],
      }),
      source,
    );
    expect(result.extraction.contacts[0].phone).toBe("");
    expect(result.extraction.contacts[0].inferred).toBe(true);
  });

  it("drops vendor logistics titled as a beat", () => {
    const result = enforceCitations(
      model({
        beats: [
          {
            kind: "other",
            time: "7:00 AM",
            endTime: "",
            title: "Catering load-in",
            location: "",
            address: "",
            whatToShoot: "",
            people: "",
            assignee: "both",
            assigneeInferred: true,
            sourceLine: 1,
            sourceExcerpt: "",
            inferred: false,
          },
        ],
        constraints: [
          {
            kind: "other",
            text: "Stay out of the catering kitchen.",
            sourceLine: 1,
            sourceExcerpt: "",
            inferred: false,
          },
        ],
      }),
      source,
    );
    expect(result.extraction.beats).toHaveLength(0);
    expect(result.extraction.constraints).toHaveLength(1);
  });

  it("keeps an inferred item that has no line", () => {
    const result = enforceCitations(
      model({
        beats: [
          {
            kind: "sunset",
            time: "",
            endTime: "",
            title: "Check sunset",
            location: "",
            address: "",
            whatToShoot: "Check sunset.",
            people: "",
            assignee: "both",
            assigneeInferred: true,
            sourceLine: null,
            sourceExcerpt: "",
            inferred: true,
          },
        ],
      }),
      source,
    );
    expect(result.extraction.beats).toHaveLength(1);
    expect(result.extraction.beats[0].inferred).toBe(true);
    expect(result.rejected).toHaveLength(0);
  });
});

describe("cached demo", () => {
  it("matches the schema and cites only real sample lines", () => {
    const {
      coupleSourceExcerpt: _coupleExcerpt,
      dateSourceExcerpt: _dateExcerpt,
      sunsetSourceExcerpt: _sunsetExcerpt,
      ...modelFields
    } = SAMPLE_MODEL_OUTPUT;
    expect(extractionSchema.parse(modelFields)).toBeTruthy();

    const sheet = buildDemoSheet();
    expect(sheet.demo).toBe(true);
    expect(sheet.rejected).toEqual([]);
    expect(sheet.couple).toMatch(/Priya Vellani/);
    expect(sheet.beats.some((beat) => beat.kind === "sunset" && beat.time === "")).toBe(true);
    expect(sheet.constraints.some((rule) => rule.kind === "no-flash")).toBe(true);
    expect(sheet.contacts.some((contact) => contact.phone === "713-555-0198")).toBe(true);
    expect(sheet.formalSlots.warning).toMatch(/20 groups/);
    expect(sheet.formalSlots.windowMinutes).toBe(15);
    expect(sheet.detectorGaps.some((gap) => /10 min between/.test(gap.text))).toBe(true);
    const ics = sheetToIcs(sheet, "all");
    expect(ics).toContain("DTSTART:20261114T160000");
    expect(ics).toContain("Priya Vellani");
    expect(ics).not.toMatch(/DTSTART:[^\r\n]*Z/);
    expect(sheet.modelGaps.some((gap) => /20 groupings/.test(gap.text))).toBe(true);
    for (const beat of sheet.beats) {
      if (beat.sourceLine == null) continue;
      expect(beat.sourceExcerpt.length).toBeGreaterThan(0);
      expect(beat.inferred || beat.sourceExcerpt.includes(beat.time.replace(/\s*(AM|PM)$/i, "")) || beat.time === "").toBe(true);
    }
  });
});
