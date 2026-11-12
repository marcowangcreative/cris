import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { studio } from "@/lib/config";
import { buildSeed } from "@/lib/seed";
import type { Database } from "@/lib/types";

export interface Persistence {
  load(): Promise<Database>;
  save(db: Database): Promise<void>;
}

export class MemoryPersistence implements Persistence {
  constructor(private state: Database) {}

  async load(): Promise<Database> {
    return structuredClone(this.state);
  }

  async save(db: Database): Promise<void> {
    this.state = structuredClone(db);
  }
}

export function emptyDatabase(): Database {
  return {
    bookings: [],
    inquiries: [],
    settings: {
      maxEventsPerDate: studio.defaultMaxEventsPerDate,
      blockedDates: [],
    },
  };
}

export function initialDatabase(now = new Date()): Database {
  if (process.env.SEED_ON_EMPTY === "false") return emptyDatabase();
  return buildSeed(now);
}

export function filePersistence(filePath: string): Persistence {
  return {
    async load() {
      try {
        return JSON.parse(await readFile(filePath, "utf8")) as Database;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        const seeded = initialDatabase();
        await mkdir(path.dirname(filePath), { recursive: true });
        try {
          await writeFile(filePath, JSON.stringify(seeded, null, 2), { flag: "wx" });
          return seeded;
        } catch (writeError) {
          if ((writeError as NodeJS.ErrnoException).code !== "EEXIST") throw writeError;
          return JSON.parse(await readFile(filePath, "utf8")) as Database;
        }
      }
    },
    async save(db) {
      await mkdir(path.dirname(filePath), { recursive: true });
      const temporary = `${filePath}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify(db, null, 2));
      await rename(temporary, filePath);
    },
  };
}
