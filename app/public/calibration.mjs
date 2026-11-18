const numberOrNull = (value) => (value === null || value === undefined || value === "" ? null : Number(value));
const percent = (value) => (value === null || !Number.isFinite(value) ? null : Math.round(value));

export function compareEntry(telemetry = {}, entry = {}) {
  const cohort = numberOrNull(entry.cohortSize);
  const usableCohort = cohort !== null && Number.isFinite(cohort) && cohort > 0 ? cohort : null;
  const observedPercent = (key) => {
    const value = numberOrNull(entry[key]);
    return usableCohort && value !== null ? percent((value / usableCohort) * 100) : null;
  };
  const day30 = numberOrNull(telemetry.day30Active);
  const gmvPer100 = numberOrNull(telemetry.pivotedMonthlyGmv);
  const metrics = [
    { key: "ACTIVE", name: "Active", unit: "%", predicted: percent(day30), observed: observedPercent("active") },
    { key: "PAYING", name: "Paying", unit: "%", predicted: percent(numberOrNull(telemetry.pivotedPaying)), observed: observedPercent("paid") },
    { key: "CHURN", name: "Churned", unit: "%", predicted: day30 === null ? null : percent(100 - day30), observed: observedPercent("churned") },
    { key: "GMV", name: "GMV", unit: "USD", predicted: gmvPer100 !== null && usableCohort ? Math.round(gmvPer100 * usableCohort / 100) : null, observed: numberOrNull(entry.gmv) },
  ];
  for (const metric of metrics) {
    metric.difference = metric.predicted !== null && metric.observed !== null && Number.isFinite(metric.predicted) && Number.isFinite(metric.observed)
      ? Math.round(metric.observed - metric.predicted)
      : null;
  }
  const thresholdMetric = String(entry.thresholdMetric || "NONE").toUpperCase();
  const thresholdValue = numberOrNull(entry.thresholdValue);
  const threshold = ["ACTIVE", "PAYING", "CHURN", "GMV"].includes(thresholdMetric) && thresholdValue !== null && Number.isFinite(thresholdValue)
    ? { key: thresholdMetric, value: thresholdValue }
    : null;
  const target = threshold ? metrics.find((metric) => metric.key === threshold.key) : null;
  const verdict = target && target.observed !== null
    ? (["CHURN", "GMV"].includes(threshold.key) ? target.observed <= threshold.value : target.observed >= threshold.value)
    : null;
  return { cohort: usableCohort, metrics, threshold, verdict };
}

export function calibrationSummary(rows = []) {
  const collected = {};
  for (const row of rows) {
    for (const metric of row?.comparison?.metrics || []) {
      if (metric.difference === null) continue;
      (collected[metric.key] ||= []).push(metric.difference);
    }
  }
  return Object.fromEntries(Object.entries(collected).map(([key, differences]) => [key, {
    count: differences.length,
    average: Math.round(differences.reduce((sum, value) => sum + value, 0) / differences.length),
    min: Math.min(...differences),
    max: Math.max(...differences),
  }]));
}
