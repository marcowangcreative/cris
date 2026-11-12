import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { loadConfig, parseConfig } from "../src/config";
import { buildRfc822 } from "../src/deliver";
import { isIgnored, passesAllowlist } from "../src/filter";
import { encodeBase64Url, normalizedFromGmail } from "../src/gmail";
import { renderHtml, type DigestStats } from "../src/render";
import { PACKAGE_ROOT } from "../src/root";
import { draftsToItems, guardChild } from "../src/schema";
import type { DigestItem, NormalizedMessage } from "../src/types";
import { runDigest } from "../src/pipeline";

const AS_OF = new Date("2026-11-12T19:00:00-06:00");
const config = loadConfig(path.join(PACKAGE_ROOT, "config.example.json"), PACKAGE_ROOT);

function describeItems(items: DigestItem[]): string {
  return items
    .map(
      (item) =>
        `${item.child}\t${item.category}\t${item.info_type}\t${item.deadline ?? ""}\t${item.date ?? ""}\t${item.amount ?? ""}\t${item.sources.length}\t${item.title}`,
    )
    .join("\n");
}

function message(partial: Partial<NormalizedMessage>): NormalizedMessage {
  return {
    id: "m",
    kind: "email",
    sender: "Office Example <office@example-elementary.test>",
    person: "Office Example <office@example-elementary.test>",
    body: "",
    date: AS_OF,
    fallback_children: [],
    info_type: "unknown",
    ...partial,
  };
}

