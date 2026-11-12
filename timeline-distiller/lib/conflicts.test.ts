import { describe, expect, it } from "vitest";
import { applyDetector } from "./assemble";
import { detectConflicts } from "./conflicts";
import { emptySlots } from "./assemble";
import { slotFormals } from "./slotting";
import type { Beat, DaySheet } from "./types";

function beat(partial: Partial<Beat>): Beat {
  return {
    id: partial.id ?? "beat",
    kind: "other",
    time: "",
    endTime: "",
    title: "Item",
    location: "",
    address: "",
    whatToShoot: "",
    people: "",
    assignee: "both",
    assigneeInferred: false,
    sourceLine: 1,
    sourceExcerpt: "",
    inferred: false,
    ...partial,
  };
}

describe("conflict detection", () => {
  it("flags an overlap and skips travel for that pair", () => {
    const gaps = detectConflicts({
      travelBufferMinutes: 15,
      slotted: emptySlots(),
      beats: [
        beat({ id: "a", kind: "ceremony", title: "Ceremony", time: "4:00 PM", endTime: "4:30 PM", location: "Lawn" }),
        beat({ id: "b", title: "Formals", time: "4:15 PM", endTime: "4:45 PM", location: "Steps" }),
      ],
    });
    expect(gaps.some((gap) => /overlaps/.test(gap.text))).toBe(true);
    expect(gaps.some((gap) => /travel buffer/.test(gap.text))).toBe(false);
  });

  it("flags a venue change inside the travel buffer and ignores a comfortable gap", () => {
    const tight = detectConflicts({
      travelBufferMinutes: 15,
      slotted: emptySlots(),
      beats: [
        beat({ kind: "ceremony", title: "Prep", time: "3:50 PM", endTime: "3:50 PM", location: "the hotel" }),
        beat({ kind: "ceremony", title: "Ceremony", time: "4:00 PM", location: "The Glass Orchard" }),
      ],
    });
    expect(tight.some((gap) => /10 min between/.test(gap.text))).toBe(true);

    const comfortable = detectConflicts({
      travelBufferMinutes: 15,
      slotted: emptySlots(),
      beats: [
        beat({ kind: "ceremony", title: "Prep", time: "3:00 PM", endTime: "3:20 PM", location: "Hotel" }),
        beat({ kind: "ceremony", title: "Ceremony", time: "4:00 PM", location: "Orchard" }),
      ],
    });
    expect(comfortable.some((gap) => /travel buffer/.test(gap.text))).toBe(false);
  });

  it("does not call a move inside one venue travel", () => {
    const gaps = detectConflicts({
      travelBufferMinutes: 20,
      slotted: emptySlots(),
      beats: [
        beat({ kind: "ceremony", title: "First look", time: "3:10 PM", endTime: "3:40 PM", location: "Glass Orchard west garden" }),
        beat({ kind: "ceremony", title: "Ceremony", time: "3:50 PM", location: "The Glass Orchard lawn" }),
      ],
    });
    expect(gaps.some((gap) => /travel buffer/.test(gap.text))).toBe(false);
  });

  it("asks about split getting-ready rooms and a missing ceremony", () => {
    const gaps = detectConflicts({
      travelBufferMinutes: 15,
      slotted: emptySlots(),
      beats: [
        beat({ kind: "getting-ready", title: "Bride", time: "1:00 PM", location: "Marlowe House Hotel" }),
        beat({ kind: "getting-ready", title: "Groom", time: "1:30 PM", location: "The Glass Orchard" }),
      ],
    });
    expect(gaps.some((gap) => /more than one place/.test(gap.text))).toBe(true);
    expect(gaps.some((gap) => /No ceremony start/.test(gap.text))).toBe(true);
  });

  it("carries a too-short formals window into the ask list", () => {
    const slotted = slotFormals(
      [{ id: "g", label: "Family", people: "A & B", count: 2, side: "manual" }],
      { start: 16 * 60, end: 16 * 60 + 1 },
      { baseMinutes: 2, largeGroupThreshold: 6, extraMinutesPerPerson: 0.5 },
    );
    const gaps = detectConflicts({
      travelBufferMinutes: 15,
      slotted,
      beats: [beat({ kind: "family-formals", title: "Family formals", time: "4:00 PM", endTime: "4:01 PM" })],
    });
    expect(gaps.some((gap) => /need 2 min/.test(gap.text))).toBe(true);
  });
});

describe("applyDetector", () => {
  it("reslots when the minutes-per-group assumption changes", () => {
    const base = {
      couple: "",
      coupleInferred: false,
      coupleSourceLine: null,
      coupleSourceExcerpt: "",
      date: "",
      dateInferred: false,
      dateSourceLine: null,
      dateSourceExcerpt: "",
      sunsetNote: "Check sunset.",
      sunsetInferred: false,
      sunsetSourceLine: null,
      sunsetSourceExcerpt: "",
      locations: [],
      contacts: [],
      constraints: [],
      beats: [beat({ kind: "family-formals", time: "4:40 PM", endTime: "4:55 PM", title: "Family formals" })],
      modelGaps: [],
      detectorGaps: [],
      formalGroups: [{ id: "g", label: "Couple", people: "A & B", count: 2, side: "manual" }],
      formalSlots: emptySlots(),
      checklist: [],
      notes: "",
      baseMinutes: 2,
      travelBufferMinutes: 15,
      rejected: [],
      sourceName: "",
      demo: false,
    } satisfies DaySheet;

    const two = applyDetector(base);
    const longer = applyDetector({ ...base, baseMinutes: 10 });
    const overflow = applyDetector({ ...base, baseMinutes: 20 });
    expect(two.formalSlots.slots[0].minutes).toBe(2);
    expect(longer.formalSlots.slots[0].minutes).toBe(10);
    expect(longer.formalSlots.warning).toBeNull();
    expect(overflow.formalSlots.warning).toMatch(/20 min/);
  });
});
