import "server-only";
import path from "node:path";
import { DocumentStore } from "@/lib/store/document";
import { filePersistence } from "@/lib/store/persistence";
import { PostgresStore } from "@/lib/store/postgres";
import type { Store } from "@/lib/store/types";

let singleton: Store | undefined;

export function getStore(): Store {
  if (!singleton) {
    const url = process.env.DATABASE_URL;
    singleton = url
      ? new PostgresStore(url)
      : new DocumentStore(filePersistence(path.join(process.cwd(), "data", "store.json")));
  }
  return singleton;
}
