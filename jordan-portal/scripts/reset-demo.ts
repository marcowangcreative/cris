import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), ".data");
fs.rmSync(dir, { recursive: true, force: true });
console.log("Demo database cleared. The next page load seeds fictional clients again.");
