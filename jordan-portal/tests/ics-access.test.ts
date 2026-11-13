import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { toClientProject, readAssetForActor } from "@/lib/domain/access";
import { buildConflictIcs } from "@/lib/domain/ics";
import { IDS, PRIVATE_NOTE, SAMPLE_VENUE } from "@/lib/ids";
import { publicCopy } from "@/lib/content";
import { cloneSeed, STUDIO_NOW } from "./helpers";

describe("sanitized conflict feed", () => {
  it("exports unavailable blocks without client names, notes, or contact info", () => {
    const db = cloneSeed();
    const ics = buildConflictIcs(db, STUDIO_NOW);
    const summaries = ics
      .split("\r\n")
      .filter((line) => line.startsWith("SUMMARY"));
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.every((line) => line === "SUMMARY:Unavailable")).toBe(true);
    const blob = ics.toLowerCase();
    for (const client of db.clients) {
      expect(ics).not.toContain(client.full_name);
      expect(ics).not.toContain(client.email);
      if (client.phone) expect(ics).not.toContain(client.phone);
    }
    expect(ics).not.toContain(PRIVATE_NOTE);
    expect(ics).not.toContain(SAMPLE_VENUE);
    expect(ics).not.toContain("Reese");
    expect(blob).not.toContain("bridal");
    expect(ics).not.toContain("Sample River Hall");
  });
});

describe("client access", () => {
  it("hides private stylist notes and blocks another client’s file", () => {
    const db = cloneSeed();
    const view = toClientProject(db, IDS.avery, IDS.averyProject);
    expect(JSON.stringify(view)).not.toContain(PRIVATE_NOTE);
    expect(view).not.toHaveProperty("project_notes");
    expect(view.reconciliation.balanceToCollectCents).toBe(60_000);
    expect(() =>
      readAssetForActor(db, { role: "client", clientId: IDS.quinn }, IDS.averyAsset),
    ).toThrow(/forbidden/i);
    expect(
      readAssetForActor(db, { role: "client", clientId: IDS.avery }, IDS.averyAsset).id,
    ).toBe(IDS.averyAsset);
  });
});

describe("public copy", () => {
  it("does not publish $2,400 or $3,600 as packages", () => {
    const root = path.resolve(__dirname, "..");
    const files = [
      "src/app/page.tsx",
      "src/app/transformations/page.tsx",
      "src/app/weddings/page.tsx",
      "src/components/wedding-form.tsx",
      "src/lib/content.ts",
    ];
    const source = files
      .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
      .join("\n");
    expect(source).not.toMatch(/2,?400|3,?600/);
    expect(source).toContain(publicCopy.weddingIntro);
    expect(fs.readFileSync(path.join(root, "src/app/weddings/page.tsx"), "utf8")).not.toContain(
      "$",
    );
  });
});
