import { describe, expect, it } from "vitest";
import { groupsFromFormalsState, parseFormalsPayload, parseFormalsReference, parseManualList, samePlace } from "./formals";
import type { FormalsState } from "./formals";
import { groupMinutes, slotFormals } from "./slotting";

const state: FormalsState = {
  bride: "Priya",
  groom: "Elias",
  brideMom: "Anjali",
  brideDad: "Dev",
  groomMom: "Helen",
  groomDad: "Mark",
  officiant: "June",
  brideSiblings: ["Rina"],
  groomSiblings: ["Caleb"],
  brideGrandparents: [],
  groomGrandparents: [],
  brideExtended: ["Meera"],
  groomExtended: [],
  bridesmaids: ["Noor", "Tess"],
  groomsmen: ["Omar"],
  disabled: { b2: true },
  custom: ["Parents who raised the groom — Helen & Sam"],
  sortMode: "default",
  customOrder: [],
  eventDate: "2026-11-14",
};

describe("formals import", () => {
  it("builds the call-out list and skips disabled shots", () => {
    const groups = groupsFromFormalsState(state);
    expect(groups[0]).toMatchObject({ id: "a1", label: "The Couple" });
    expect(groups.some((group) => group.id === "b2")).toBe(false);
    const custom = groups.find((group) => group.id === "custom_0");
    expect(custom?.people).toContain("Helen");
    expect(groups.find((group) => group.id === "a1")?.count).toBe(2);
  });

  it("reads a Supabase row and an efficient sort", () => {
    const parsed = parseFormalsPayload({
      couple_names: "Priya Vellani & Elias Crowe",
      data: { ...state, sortMode: "efficient" },
    });
    expect(parsed?.coupleNames).toBe("Priya Vellani & Elias Crowe");
    expect(parsed?.eventDate).toBe("2026-11-14");
    const both = parsed?.groups.filter((group) => group.side === "both").length ?? 0;
    expect(parsed?.groups.slice(0, both).every((group) => group.side === "both")).toBe(true);
    expect(parsed?.groups.find((group) => group.side === "groom")).toBeTruthy();
  });

  it("reads a share link, a slug, and JSON", () => {
    expect(
      parseFormalsReference("https://lists.example.com/wedding-shot-list.html?e=Priya-And-Elias-k3m7"),
    ).toEqual({ type: "slug", slug: "priya-and-elias-k3m7" });
    expect(parseFormalsReference("maria-and-david-bueso-k3m7")).toEqual({
      type: "slug",
      slug: "maria-and-david-bueso-k3m7",
    });
    const json = parseFormalsReference(JSON.stringify({ couple_names: "Ada & Ben", data: state }));
    expect(json.type).toBe("json");
    if (json.type === "json") expect(json.parsed.groups.length).toBeGreaterThan(10);
  });

  it("parses a manual list", () => {
    const groups = parseManualList("# skip\n\nThe Couple — Priya & Elias\nExtended: A, B, C, D");
    expect(groups).toHaveLength(2);
    expect(groups[0].count).toBe(2);
    expect(groups[1].count).toBe(4);
  });
});

describe("formals time slots", () => {
  const options = { baseMinutes: 2, largeGroupThreshold: 6, extraMinutesPerPerson: 0.5 };

  it("gives a small group the base time and a bigger group longer", () => {
    expect(groupMinutes(2, options)).toBe(2);
    expect(groupMinutes(6, options)).toBe(2);
    expect(groupMinutes(10, options)).toBe(4);
    expect(groupMinutes(2, { ...options, baseMinutes: 3 })).toBe(3);
  });

  it("slots groups inside the window and flags the ones that do not fit", () => {
    const groups = parseManualList(
      ["One — A & B", "Two — C & D", "Three — E, F, G, H, I, J, K, L"].join("\n"),
    );
    const start = 16 * 60 + 40;
    const result = slotFormals(groups, { start, end: start + 15 }, options);
    expect(result.slots[0].start).toBe(start);
    expect(result.slots[1].start).toBe(start + 2);
    expect(result.totalMinutes).toBe(2 + 2 + 3);
    expect(result.windowMinutes).toBe(15);
    expect(result.warning).toBeNull();
    expect(result.slots.every((slot) => !slot.overflows)).toBe(true);
  });

  it("warns when 15 minutes cannot hold the groups", () => {
    const groups = Array.from({ length: 20 }, (_, index) => ({
      id: `g${index}`,
      label: `Group ${index + 1}`,
      people: "A & B",
      count: 2,
      side: "manual" as const,
    }));
    const result = slotFormals(groups, { start: 16 * 60 + 40, end: 16 * 60 + 55 }, options);
    expect(result.totalMinutes).toBe(40);
    expect(result.windowMinutes).toBe(15);
    expect(result.warning).toMatch(/20 groups need 40 min/);
    expect(result.slots.filter((slot) => slot.overflows).length).toBeGreaterThan(10);
  });

  it("warns when groups have no window", () => {
    const groups = parseManualList("The Couple — A & B");
    const result = slotFormals(groups, null, options);
    expect(result.slots[0].start).toBeNull();
    expect(result.warning).toMatch(/No family-formals window/);
  });
});

describe("same place", () => {
  it("treats rooms in one venue as the same place", () => {
    expect(samePlace("The Glass Orchard lawn", "Glass Orchard Suite B")).toBe(true);
    expect(samePlace("the hotel", "Marlowe House Hotel")).toBe(false);
  });
});
