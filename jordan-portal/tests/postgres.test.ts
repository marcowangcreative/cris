import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const clientA = "20000000-0000-4000-8000-0000000000a1";
const clientB = "20000000-0000-4000-8000-0000000000b2";
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const adminUser = "33333333-3333-4333-8333-333333333333";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
  `);
  await db.exec(
    fs.readFileSync(
      path.join(root, "supabase/migrations/20261113120000_init.sql"),
      "utf8",
    ),
  );
  await db.exec(`
    create schema if not exists storage;
    create table if not exists storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false
    );
    create table if not exists storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text,
      name text not null
    );
    create or replace function storage.foldername(name text) returns text[]
    language sql immutable as $$
      select string_to_array(name, '/');
    $$;
  `);
  await db.exec(
    fs.readFileSync(
      path.join(root, "supabase/migrations/20261113120001_storage.sql"),
      "utf8",
    ),
  );
  await db.exec(`
    insert into public.clients (id, auth_user_id, email, full_name) values
      ('${clientA}', '${userA}', 'a@example.com', 'Client A'),
      ('${clientB}', '${userB}', 'b@example.com', 'Client B');
    insert into public.staff (auth_user_id, email, full_name, role) values
      ('${adminUser}', 'admin@example.com', 'Admin', 'admin');
    insert into public.projects (id, client_id, kind, status) values
      ('30000000-0000-4000-8000-0000000000a1', '${clientA}', 'transformation', 'confirmed'),
      ('30000000-0000-4000-8000-0000000000b2', '${clientB}', 'transformation', 'confirmed');
    insert into public.assets (project_id, client_id, kind, storage_path, content_type, file_name) values
      ('30000000-0000-4000-8000-0000000000a1', '${clientA}', 'current_hair', '${clientA}/a.png', 'image/png', 'a.png'),
      ('30000000-0000-4000-8000-0000000000b2', '${clientB}', 'current_hair', '${clientB}/b.png', 'image/png', 'b.png');
    insert into public.project_notes (project_id, body) values
      ('30000000-0000-4000-8000-0000000000b2', 'SECRET-NOTE-B');
    insert into storage.objects (bucket_id, name) values
      ('client-assets', '${clientA}/a.png'),
      ('client-assets', '${clientB}/secret.png');
  `);
});

async function asUser<T>(
  authUserId: string,
  run: (tx: {
    query: <Row>(sql: string, params?: unknown[]) => Promise<{ rows: Row[] }>;
    exec: (sql: string) => Promise<unknown>;
  }) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [
      authUserId,
    ]);
    await tx.exec(`set local role authenticated`);
    return run(tx);
  });
}

describe("row level security", () => {
  it("agrees with Luxon that 10:00 a.m. Chicago moves with DST", async () => {
    const result = await db.query<{
      winter_yes: boolean;
      winter_no: boolean;
      summer_yes: boolean;
      summer_no: boolean;
      spring_yes: boolean;
      spring_no: boolean;
      fall_yes: boolean;
      fall_no: boolean;
    }>(`
      select
        public.is_ten_am_chicago('2026-01-15T16:00:00Z') as winter_yes,
        public.is_ten_am_chicago('2026-01-15T15:00:00Z') as winter_no,
        public.is_ten_am_chicago('2026-07-15T15:00:00Z') as summer_yes,
        public.is_ten_am_chicago('2026-07-15T16:00:00Z') as summer_no,
        public.is_ten_am_chicago('2026-03-08T15:00:00Z') as spring_yes,
        public.is_ten_am_chicago('2026-03-08T16:00:00Z') as spring_no,
        public.is_ten_am_chicago('2026-11-01T16:00:00Z') as fall_yes,
        public.is_ten_am_chicago('2026-11-01T15:00:00Z') as fall_no
    `);
    expect(result.rows[0]).toEqual({
      winter_yes: true,
      winter_no: false,
      summer_yes: true,
      summer_no: false,
      spring_yes: true,
      spring_no: false,
      fall_yes: true,
      fall_no: false,
    });
  });

  it("denies a client another client’s files, storage objects, and private notes", async () => {
    const ownAssets = await asUser<{ storage_path: string }[]>(userA, async (tx) => {
      const assets = await tx.query<{ storage_path: string }>(
        `select storage_path from public.assets`,
      );
      return assets.rows;
    });
    expect(ownAssets).toEqual([{ storage_path: `${clientA}/a.png` }]);

    const ownFiles = await asUser(userA, async (tx) => {
      const files = await tx.query<{ name: string }>(
        `select name from storage.objects`,
      );
      return files.rows.map((row) => row.name);
    });
    expect(ownFiles).toEqual([`${clientA}/a.png`]);

    const notes = await asUser(userA, async (tx) => {
      const rows = await tx.query<{ body: string }>(
        `select body from public.project_notes`,
      );
      return rows.rows;
    });
    expect(notes).toEqual([]);

    await expect(
      asUser(userA, async (tx) => {
        await tx.query(
          `insert into storage.objects (bucket_id, name) values ('client-assets', $1)`,
          [`${clientB}/nope.png`],
        );
      }),
    ).rejects.toThrow(/row-level security/i);

    const adminNotes = await asUser(adminUser, async (tx) => {
      const rows = await tx.query<{ body: string }>(
        `select body from public.project_notes`,
      );
      return rows.rows;
    });
    expect(adminNotes).toEqual([{ body: "SECRET-NOTE-B" }]);
  });
});
