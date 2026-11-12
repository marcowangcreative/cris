import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { dedupeItems, isDuplicate } from "../src/dedupe";
import type { DigestItem, SourceRef } from "../src/types";

function source(partial: Partial<SourceRef> & { message_id: string }): SourceRef {
  return {
    kind: "email",
    sender_or_group: "Office Example <office@example-elementary.test>",
    sender: "Office Example <office@example-elementary.test>",
    message_date: "2026-11-08T21:00:00.000Z",
    info_type: "official",
    ...partial,
  };
}

function item(partial: Partial<DigestItem> & { title: string; source: SourceRef }): DigestItem {
  return {
    child: "kid-a",
    category: "form",
    date: null,
    deadline: "2026-11-13",
    amount: "$12",
    action_needed: "Sign and return the form and pay the fee",
    info_type: partial.source.info_type,
    sources: [partial.source],
    ...partial,
  };
}

describe("dedupe", () => {
  test("merges the same event from an email and a chat and keeps both citations", () => {
    const email = source({ message_id: "email-1", kind: "drop" });
    const chat = source({
      message_id: "wa-1",
      kind: "whatsapp",
      sender_or_group: "2nd Grade Room 12",
      sender: "Teacher Example",
      message_date: "2026-11-06T14:12:04.000Z",
      info_type: "official",
    });
    const parent = source({
      message_id: "wa-2",
      kind: "whatsapp",
      sender_or_group: "2nd Grade Room 12",
      sender: "Parent One",
      message_date: "2026-11-06T14:20:11.000Z",
      info_type: "parent_chatter",
    });
    const merged = dedupeItems([
      item({
        title: "Please return the signed field-trip permission slip by November 13. The bus fee is $12.",
        source: chat,
        info_type: "official",
      }),
      item({
        title: "I saw the office note too. Field trip permission slips are due November 13 and the bus fee is $12.",
        source: parent,
        info_type: "parent_chatter",
      }),
      item({
        title: "Field trip permission slips are due Friday, November 13. The bus fee is $12.",
        source: email,
        info_type: "official",
      }),
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].title, "Field trip permission slips are due Friday, November 13. The bus fee is $12.");
    assert.equal(merged[0].info_type, "official");
    assert.equal(merged[0].amount, "$12");
    assert.deepEqual(
      merged[0].sources.map((entry) => entry.message_id),
      ["email-1", "wa-1", "wa-2"],
    );
    assert.equal(merged[0].source.message_id, "email-1");
  });

  test("does not merge different children, dates, amounts, or an unclear item", () => {
    const base = source({ message_id: "a" });
    const other = source({ message_id: "b", message_date: "2026-11-09T15:00:00.000Z" });
    const same = item({ title: "Early release on November 18 at 1:00 PM", source: base, category: "schedule_change", deadline: null, date: "2026-11-18T13:00", amount: null, action_needed: null });
    const otherChild = item({ ...same, child: "kid-b", source: other });
    const otherDay = item({ ...same, date: "2026-11-19T13:00", source: source({ message_id: "c" }) });
    const otherAmount = item({
      title: "Field trip permission slips are due November 13. The bus fee is $8.",
      source: source({ message_id: "d" }),
      amount: "$8",
    });
    const twelve = item({
      title: "Field trip permission slips are due November 13. The bus fee is $12.",
      source: source({ message_id: "e" }),
      amount: "$12",
    });
    const unclear = item({ ...same, child: "unclear", source: source({ message_id: "f" }) });

    assert.equal(isDuplicate(same, otherChild), false);
    assert.equal(isDuplicate(same, otherDay), false);
    assert.equal(isDuplicate(twelve, otherAmount), false);
    assert.equal(isDuplicate(same, unclear), false);
    assert.equal(dedupeItems([same, otherChild, otherDay, otherAmount, twelve, unclear]).length, 6);
  });

  test("a closure does not swallow a different closure on another day", () => {
    const noSchool = item({
      title: "No school Monday, November 16 (teacher work day).",
      category: "closure",
      deadline: null,
      date: "2026-11-16",
      amount: null,
      action_needed: null,
      source: source({ message_id: "closure" }),
    });
    const facilities = item({
      ...noSchool,
      child: "unclear",
      title: "District offices are closed Friday, November 20 for a facilities day.",
      date: "2026-11-20",
      source: source({ message_id: "facilities" }),
    });
    assert.equal(dedupeItems([noSchool, facilities]).length, 2);
  });
});