describe("sample digest", () => {
  test("fixtures become one digest per child, with duplicates collapsed", async () => {
    const result = await runDigest({
      config,
      root: PACKAGE_ROOT,
      asOf: AS_OF,
      extractor: "heuristic",
      whatsappDir: path.join(PACKAGE_ROOT, "fixtures/whatsapp"),
      dropDir: path.join(PACKAGE_ROOT, "fixtures/drop"),
      includeGmail: false,
      strictFolders: true,
    });
    const dump = describeItems(result.items);
    assert.equal(result.items.length, 13, dump);
    assert.equal(result.stats.outsideWindow, 2, dump);
    assert.equal(result.stats.ignored, 1, dump);
    assert.equal(result.stats.skippedChatter, 3, dump);

    const permission = result.items.filter((item) => item.amount === "$12");
    assert.equal(permission.length, 1, dump);
    assert.equal(permission[0].child, "kid-a");
    assert.equal(permission[0].category, "form");
    assert.equal(permission[0].info_type, "official");
    assert.equal(permission[0].deadline, "2026-11-13");
    assert.equal(permission[0].sources.length, 3, permission[0].sources.map((source) => source.message_id).join(", "));
    assert.ok(permission[0].sources.some((source) => source.kind === "whatsapp" && source.info_type === "parent_chatter"));
    assert.ok(permission[0].sources.some((source) => source.kind === "drop"));

    const money = result.markdown.split("## Money")[1]?.split("## Calendar")[0] ?? "";
    assert.match(money, /\$12/);
    assert.match(money, /\$180/);
    assert.doesNotMatch(money, /\$8/);

    assert.match(result.markdown, /## Do first/);
    assert.match(result.markdown, /## Kid A — 2nd grade, Example Elementary/);
    assert.match(result.markdown, /## Kid B — 5th grade, Example Middle/);
    assert.match(result.markdown, /## Kid C — Pre-K, Example After-School/);
    assert.match(result.markdown, /## Unclear/);
    assert.match(result.markdown, /facilities day/);
    assert.match(result.markdown, /picture retakes/);
    assert.match(result.markdown, /From the parent chat/);
    assert.doesNotMatch(result.markdown, /water bottle/i);
    assert.doesNotMatch(result.markdown, /picked up/i);
    assert.doesNotMatch(result.markdown, /older than the digest window/i);
    assert.doesNotMatch(result.markdown, /muffins/i);

    const early = result.items.filter((item) => item.category === "schedule_change");
    assert.deepEqual(
      early.map((item) => item.child).sort(),
      ["kid-a", "kid-b"],
    );
    assert.equal(early.find((item) => item.child === "kid-a")?.sources.length, 2);

    const retakes = result.items.find((item) => /picture retakes/i.test(item.title));
    assert.ok(retakes);
    assert.equal(retakes.child, "kid-b");
    assert.equal(retakes.info_type, "parent_chatter");
    assert.equal(retakes.action_needed, "Reply needed");

    const unclear = result.items.filter((item) => item.child === "unclear");
    assert.equal(unclear.length, 1);
    assert.match(unclear[0].title, /facilities day/);

    assert.match(result.ics, /DTSTART;VALUE=DATE:20261113/);
    assert.match(result.ics, /DTSTART:20261120T003000Z/);
    assert.match(result.ics, /DTSTART:20261118T190000Z/);
    assert.match(result.ics, /Unconfirmed \(parent chat\): Kid B/);

    const samplePath = path.join(PACKAGE_ROOT, "sample-output.md");
    assert.equal(
      result.markdown,
      fs.readFileSync(samplePath, "utf8"),
      "sample-output.md is stale. Run npm run sample and review the digest.",
    );
  });
});

describe("guards", () => {
  test("unclear wins when a child was not named", () => {
    const grouped = message({
      kind: "whatsapp",
      person: "Parent One",
      sender: "Parent One",
      group: "2nd Grade Room 12",
      body: "See you there",
    });
    assert.equal(guardChild("kid-b", grouped, config), "unclear");
    assert.equal(guardChild("Kid A", grouped, config), "kid-a");
    const district = message({
      sender: "District Example <notices@example-district.test>",
      person: "District Example <notices@example-district.test>",
      body: "Offices are closed.",
    });
    assert.equal(guardChild("kid-a", district, config), "unclear");
  });

  test("model output that cites an unknown message or a bad category is dropped", () => {
    const known = message({ id: "email-1", body: "2nd grade field trip", subject: "2nd grade" });
    const { items, rejected } = draftsToItems(
      [
        { message_id: "missing", child: "kid-a", category: "event", title: "Nope" },
        { message_id: "email-1", child: "kid-a", category: "not-a-category", title: "Nope" },
        {
          message_id: "email-1",
          child: "kid-a",
          category: "event",
          title: "Book fair",
          date: "2026-11-19",
          deadline: null,
          amount: null,
          action_needed: null,
          info_type: "official",
        },
      ],
      [known],
      config,
    );
    assert.equal(rejected, 2);
    assert.equal(items.length, 1);
    assert.equal(items[0].child, "kid-a");
    assert.equal(items[0].source.message_id, "email-1");
    assert.equal(items[0].source.sender_or_group.includes("example-elementary.test"), true);
  });

  test("config files cannot hold secrets", () => {
    assert.throws(() => parseConfig({ api_key: "sk-example", timezone: "America/Chicago", children: [] }), /api_key/);
  });

  test("the ignore list drops pickup mail and the allowlist drops unrelated Gmail", () => {
    const pickup = message({
      sender: "Pickup Example <noreply@pickup.example-transport.test>",
      person: "Pickup Example <noreply@pickup.example-transport.test>",
      subject: "Daily pickup confirmation",
      body: "Kid C was picked up at 3:05 PM.",
    });
    assert.equal(isIgnored(pickup, config), true);
    const newsletter = message({
      subject: "Notes",
      body: "Kid A was picked up. Also the permission slip is due November 13.",
    });
    assert.equal(isIgnored(newsletter, config), false);
    const stranger = message({
      sender: "Friend <friend@random.example>",
      person: "Friend <friend@random.example>",
      subject: "Lunch?",
      body: "Want to get lunch?",
    });
    assert.equal(passesAllowlist(stranger, config), false);
    assert.equal(passesAllowlist({ ...stranger, kind: "drop" }, config), true);
    const district = message({
      sender: "District Example <notices@example-district.test>",
      person: "District Example",
      subject: "Facilities day",
      body: "Offices are closed.",
    });
    assert.equal(passesAllowlist(district, config), true);
  });

  test("HTML escapes message text and the MIME builder refuses a header newline", () => {
    const stats: DigestStats = {
      outsideWindow: 0,
      ignored: 0,
      unlisted: 0,
      skippedChatter: 0,
      extractor: "heuristic",
      extractorDetail: "test",
      asOf: AS_OF.toISOString(),
      windowStart: new Date(AS_OF.getTime() - 7 * 86400000).toISOString(),
    };
    const source = {
      kind: "email" as const,
      sender_or_group: "office@example-elementary.test",
      sender: "office@example-elementary.test",
      message_date: AS_OF.toISOString(),
      info_type: "official" as const,
      message_id: "m",
    };
    const html = renderHtml(
      [
        {
          child: "kid-a",
          category: "event",
          title: "<script>alert(1)</script>",
          date: "2026-11-19",
          deadline: null,
          amount: null,
          action_needed: null,
          info_type: "official",
          source,
          sources: [source],
        },
      ],
      config,
      stats,
    );
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.equal(html.includes("<script>"), false);
    assert.throws(() =>
      buildRfc822({
        to: "parent@example.test\nBcc: someone@example.test",
        subject: "Hi",
        text: "plain",
        html: "<p>hi</p>",
      }),
    );
    const raw = buildRfc822({
      to: "parent@example.test",
      subject: "School digest",
      text: "plain",
      html: "<p>hi</p>",
      ics: "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n",
      boundary: "MIX",
      altBoundary: "ALT",
    });
    assert.match(raw, /multipart\/mixed/);
    assert.match(raw, /filename="school-digest\.ics"/);
    assert.match(raw, /<p>hi<\/p>/);
  });

  test("a Gmail payload keeps the text part and a WhatsApp attachment", async () => {
    const chat = "[11/8/26, 10:15:00 AM] Teacher Example: Picture day is November 19.\n";
    const messages = await normalizedFromGmail({
      accountId: "inbox-a",
      config,
      message: {
        id: "abc",
        internalDate: String(Date.parse("2026-11-08T15:00:00-06:00")),
        payload: {
          mimeType: "multipart/mixed",
          headers: [
            { name: "From", value: "Office Example <office@example-elementary.test>" },
            { name: "Subject", value: "Weekly notes for 2nd grade" },
            { name: "Date", value: "Sun, 08 Nov 2026 15:00:00 -0600" },
          ],
          parts: [
            {
              mimeType: "text/plain",
              body: {
                data: encodeBase64Url(
                  "Field trip permission slips are due November 13 for 2nd grade. Please return the signed form with the bus fee. This note is long enough that it is the email itself and should be kept alongside the attached export file that was included in the same message.",
                ),
              },
            },
            {
              mimeType: "text/plain",
              filename: "WhatsApp Chat with 2nd Grade Room 12.txt",
              body: { data: encodeBase64Url(chat) },
            },
          ],
        },
      },
    });
    assert.equal(messages.length, 2);
    assert.equal(messages[0].kind, "email");
    assert.equal(messages[0].account, "inbox-a");
    assert.match(messages[0].body, /email itself/);
    assert.equal(messages[1].kind, "whatsapp");
    assert.equal(messages[1].group, "2nd Grade Room 12");
    assert.match(messages[1].body, /Picture day/);
  });
});
