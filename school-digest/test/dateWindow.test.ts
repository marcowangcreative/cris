import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseLooseDate } from "../src/dates";
import { parseWhatsAppExport } from "../src/whatsapp";
import { gmailAfterQuery, inWindow, isSundaySevenPm, windowBounds } from "../src/time";

const AS_OF = new Date("2026-11-12T19:00:00-06:00");
const BOUNDS = windowBounds(AS_OF, 7);

function parse(text: string) {
  return parseWhatsAppExport({
    filename: "WhatsApp Chat with 2nd Grade Room 12.txt",
    text,
    timeZone: "America/Chicago",
    dateOrder: "MDY",
    groups: ["2nd Grade Room 12"],
    idPrefix: "win",
  });
}

describe("date window", () => {
  test("keeps the last 7 days, including the exact start, and drops anything outside", () => {
    assert.equal(BOUNDS.start.toISOString(), "2026-11-06T01:00:00.000Z");
    assert.equal(inWindow(BOUNDS.start, BOUNDS), true);
    assert.equal(inWindow(new Date(BOUNDS.start.getTime() - 1), BOUNDS), false);
    assert.equal(inWindow(AS_OF, BOUNDS), true);
    assert.equal(inWindow(new Date(AS_OF.getTime() + 1), BOUNDS), false);

    const messages = parse(
      [
        "[11/5/26, 6:59:00 PM] Teacher Example: Just outside",
        "[11/5/26, 7:00:00 PM] Teacher Example: On the boundary",
        "[11/12/26, 7:00:00 PM] Teacher Example: At the cutoff",
        "[11/12/26, 7:01:00 PM] Teacher Example: After the cutoff",
      ].join("\n"),
    );
    const kept = messages.filter((message) => inWindow(message.date, BOUNDS)).map((message) => message.body);
    assert.deepEqual(kept, ["On the boundary", "At the cutoff"]);
  });

  test("Sunday 7 PM Chicago is recognized in both standard time and daylight time", () => {
    assert.equal(isSundaySevenPm(new Date("2026-11-16T01:00:00.000Z"), "America/Chicago"), true);
    assert.equal(isSundaySevenPm(new Date("2026-11-16T00:00:00.000Z"), "America/Chicago"), false);
    assert.equal(isSundaySevenPm(new Date("2026-10-26T00:00:00.000Z"), "America/Chicago"), true);
    assert.equal(isSundaySevenPm(new Date("2026-10-25T23:00:00.000Z"), "America/Chicago"), false);
  });

  test("loose dates use the school timezone and do not treat a ticket price as a clock time", () => {
    assert.equal(parseLooseDate("due Friday, November 13", AS_OF, "America/Chicago", "MDY"), "2026-11-13");
    assert.equal(
      parseLooseDate("Orchestra concert Thursday, November 19 at 6:30 PM. Tickets are $8 at the door.", AS_OF, "America/Chicago", "MDY"),
      "2026-11-19T18:30",
    );
    assert.equal(parseLooseDate("Early release on Wednesday, November 18 at 1:00 PM.", AS_OF, "America/Chicago", "MDY"), "2026-11-18T13:00");
    assert.equal(parseLooseDate("no date here", AS_OF, "America/Chicago", "MDY"), null);
  });

  test("the Gmail prefilter starts the day before the exact window", () => {
    assert.equal(gmailAfterQuery(BOUNDS.start, "America/Chicago"), "after:2026/11/04");
  });
});
