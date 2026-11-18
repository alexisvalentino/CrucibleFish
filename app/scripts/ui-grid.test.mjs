import assert from "node:assert/strict";
import { test } from "node:test";
import { nextRovingIndex } from "../public/grid.mjs";

test("customer grid arrows move by row and column without leaving the cohort", () => {
  assert.equal(nextRovingIndex(0, "ArrowRight", 100, 10), 1);
  assert.equal(nextRovingIndex(0, "ArrowLeft", 100, 10), 0);
  assert.equal(nextRovingIndex(0, "ArrowDown", 100, 10), 10);
  assert.equal(nextRovingIndex(10, "ArrowUp", 100, 10), 0);
  assert.equal(nextRovingIndex(99, "ArrowRight", 100, 10), 99);
  assert.equal(nextRovingIndex(99, "ArrowDown", 100, 10), 99);
});

test("Home, End, and mobile columns provide a bounded roving tab stop", () => {
  assert.equal(nextRovingIndex(42, "Home", 100, 5), 0);
  assert.equal(nextRovingIndex(42, "End", 100, 5), 99);
  assert.equal(nextRovingIndex(0, "ArrowDown", 10, 5), 5);
  assert.equal(nextRovingIndex(4, "ArrowDown", 10, 5), 9);
  assert.equal(nextRovingIndex(4, "Tab", 100, 5), 4);
});
