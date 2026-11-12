import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { PACKAGE_ROOT } from "../src/root";
import { groupNameFromFilename, parseWhatsAppExport } from "../src/whatsapp";

const groups = ["2nd Grade Room 12", "5th Grade Families", "Pre-K Parents"];

function parse(filename: string, text: string, dateOrder: "MDY" | "DMY" = "MDY") {
  return parseWhatsAppExport({
    filename,
    text,
    timeZone: "America/Chicago",
    dateOrder,
    groups,
    idPrefix: "test",
  });
}

describe("WhatsApp export parsing", () => {
  test("reads an iOS export, keeps multiline messages, and drops system lines", () => {
    const text = [
      "[11/6/26, 8:00:00 AM] Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.",
      "[11/6/26, 8:12:04 AM] Teacher Example: Line one",
      "continues here",
      "",
      "still this message",
      "[11/6/26, 8:20:11 AM] Parent One: Next",
    ].join("\n");
    const messages = parse("WhatsApp Chat with 2nd Grade Room 12.txt", text);
    assert.equal(messages.length, 2);
    assert.equal(messages[0].person, "Teacher Example");
    assert.equal(messages[0].group, "2nd Grade Room 12");
    assert.equal(messages[0].body, "Line one\ncontinues here\nstill this message");
    assert.equal(messages[0].date.toISOString(), "2026-11-06T14:12:04.000Z");
    assert.equal(messages[1].person, "Parent One");
    assert.equal(messages[1].body, "Next");
  });

  test("reads Android 12-hour, 24-hour, and system lines", () => {
    const text = [
      "11/6/26, 8:00 AM - Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them. Tap to learn more.",
      "11/6/26, 8:01 AM - Teacher Example added Parent One",
      "11/8/26, 10:15 AM - Office Example: Morning note",
      "11/6/26, 21:05 - Office Example: Evening note",
    ].join("\n");
    const messages = parse("WhatsApp Chat with 5th Grade Families.txt", text);
    assert.equal(messages.length, 2);
    assert.equal(messages[0].body, "Morning note");
    assert.equal(messages[0].date.toISOString(), "2026-11-08T16:15:00.000Z");
    assert.equal(messages[1].body, "Evening note");
    assert.equal(messages[1].date.toISOString(), "2026-11-07T03:05:00.000Z");
  });

  test("strips iOS bidi marks and the narrow space before AM/PM", () => {
    const text = `\u200e[11/6/26, 8:12:04\u202fAM] Teacher Example: Field trip\nline two`;
    const messages = parse("WhatsApp Chat with 2nd Grade Room 12.txt", text);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].body, "Field trip\nline two");
    assert.equal(messages[0].date.toISOString(), "2026-11-06T14:12:04.000Z");
  });

  test("uses DMY when configured, and a day above 12 either way", () => {
    const dmy = parse("chat.txt", "05/11/2026, 19:00 - Teacher Example: Hello", "DMY");
    assert.equal(dmy[0].date.toISOString(), "2026-11-06T01:00:00.000Z");
    const mdy = parse("chat.txt", "05/11/2026, 19:00 - Teacher Example: Hello", "MDY");
    assert.equal(mdy[0].date.toISOString(), "2026-05-12T00:00:00.000Z");
    const forced = parse("chat.txt", "13/11/2026, 09:05 - Teacher Example: No school note", "MDY");
    assert.equal(forced[0].date.toISOString(), "2026-11-13T15:05:00.000Z");
  });

  test("drops media-only lines and reads the group name from the filename", () => {
    const messages = parse(
      "WhatsApp Chat with Pre-K Parents (1).txt",
      "[11/11/26, 9:30:00 AM] Parent One: <Media omitted>\n[11/11/26, 9:31:00 AM] Teacher Example: Bring a photo",
    );
    assert.equal(messages.length, 1);
    assert.equal(messages[0].body, "Bring a photo");
    assert.equal(groupNameFromFilename("WhatsApp Chat with Pre-K Parents (1).txt", groups), "Pre-K Parents");
  });

  test("parses the committed fake exports", () => {
    const dir = path.join(PACKAGE_ROOT, "fixtures/whatsapp");
    const second = parse(
      "WhatsApp Chat with 2nd Grade Room 12.txt",
      fs.readFileSync(path.join(dir, "WhatsApp Chat with 2nd Grade Room 12.txt"), "utf8"),
    );
    assert.equal(second.length, 5);
    assert.ok(second.every((message) => !/encrypted/i.test(message.body)));
    const fifth = parse(
      "WhatsApp Chat with 5th Grade Families.txt",
      fs.readFileSync(path.join(dir, "WhatsApp Chat with 5th Grade Families.txt"), "utf8"),
    );
    assert.equal(fifth.length, 5);
    assert.equal(fifth[1].person, "Office Example");
  });
});
