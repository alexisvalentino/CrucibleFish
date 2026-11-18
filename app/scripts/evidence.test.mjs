import assert from "node:assert/strict";
import { test } from "node:test";
import { evidenceDigest, loadEvidence, normalizeEntry, saveEvidence } from "../public/evidence.mjs";

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (key) => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, String(value)) };
}

test("weekly observations normalize optional numbers and notes", () => {
  const entry = normalizeEntry({
    weekEnding: "2026-11-14", interviews: "7", churned: "", paid: -3,
    note: "Six interviews this week.", createdAt: "2026-11-14T10:00:00.000Z",
  });
  assert.equal(entry.interviews, 7);
  assert.equal(entry.churned, null);
  assert.equal(entry.paid, null);
  assert.match(entry.note, /Six interviews/);
  assert.ok(entry.id);
});

test("evidence persists locally and sorts newest week first", () => {
  const storage = memoryStorage();
  const saved = saveEvidence([
    { weekEnding: "2026-11-07", note: "older week" },
    { weekEnding: "2026-11-14", note: "newer week", interviews: "5", gmv: "120" },
  ], storage);
  assert.deepEqual(saved.map((entry) => entry.weekEnding), ["2026-11-07", "2026-11-14"]);
  const loaded = loadEvidence(storage);
  assert.deepEqual(loaded.map((entry) => entry.weekEnding), ["2026-11-14", "2026-11-07"]);
  assert.equal(loaded[0].interviews, 5);
  assert.equal(loaded[0].gmv, 120);
  assert.equal(loaded[1].gmv, null);
});

test("digest labels observations as real evidence and bounds note length", () => {
  const digest = evidenceDigest([{ weekEnding: "2026-11-14", interviews: 5, paid: 2, gmv: 120, note: "x".repeat(500) }]);
  assert.match(digest, /REAL OBSERVED EVIDENCE/);
  assert.match(digest, /week ending 2026-11-14/);
  assert.match(digest, /5 interviews/);
  assert.match(digest, /\$120 observed GMV/);
  assert.ok(digest.length < 600);
  assert.equal(evidenceDigest([]), "");
});
