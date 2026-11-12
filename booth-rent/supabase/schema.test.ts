import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8").toLowerCase();

describe("row level security", () => {
  for (const table of ["salons", "stylists", "invoices"]) {
    it(`enables and forces row level security on ${table}`, () => {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`alter table public.${table} force row level security`);
    });
  }

  it("scopes every policy to the signed-in owner", () => {
    expect(sql).toContain("owner_id = (select auth.uid())");
    expect(sql).not.toContain("using (true)");
    expect(sql).not.toContain("with check (true)");
  });

  it("grants the webhook role full access and owners a narrower grant", () => {
    expect(sql).toContain("grant all on table public.salons, public.stylists, public.invoices to service_role");
    expect(sql).toContain("grant select, insert, update on table public.invoices to authenticated");
  });

  it("revokes anonymous access", () => {
    expect(sql).toContain("revoke all on table public.salons from anon");
    expect(sql).toContain("revoke all on table public.stylists from anon");
    expect(sql).toContain("revoke all on table public.invoices from anon");
  });

  it("lets owners write draft, sent, or failed invoices, not paid or processing", () => {
    expect(sql).toContain("status in ('draft', 'sent', 'failed', 'void')");
    expect(sql).toContain("and status = 'draft'");
  });

  it("locks amounts after an invoice leaves draft", () => {
    expect(sql).toContain("invoice amounts are locked after the invoice leaves draft");
  });
});
