import fs from "node:fs";
import path from "node:path";
import { createSeedDatabase, SEED_VERSION } from "./seed";
import type { Database } from "@/lib/types";

const dataDir = path.join(process.cwd(), ".data");
const dbFile = path.join(dataDir, "demo-db.json");

function sampleSvg(kind: string): string {
  const label = kind === "current_hair" ? "Current hair" : "Inspiration";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <rect width="800" height="1000" fill="#e7dfd4"/>
  <text x="72" y="470" font-family="Georgia, serif" font-size="42" fill="#1c1714">Sample photo</text>
  <text x="72" y="530" font-family="Georgia, serif" font-size="22" fill="#722c38">${label} · demo only</text>
</svg>`;
}

export function uploadRoot(): string {
  return path.join(dataDir, "uploads");
}

export function safeUploadPath(storagePath: string): string {
  const root = path.resolve(uploadRoot());
  const full = path.resolve(root, storagePath);
  if (full !== root && !full.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid upload path.");
  }
  return full;
}

function writeSeedFiles(db: Database): void {
  for (const asset of db.assets) {
    const full = safeUploadPath(asset.storage_path);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    if (!fs.existsSync(full)) {
      fs.writeFileSync(full, sampleSvg(asset.kind));
    }
  }
}

function ensure(): Database {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    const db = createSeedDatabase();
    writeSeedFiles(db);
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
    return db;
  }
  const db = JSON.parse(fs.readFileSync(dbFile, "utf8")) as Database;
  if (db.seed_version !== SEED_VERSION) {
    const fresh = createSeedDatabase();
    writeSeedFiles(fresh);
    fs.writeFileSync(dbFile, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  writeSeedFiles(db);
  return db;
}

export function readDemoDb(): Database {
  return ensure();
}

let chain: Promise<void> = Promise.resolve();

export function updateDemoDb<T>(mutate: (db: Database) => T): Promise<T> {
  const run = chain.then(() => {
    const db = ensure();
    const result = mutate(db);
    const tmp = `${dbFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, dbFile);
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
