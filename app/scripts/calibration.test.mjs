import "./test-env.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { calibrationSummary, compareEntry } from "../public/calibration.mjs";

const telemetry = { day30Active: 65, pivotedPaying: 56, pivotedMonthlyGmv: 597 };
const entry = { cohortSize: 40, active: 26, churned: 10, paid: 6, gmv: 110, thresholdMetric: "PAYING", thresholdValue: 20 };

test("calibration normalizes churn and GMV to the observed cohort", () => {
  const result = compareEntry(telemetry, entry);
  const byKey = Object.fromEntries(result.metrics.map((metric) => [metric.key, metric]));
  assert.equal(byKey.ACTIVE.predicted, 65);
  assert.equal(byKey.ACTIVE.observed, 65);
  assert.equal(byKey.PAYING.observed, 15);
  assert.equal(byKey.CHURN.predicted, 35);
  assert.equal(byKey.CHURN.observed, 25);
  assert.equal(byKey.CHURN.difference, -10);
  assert.equal(byKey.GMV.predicted, 239);
  assert.equal(byKey.GMV.observed, 110);
  assert.equal(byKey.GMV.difference, -129);
});

test("calibration evaluates a falsifiable threshold", () => {
  const miss = compareEntry(telemetry, entry);
  assert.equal(miss.verdict, false);
  const pass = compareEntry(telemetry, { ...entry, paid: 12 });
  assert.equal(pass.verdict, true);
  const lowerIsBetter = compareEntry(telemetry, { ...entry, thresholdMetric: "CHURN", thresholdValue: 30 });
  assert.equal(lowerIsBetter.verdict, true);
  const none = compareEntry(telemetry, { ...entry, thresholdMetric: "NONE" });
  assert.equal(none.verdict, null);
});

test("missing cohorts leave differences empty instead of inventing numbers", () => {
  const result = compareEntry(telemetry, { active: 26, gmv: 110 });
  assert.ok(result.metrics.every((metric) => metric.difference === null));
});

test("summary reports average and range across weekly observations", () => {
  const rows = [
    { comparison: compareEntry(telemetry, entry) },
    { comparison: compareEntry(telemetry, { ...entry, paid: 12, active: 30 }) },
  ];
  const summary = calibrationSummary(rows);
  assert.equal(summary.PAYING.count, 2);
  assert.equal(summary.PAYING.min, -41);
  assert.equal(summary.PAYING.max, -26);
  assert.ok(summary.PAYING.average < 0);
});
