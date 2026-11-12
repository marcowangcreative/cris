import { describe, expect, it } from "vitest";
import { detectConflicts, buildSchedule, membersForDay, serviceOnDay, type Slot, type Track } from "./schedule";
import { parseTime } from "./time";
import type { Member, Stylist } from "./types";

const READY = "15:00";
const READY_MINS = 15 * 60;

function member(partial: Partial<Member> & Pick<Member, "id" | "name" | "role">): Member {
  return {
    services: "makeup",
    stylistId: "",
    notes: "",
    hairMins: 0,
    makeupMins: 0,
    price: 0,
    urls: [],
    dayIds: [],
    dayServices: {},
    ...partial,
  };
}

function stylist(partial: Partial<Stylist> & Pick<Stylist, "id" | "name" | "specialty">): Stylist {
  return partial;
}

function slotsOf(tracks: Track[]): Slot[] {
  return tracks.flatMap((track) => track.slots);
}

const baseDurations = {
  brideHair: 90,
  brideMakeup: 60,
  defaultHair: 45,
  defaultMakeup: 30,
  bufferMins: 0,
  brideTouchupMins: 0,
};

describe("buildSchedule", () => {
  it("schedules backward so the last appointment ends at ready-by", () => {
    const people = [
      member({ id: "a", name: "Nora", role: "bridesmaid", makeupMins: 30 }),
      member({ id: "b", name: "Lila", role: "bridesmaid", makeupMins: 30 }),
    ];
    const schedule = buildSchedule(people, [stylist({ id: "m", name: "Ellis", specialty: "makeup" })], READY, baseDurations);
    expect(schedule.end).toBe(READY_MINS);
    expect(schedule.start).not.toBeNull();
    expect(schedule.start!).toBeLessThan(schedule.end!);
    for (const slot of slotsOf(schedule.tracks)) {
      expect(slot.end).toBeLessThanOrEqual(READY_MINS);
      expect(slot.end - slot.start).toBe(slot.dur);
    }
    const latest = Math.max(...slotsOf(schedule.tracks).map((slot) => slot.end));
    expect(latest).toBe(parseTime(READY));
  });

  it("orders hair before makeup for a both service and keeps them from overlapping", () => {
    const bride = member({
      id: "bride",
      name: "Avery",
      role: "bride",
      services: "both",
      hairMins: 90,
      makeupMins: 60,
    });
    const schedule = buildSchedule(
      [bride],
      [stylist({ id: "r", name: "Riley", specialty: "both" })],
      READY,
      baseDurations,
    );
    const slots = slotsOf(schedule.tracks).sort((a, b) => a.start - b.start);
    expect(slots.map((slot) => slot.type)).toEqual(["hair", "makeup"]);
    expect(slots[0].end).toBeLessThanOrEqual(slots[1].start);
    expect(slots[1].end).toBe(READY_MINS);
    expect(schedule.conflicts.filter((conflict) => conflict.code === "overlap")).toEqual([]);
  });

  it("load-balances equal makeup appointments across two artists", () => {
    const people = ["Nora", "Lila", "Helen", "June"].map((name, index) =>
      member({ id: `p${index}`, name, role: "bridesmaid", services: "makeup", makeupMins: 30 }),
    );
    const artists = [
      stylist({ id: "a", name: "Ellis", specialty: "makeup" }),
      stylist({ id: "b", name: "Samira", specialty: "makeup" }),
    ];
    const schedule = buildSchedule(people, artists, READY, baseDurations);
    const counts = schedule.tracks.map((track) => track.slots.length).sort((a, b) => a - b);
    expect(counts).toEqual([2, 2]);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("finishes the bride last, after everyone else", () => {
    const bride = member({ id: "bride", name: "Avery", role: "bride", services: "both" });
    const party = [
      bride,
      member({ id: "moh", name: "Priya", role: "moh", services: "both" }),
      member({ id: "bm", name: "Lila", role: "bridesmaid", services: "makeup" }),
      member({ id: "mom", name: "Helen", role: "mother_bride", services: "hair" }),
    ];
    const artists = [
      stylist({ id: "r", name: "Riley", specialty: "both" }),
      stylist({ id: "e", name: "Ellis", specialty: "makeup" }),
      stylist({ id: "s", name: "Samira", specialty: "hair" }),
    ];
    const schedule = buildSchedule(party, artists, READY, { ...baseDurations, bufferMins: 10, brideTouchupMins: 15 });
    const slots = slotsOf(schedule.tracks);
    const brideEnd = Math.max(...slots.filter((slot) => slot.memberId === "bride").map((slot) => slot.end));
    const othersEnd = Math.max(...slots.filter((slot) => slot.memberId !== "bride").map((slot) => slot.end));
    expect(brideEnd).toBe(READY_MINS);
    expect(othersEnd).toBeLessThan(brideEnd);
  });

  it("uses per-person durations when set and role defaults otherwise", () => {
    const bride = member({
      id: "bride",
      name: "Avery",
      role: "bride",
      services: "both",
      hairMins: 100,
      makeupMins: 50,
    });
    const friend = member({ id: "bm", name: "Lila", role: "bridesmaid", services: "both" });
    const schedule = buildSchedule(
      [bride, friend],
      [stylist({ id: "r", name: "Riley", specialty: "both" })],
      READY,
      { ...baseDurations, defaultHair: 40, defaultMakeup: 25 },
    );
    const slots = slotsOf(schedule.tracks);
    expect(slots.find((slot) => slot.memberId === "bride" && slot.type === "hair")?.dur).toBe(100);
    expect(slots.find((slot) => slot.memberId === "bride" && slot.type === "makeup")?.dur).toBe(50);
    expect(slots.find((slot) => slot.memberId === "bm" && slot.type === "hair")?.dur).toBe(40);
    expect(slots.find((slot) => slot.memberId === "bm" && slot.type === "makeup")?.dur).toBe(25);
  });

  it("keeps a buffer between different people and lets the bride's own services touch", () => {
    const bride = member({
      id: "bride",
      name: "Avery",
      role: "bride",
      services: "both",
      hairMins: 40,
      makeupMins: 60,
    });
    const moh = member({ id: "moh", name: "Priya", role: "moh", services: "makeup", makeupMins: 30 });
    const schedule = buildSchedule(
      [bride, moh],
      [stylist({ id: "r", name: "Riley", specialty: "both" })],
      READY,
      { ...baseDurations, bufferMins: 10, brideTouchupMins: 15 },
    );
    const slots = slotsOf(schedule.tracks).sort((a, b) => a.start - b.start);
    const touch = slots.find((slot) => slot.type === "touchup");
    const makeup = slots.find((slot) => slot.memberId === "bride" && slot.type === "makeup");
    expect(touch?.end).toBe(READY_MINS);
    expect(touch?.dur).toBe(15);
    expect(makeup?.end).toBe(touch?.start);
    for (let index = 0; index < slots.length - 1; index += 1) {
      const gap = slots[index + 1].start - slots[index].end;
      expect(gap).toBeGreaterThanOrEqual(0);
      if (slots[index].memberId !== slots[index + 1].memberId) {
        expect(gap).toBeGreaterThanOrEqual(10);
      }
    }
    expect(schedule.conflicts.filter((conflict) => conflict.code === "overlap")).toEqual([]);
  });

  it("reserves a bride touch-up that ends at ready-by, with hair then makeup before it", () => {
    const bride = member({ id: "bride", name: "Avery", role: "bride", services: "both", hairMins: 45, makeupMins: 30 });
    const schedule = buildSchedule(
      [bride],
      [stylist({ id: "r", name: "Riley", specialty: "both" })],
      READY,
      { ...baseDurations, brideTouchupMins: 20 },
    );
    const slots = slotsOf(schedule.tracks).sort((a, b) => a.start - b.start);
    expect(slots.map((slot) => slot.type)).toEqual(["hair", "makeup", "touchup"]);
    expect(slots[0].end).toBeLessThanOrEqual(slots[1].start);
    expect(slots[1].end).toBeLessThanOrEqual(slots[2].start);
    expect(slots[2].end).toBe(READY_MINS);
    expect(slots[2].dur).toBe(20);
  });

  it("warns when a slot starts before call time plus travel", () => {
    const bride = member({ id: "bride", name: "Avery", role: "bride", services: "hair", hairMins: 120 });
    const early = buildSchedule(
      [bride],
      [stylist({ id: "r", name: "Riley", specialty: "hair" })],
      "09:00",
      baseDurations,
      null,
      { callTime: "08:30", travelBufferMins: 15 },
    );
    expect(early.start).toBeLessThan(parseTime("08:30")! + 15);
    expect(early.conflicts.some((conflict) => conflict.code === "before_call")).toBe(true);
    expect(early.conflicts.some((conflict) => conflict.message.includes("Riley"))).toBe(true);

    const fine = buildSchedule(
      [bride],
      [stylist({ id: "r", name: "Riley", specialty: "hair" })],
      "12:00",
      baseDurations,
      null,
      { callTime: "07:00", travelBufferMins: 0 },
    );
    expect(fine.conflicts.some((conflict) => conflict.code === "before_call")).toBe(false);
  });

  it("honors a preferred stylist and a per-day service override", () => {
    const people = [
      member({ id: "a", name: "Nora", role: "bridesmaid", services: "makeup", stylistId: "b" }),
      member({
        id: "b",
        name: "Lila",
        role: "bridesmaid",
        services: "both",
        dayServices: { wedding: "hair" },
      }),
    ];
    const artists = [
      stylist({ id: "a", name: "Ellis", specialty: "makeup" }),
      stylist({ id: "b", name: "Samira", specialty: "both" }),
    ];
    const schedule = buildSchedule(people, artists, READY, baseDurations, "wedding");
    const nora = slotsOf(schedule.tracks).filter((slot) => slot.memberId === "a");
    expect(nora).toHaveLength(1);
    expect(schedule.tracks.find((track) => track.slots.some((slot) => slot.memberId === "a"))?.stylist.id).toBe("b");
    const lila = slotsOf(schedule.tracks).filter((slot) => slot.memberId === "b");
    expect(lila.map((slot) => slot.type)).toEqual(["hair"]);
    expect(serviceOnDay(people[1], "wedding")).toBe("hair");
    expect(serviceOnDay(people[1], "other-day")).toBe("both");
  });

  it("filters party members to the days they are attending", () => {
    const people = [
      member({ id: "a", name: "Avery", role: "bride", dayIds: ["welcome", "wedding"] }),
      member({ id: "b", name: "June", role: "flower_girl", dayIds: ["wedding"] }),
    ];
    expect(membersForDay(people, "welcome", 2).map((person) => person.id)).toEqual(["a"]);
    expect(membersForDay(people, "wedding", 1).map((person) => person.id)).toEqual(["a", "b"]);
  });
});

describe("detectConflicts", () => {
  it("flags overlapping slots on one artist", () => {
    const tracks: Track[] = [
      {
        stylist: { id: "r", name: "Riley", specialty: "both" },
        slots: [
          { memberId: "a", name: "Avery", role: "bride", type: "hair", start: 8 * 60, end: 10 * 60, dur: 120 },
          { memberId: "b", name: "Priya", role: "moh", type: "hair", start: 9 * 60, end: 10 * 60, dur: 60 },
        ],
      },
    ];
    const conflicts = detectConflicts(tracks);
    expect(conflicts.map((conflict) => conflict.code)).toContain("overlap");
    expect(conflicts.some((conflict) => conflict.message.includes("Riley"))).toBe(true);
  });
});
