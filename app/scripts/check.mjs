import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && /\.(mjs|js)$/.test(entry.name)) files.push(full);
  }
}
walk("app");
for (const file of files) execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
console.log(`Syntax OK: ${files.length} JavaScript modules`);
