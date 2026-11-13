import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { apothecaryHome, apothecaryPath, isApothecaryPath } from "@/lib/concept";

const root = path.resolve(__dirname, "..");

describe("concept switcher", () => {
  it("keeps Atelier as the default and links to Apothecary", () => {
    const footer = fs.readFileSync(path.join(root, "src/components/shell.tsx"), "utf8");
    const back = fs.readFileSync(
      path.join(root, "src/components/apothecary/shell.tsx"),
      "utf8",
    );
    expect(footer).toContain('href="/apothecary"');
    expect(back).toContain('href="/"');
    expect(isApothecaryPath("/")).toBe(false);
    expect(isApothecaryPath("/apothecary")).toBe(true);
    expect(isApothecaryPath("/apothecary/portal")).toBe(true);
  });

  it("only accepts a return path inside concept B", () => {
    expect(apothecaryHome("/apothecary")).toBe("/apothecary");
    expect(apothecaryHome("/apothecary/portal")).toBeNull();
    expect(apothecaryHome("/admin")).toBeNull();
    expect(apothecaryPath("/apothecary/weddings")).toBe("/apothecary/weddings");
    expect(apothecaryPath("https://example.com/apothecary")).toBeNull();
    expect(apothecaryPath("/apothecary/../admin")).toBeNull();
    expect(apothecaryPath("//evil.example")).toBeNull();
  });

  it("does not use the reference house name, and publishes no bridal price", () => {
    const files = walk(path.join(root, "src/app/apothecary")).concat(
      walk(path.join(root, "src/components/apothecary")),
    );
    const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/santa maria|smnovella|novella/i);
    expect(source).not.toMatch(/2,?400|3,?600/);
    const weddings = fs.readFileSync(
      path.join(root, "src/app/apothecary/weddings/page.tsx"),
      "utf8",
    );
    expect(weddings).not.toContain("$");
  });
});

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith(".tsx") || full.endsWith(".ts") ? [full] : [];
  });
}
