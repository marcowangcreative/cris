import { rm } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), "data", "store.json");
await rm(file, { force: true });
console.log("Removed data/store.json. The next request writes a fresh demo store.");
