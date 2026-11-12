import { describe, expect, it } from "vitest";
import { artistDayIcs, icsStamp } from "./ics";

describe("ics", () => {
  it("stamps a local floating time and one event per slot", () => {
    expect(icsStamp("2027-04-18", 15 * 60)).toBe("20270418T150000");
    expect(icsStamp("2027-04-18", -30)).toBe("20270417T233000");
    const text = artistDayIcs({
      stylist: { id: "riley", name: "Riley Okonkwo" },
      day: { date: "2027-04-18", label: "Wedding day" },
      coupleName: "Avery Chen & Jordan Hale",
      location: "Willowridge Estate",
      slots: [
        { memberId: "avery", name: "Avery Chen", role: "bride", type: "makeup", start: 13 * 60 + 25, end: 14 * 60 + 40, dur: 75 },
      ],
    });
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("SUMMARY:Avery Chen · Makeup");
    expect(text).toContain("DTSTART:20270418T132500");
    expect(text).toContain("DTEND:20270418T144000");
    expect(text).toContain("Riley Okonkwo");
    expect(text).not.toContain("Z");
  });
});
