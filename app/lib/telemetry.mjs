const ACTIVE_ACTIONS = new Set(["ADOPT_AND_EVANGELIZE", "ADOPT_PASSIVELY", "CONVERT_TO_PAID"]);
const STATUSES = ["PAYING_CHAMPION", "FREE_ACTIVE_DATA_CONTRIBUTOR", "SAVED_BY_GODS_EYE_PIVOT", "CHURNED_PERMANENTLY"];

function mostCommon(personas, key) {
  const counts = new Map();
  for (const persona of personas) {
    const value = persona[key] || "Unspecified";
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  const [feature = "None", count = 0] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  return { feature, count };
}

export function computeTelemetry(personas = []) {
  if (!Array.isArray(personas) || !personas.length) throw new Error("Cannot compute telemetry without customer personas.");
  const total = personas.length;
  const percent = (count) => Math.round((count / total) * 100);
  const day1 = personas.filter((p) => ACTIVE_ACTIONS.has(p.round1Day1Action));
  const day14 = personas.filter((p) => ACTIVE_ACTIONS.has(p.round2Day14ActionRawIdea));
  const rawPayers = personas.filter((p) => p.round2Day14ActionRawIdea === "CONVERT_TO_PAID");
  const finalPayers = personas.filter((p) => p.finalLifecycleStatus === "PAYING_CHAMPION");
  const day1Adoption = percent(day1.length);
  const day14Active = percent(day14.length);
  const day30Active = percent(personas.filter((p) => p.finalLifecycleStatus !== "CHURNED_PERMANENTLY").length);
  return {
    customerCount: total,
    day1Adoption,
    day14Active,
    day30Active,
    retentionLift: day30Active - day14Active,
    day14Paying: rawPayers.length,
    day30Paying: finalPayers.length,
    day14MonthlyGmv: Math.round(rawPayers.reduce((sum, p) => sum + Number(p.willingnessToPayMonthlyUsdDay14 ?? p.willingnessToPayMonthlyUsdBeforePivot ?? 0), 0)),
    day30MonthlyGmv: Math.round(finalPayers.reduce((sum, p) => sum + Number(p.willingnessToPayMonthlyUsdDay30 ?? p.willingnessToPayMonthlyUsdAfterPivot ?? 0), 0)),
    rawPaying: rawPayers.length,
    pivotedPaying: finalPayers.length,
    rawMonthlyGmv: Math.round(rawPayers.reduce((sum, p) => sum + Number(p.willingnessToPayMonthlyUsdDay14 ?? p.willingnessToPayMonthlyUsdBeforePivot ?? 0), 0)),
    pivotedMonthlyGmv: Math.round(finalPayers.reduce((sum, p) => sum + Number(p.willingnessToPayMonthlyUsdDay30 ?? p.willingnessToPayMonthlyUsdAfterPivot ?? 0), 0)),
    topChurnTrigger: mostCommon(personas.filter((p) => !ACTIVE_ACTIONS.has(p.round2Day14ActionRawIdea)), "mostHatedFeature"),
    topViralHook: mostCommon(day1, "favoriteFeature"),
    statusCounts: Object.fromEntries(STATUSES.map((status) => [status, personas.filter((p) => p.finalLifecycleStatus === status).length])),
  };
}
