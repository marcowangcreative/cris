import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  apothecaryHome,
  apothecaryPath,
  editorialHome,
  editorialPath,
  isApothecaryPath,
  isEditorialPath,
  isMaisonPath,
  maisonHome,
  maisonPath,
} from "@/lib/concept";

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

  it("links Editorial from the switcher and keeps its return path inside concept C", () => {
    const footer = fs.readFileSync(path.join(root, "src/components/shell.tsx"), "utf8");
    const editorial = fs.readFileSync(
      path.join(root, "src/components/editorial/shell.tsx"),
      "utf8",
    );
    expect(footer).toContain('href="/editorial"');
    expect(editorial).toContain('href="/"');
    expect(editorial).toContain('href="/apothecary"');
    expect(isEditorialPath("/editorial")).toBe(true);
    expect(isEditorialPath("/editorial/portal")).toBe(true);
    expect(isEditorialPath("/apothecary")).toBe(false);
    expect(isApothecaryPath("/editorial")).toBe(false);
    expect(editorialHome("/editorial")).toBe("/editorial");
    expect(editorialHome("/editorial/portal")).toBeNull();
    expect(editorialPath("/editorial/weddings")).toBe("/editorial/weddings");
    expect(editorialPath("/apothecary")).toBeNull();
    expect(editorialPath("https://example.com/editorial")).toBeNull();
  });

  it("links Maison from the switcher and keeps its return path inside concept D", () => {
    const footer = fs.readFileSync(path.join(root, "src/components/shell.tsx"), "utf8");
    const maison = fs.readFileSync(
      path.join(root, "src/components/maison/shell.tsx"),
      "utf8",
    );
    expect(footer).toContain('href="/maison"');
    expect(maison).toContain('href="/"');
    expect(maison).toContain('href="/apothecary"');
    expect(maison).toContain('href="/editorial"');
    expect(isMaisonPath("/maison")).toBe(true);
    expect(isMaisonPath("/maison/portal")).toBe(true);
    expect(isMaisonPath("/editorial")).toBe(false);
    expect(isEditorialPath("/maison")).toBe(false);
    expect(maisonHome("/maison")).toBe("/maison");
    expect(maisonHome("/maison/portal")).toBeNull();
    expect(maisonPath("/maison/weddings")).toBe("/maison/weddings");
    expect(maisonPath("/editorial")).toBeNull();
    expect(maisonPath("https://example.com/maison")).toBeNull();
  });

  it("does not copy the scroll-film reference, and publishes no bridal price", () => {
    const files = walk(path.join(root, "src/app/maison")).concat(
      walk(path.join(root, "src/components/maison")),
    );
    const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/alaba|real madrid|through the lens|his craft/i);
    expect(source).not.toMatch(/2,?400|3,?600/);
    const weddings = fs.readFileSync(
      path.join(root, "src/app/maison/weddings/page.tsx"),
      "utf8",
    );
    expect(weddings).not.toContain("$");
    expect(weddings).not.toMatch(/gown|bridal-1600/);
  });

  it("does not copy the lookbook references, and publishes no bridal price", () => {
    const files = walk(path.join(root, "src/app/editorial")).concat(
      walk(path.join(root, "src/components/editorial")),
    );
    const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/aim[eé]|leon dore|del[ií]rio|valentino/i);
    expect(source).not.toMatch(/2,?400|3,?600/);
    const weddings = fs.readFileSync(
      path.join(root, "src/app/editorial/weddings/page.tsx"),
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
