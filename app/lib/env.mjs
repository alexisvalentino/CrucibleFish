import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = path.resolve(APP_ROOT, "..");
let cache;
let disabled = false;

export function disableEnv() { disabled = true; cache = {}; }

export function env(key) {
  if (disabled) return "";
  if (process.env[key]) return process.env[key];
  if (!cache) {
    cache = {};
    const file = path.join(REPO_ROOT, ".env");
    if (fs.existsSync(file)) {
      for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (match && !(match[1] in cache)) cache[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
      }
    }
  }
  return cache[key] || "";
}
