import { describe, expect, it } from "vitest";
import { createSeed, DEMO_IDS } from "./demo-data";
import { quoteTotal } from "./money";
import { buildSchedule, membersForDay, toDurations } from "./schedule";

describe("sample studio", () => {
  const studio = createSeed();
  const wedding = studio.events.find((event) => event.id === DEMO_IDS.wedding)!;
  const trial = studio.events.find((event) => event.id === DEMO_IDS.trial)!;
  const assigned = (ids: string[]) => studio.stylists.filter((stylist) => ids.includes(stylist.id));

  it("prices the Chen wedding as a single quote", () => {
    expect(quoteTotal(wedding.members)).toBe(1350);
    expect(quoteTotal(trial.members)).toBe(330);
  });

  it("builds a wedding-day timeline that fits the call time", () => {
    const day = wedding.days.find((item) => item.id === DEMO_IDS.weddingDay)!;
    const party = membersForDay(wedding.members, day.id, wedding.days.length);
    const schedule = buildSchedule(party, assigned(wedding.stylistIds), day.readyBy, toDurations(wedding), day.id, {
      callTime: day.callTime,
      travelBufferMins: day.travelBufferMins,
    });
    expect(schedule.tracks.length).toBeGreaterThan(1);
    expect(schedule.conflicts).toEqual([]);
    const brideEnd = Math.max(
      ...schedule.tracks.flatMap((track) => track.slots).filter((slot) => slot.memberId === DEMO_IDS.avery).map((slot) => slot.end),
    );
    expect(brideEnd).toBe(15 * 60);
  });

  it("shows a call-time warning on the tight bridal trial", () => {
    const day = trial.days[0];
    const schedule = buildSchedule(trial.members, assigned(trial.stylistIds), day.readyBy, toDurations(trial), day.id, {
      callTime: day.callTime,
      travelBufferMins: day.travelBufferMins,
    });
    expect(schedule.conflicts.some((conflict) => conflict.code === "before_call")).toBe(true);
  });
});
