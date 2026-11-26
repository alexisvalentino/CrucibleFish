const root = document.querySelector("#reportRoot");
const printButton = document.querySelector("#printReportBtn");
const ACTIVE_ACTIONS = new Set(["ADOPT_AND_EVANGELIZE", "ADOPT_PASSIVELY", "CONVERT_TO_PAID"]);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function textBlock(value) { return esc(value || "Not provided.").replaceAll("\n", "<br>"); }
function titleCase(value) { return String(value || "").toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
function percent(count, total) { return total ? Math.round((count / total) * 100) : 0; }
function statusLabel(persona) {
  const status = typeof persona === "string" ? persona : persona?.finalLifecycleStatus;
  return ({ PAYING_CHAMPION: "Paying by Day 30", SAVED_BY_GODS_EYE_PIVOT: "Retained after tested change", FREE_ACTIVE_DATA_CONTRIBUTOR: "Active on free tier", CHURNED_PERMANENTLY: "Churned by Day 30" })[status] || "Status unavailable";
}
function actionLabel(action) {
  return ({ ADOPT_AND_EVANGELIZE: "Adopted and recommended", ADOPT_PASSIVELY: "Used the product", POST_FRICTION_COMPLAINT: "Reported friction", INFLUENCED_TO_CHURN: "Left after social influence", BOUNCE_IMMEDIATELY: "Left immediately", CONVERT_TO_PAID: "Converted to paid" })[action] || titleCase(action);
}
function verdictLabel(verdict) {
  return ({ CORE_WEDGE_KEEP: "Keep", TRIM_SCOPE: "Trim scope", KILL_MANUAL_UI: "Remove manual work", REPURPOSE: "Repurpose", PHASE_1_AI_BUILD: "Phase 1", PHASE_2_ODM_OR_MARKETPLACE: "Later phase" })[verdict] || titleCase(verdict);
}
function safeWebsite(value) {
  try {
    const url = new URL(value);
    if (["http:", "https:"].includes(url.protocol)) return `<a href="${esc(url.href)}">${esc(url.hostname)}</a>`;
  } catch { /* An invalid or private value stays plain text. */ }
  return esc(value);
}
function getCounts(personas) {
  const total = personas.length;
  const day1 = personas.filter((persona) => ACTIVE_ACTIONS.has(persona.round1Day1Action)).length;
  const day14 = personas.filter((persona) => ACTIVE_ACTIONS.has(persona.round2Day14ActionRawIdea)).length;
  const day30 = personas.filter((persona) => persona.finalLifecycleStatus !== "CHURNED_PERMANENTLY").length;
  return { total, day1, day14, day30 };
}
function floorRow(label, detail, count, total, tone) {
  const value = percent(count, total);
  return `<div class="floor-row"><div class="floor-row-label"><strong>${esc(label)}</strong><span>${esc(detail)}</span></div><div class="floor-bar" role="img" aria-label="${value}%: ${count} of ${total}"><i class="${tone}" style="width:${value}%"></i></div><div class="floor-count"><strong>${value}%</strong><span>${count} of ${total}</span></div></div>`;
}
function renderBrief(input) {
  const fields = [
    ["Target customer", input.targetCustomer || "Not specified"],
    ["Geography", input.targetGeography],
    ["Business model", input.businessModel],
    ["Proposed pricing", input.proposedPricing],
    ["Current traction", input.currentTraction],
    ["Stated advantage", input.unfairAdvantages],
  ];
  const currentFeatures = renderFeatureList(input.currentFeatures, "current");
  const plannedFeatures = renderFeatureList(input.plannedRoadmapFeatures, "planned");
  return `<dl class="brief-list">${fields.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${textBlock(value)}</dd></div>`).join("")}${input.websiteUrl ? `<div><dt>Website</dt><dd>${safeWebsite(input.websiteUrl)}</dd></div>` : ""}<div><dt>Current features</dt><dd>${currentFeatures}</dd></div><div><dt>Future plans (context only)</dt><dd>${plannedFeatures}<p class="brief-context-note">Future plans were not applied to the unchanged baseline. Any separately tested Day-30 change is identified below.</p></dd></div><div><dt>Research notes</dt><dd>${input.seedMaterial ? "Provided to the simulation; source text is omitted from this PDF." : "None provided."}</dd></div></dl>`;
}
function renderFeatureList(features, type) {
  if (!Array.isArray(features) || !features.length) return type === "current" ? "No current features supplied." : "No future plans supplied.";
  return `<ul class="brief-feature-list">${features.map((feature) => {
    const name = esc(feature?.name || "Unnamed feature");
    const description = feature?.description ? ` — ${esc(feature.description)}` : "";
    const context = type === "planned"
      ? feature?.category ? `<small>${esc(titleCase(feature.category))} · supplied roadmap context; not tested in the baseline</small>` : "<small>Supplied roadmap context; not tested in the baseline</small>"
      : `<small>${feature?.isManualInputRequired ? "Routine manual input flagged" : "Routine manual input not flagged"}</small>`;
    return `<li><strong>${name}</strong>${description}${context}</li>`;
  }).join("")}</ul>`;
}
function renderSamples(personas, result) {
  const wanted = ["PAYING_CHAMPION", ...(result.activePivot ? ["SAVED_BY_GODS_EYE_PIVOT"] : []), "CHURNED_PERMANENTLY"];
  const chosen = [];
  for (const status of wanted) {
    const match = personas.find((persona) => persona.finalLifecycleStatus === status && !chosen.includes(persona));
    if (match) chosen.push(match);
  }
  for (const persona of personas) {
    if (chosen.length >= 3) break;
    if (!chosen.includes(persona)) chosen.push(persona);
  }
  if (!chosen.length) return `<p class="empty-copy">No customer profiles are available in this run.</p>`;
  const days = [
    ["Day 1", "round1Day1Action", "round1ReactionNote"],
    ["Day 14", "round2Day14ActionRawIdea", "round2SocialContagionNote"],
    ["Day 30", "round3Day30Action", "round3Day30ReactionNote"],
  ];
  const day30Path = (persona) => {
    const action = persona.round3Day30Action ?? persona.round3Day30ActionAfterPivot;
    const note = persona.round3Day30ReactionNote ?? persona.round3PivotReactionNote;
    const baseline = persona.baselineDay30;
    if (result.activePivot && baseline) return `<div><dt>Day 30 · unchanged baseline → tested change</dt><dd class="sample-before-after"><p><strong>Before:</strong> ${esc(statusLabel(baseline.lifecycleStatus))} · ${esc(actionLabel(baseline.action))} — ${esc(baseline.note || "No baseline note saved.")}</p><p><strong>After:</strong> ${esc(statusLabel(persona))} · ${esc(actionLabel(action))} — ${esc(note || "No note supplied.")}</p></dd></div>`;
    return `<div><dt>Day 30${result.activePivot ? " · saved change result" : ""} · ${esc(actionLabel(action))}</dt><dd>${esc(note || "No note supplied.")}</dd></div>`;
  };
  return chosen.map((persona) => `<article class="customer-sample">
    <header><div><h3>Customer #${Number(persona.id) || "—"} · ${esc(persona.name || "Unnamed profile")}</h3><p>${esc(persona.occupation || "Occupation unspecified")} · ${esc(persona.locationCity || "Location unspecified")}</p></div><span class="sample-status">${esc(statusLabel(persona))}</span></header>
    <p class="sample-context">${esc(persona.specificIdentityContext || "No profile context supplied.")}</p>
    <dl class="sample-timeline">${days.map(([label, action, note]) => {
      if (label === "Day 30") return day30Path(persona);
      const actionValue = persona[action] ?? (action === "round3Day30Action" ? persona.round3Day30ActionAfterPivot : undefined);
      const noteValue = persona[note] ?? (note === "round3Day30ReactionNote" ? persona.round3PivotReactionNote : undefined);
      return `<div><dt>${label} · ${esc(actionLabel(actionValue))}</dt><dd>${esc(noteValue || "No note supplied.")}</dd></div>`;
    }).join("")}</dl>
  </article>`).join("");
}
function renderTriage(items = []) {
  if (!items.length) return `<p class="empty-copy">No feature triage was returned for this run.</p>`;
  return `<div class="triage-list">${items.map((item) => `<article class="triage-item"><header><h3>${esc(item.featureName || "Unnamed feature")}</h3><span class="verdict-label">${esc(verdictLabel(item.verdict))}</span></header><p>${esc(item.strategicRationale || "No rationale supplied.")}</p><p><strong>Suggested change:</strong> ${esc(item.executionFix || "No execution fix supplied.")}</p><small>Predicted Day-14 retention: ${Number(item.predicted14DayRetentionPercent) || 0}% · Effort: ${esc(titleCase(item.humanEffortRating))}</small></article>`).join("")}</div>`;
}
function renderActionPlan(months = []) {
  if (!months.length) return `<p class="empty-copy">No action plan was returned for this run.</p>`;
  return `<div class="action-plan">${months.map((month) => `<article><h3>${esc(titleCase(month.month))} · ${esc(month.focusTitle || "Focus not specified")}</h3><ul>${(month.concreteDeliverables || []).map((item) => `<li>${esc(item)}</li>`).join("")}</ul></article>`).join("")}</div>`;
}
function renderMarket(research = {}) {
  const metrics = research.metrics || [];
  const metricTable = metrics.length ? `<div class="table-wrap"><table><thead><tr><th>Segment</th><th>2026 estimate</th><th>Growth</th><th>Projection</th></tr></thead><tbody>${metrics.map((metric) => `<tr><td>${esc(metric.segmentName)}</td><td>${esc(metric.valuation2026)}</td><td>${esc(metric.cagrPercent)}</td><td>${esc(metric.projectedValuation)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty-copy">No market estimate was returned.</p>`;
  const vcs = (research.vcPipeline || []).slice(0, 5);
  const competitorGroups = [["Regional competitors", research.regionalCompetitors], ["Global benchmarks", research.globalBenchmarks]];
  return `<div class="market-disclaimer">Market estimates and suggested firms are model-generated research hypotheses. Check sources, current figures, mandates, and investor fit independently.</div>
    ${metricTable}
    ${research.unfairLocalEdge ? `<div class="local-edge"><h3>Local angle to investigate</h3><p>${esc(research.unfairLocalEdge)}</p></div>` : ""}
    ${competitorGroups.map(([label, values]) => values?.length ? `<div class="market-list"><h3>${label}</h3><p>${values.map(esc).join(" · ")}</p></div>` : "").join("")}
    ${vcs.length ? `<h3 class="subheading">Potential research targets</h3><div class="table-wrap"><table><thead><tr><th>Firm</th><th>Stage / check size</th><th>Why research it</th></tr></thead><tbody>${vcs.map((vc) => `<tr><td>${esc(vc.firmName)}</td><td>${esc(vc.stageAndCheckSize)}</td><td>${esc(vc.whyTheyFitAndPitchAngle)}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
}
function renderSocial(threads = []) {
  if (!threads.length) return `<p class="empty-copy">No scenario threads were returned for this run.</p>`;
  const selected = [...threads].sort((a, b) => (Number(b.upvotes) || 0) - (Number(a.upvotes) || 0)).slice(0, 3);
  return `<div class="social-list">${selected.map((thread) => `<article><div class="social-meta">${esc(({ 1: "Day 1 · Launch", 2: "Day 14 · Friction", 3: "Day 30 · Continued use" })[thread.round] || "Scenario thread")} · ${esc(titleCase(thread.channel))}</div><h3>${esc(thread.postTitleOrHook || "Untitled thread")}</h3><p>${esc(thread.postBody || "")}</p><small>${Number(thread.influencedPersonaIds?.length) || 0} simulated customers were assigned as influenced</small></article>`).join("")}</div>`;
}
function renderReport(result) {
  const input = result.input || {};
  const critic = result.ventureCritic || {};
  const telemetry = result.telemetry || {};
  const baselineTelemetry = result.baselineTelemetry || telemetry;
  const personas = Array.isArray(result.personas) ? result.personas : [];
  const counts = getCounts(personas);
  const trigger = telemetry.topChurnTrigger || {};
  const viral = telemetry.topViralHook || {};
  const testedChange = String(result.activePivot || "").trim();
  const suggestedChange = critic.recommendedGodsEyePivotSummary || "No future change suggestion was saved.";
  const hasBaselineSnapshot = ["day30Active", "day30Paying", "day30MonthlyGmv"].every((key) => result.baselineTelemetry?.[key] != null && Number.isFinite(Number(result.baselineTelemetry[key])));
  const canCompareTestedChange = Boolean(testedChange && hasBaselineSnapshot);
  const unchangedBaseline = result.baselineMode === "unchanged" && !testedChange;
  const legacySavedRun = (result.baselineMode !== "unchanged" && !testedChange) || Boolean(testedChange && !hasBaselineSnapshot);
  const scenarioLabel = canCompareTestedChange
    ? "Optional Day-30 change tested"
    : unchangedBaseline
      ? "Idea unchanged across all three floors"
      : testedChange
        ? "Change saved; original baseline unavailable"
        : "Earlier saved run includes a prior change";
  const day14Paying = telemetry.day14Paying ?? telemetry.rawPaying ?? 0;
  const day30Paying = telemetry.day30Paying ?? telemetry.pivotedPaying ?? 0;
  const baselineDay30Paying = baselineTelemetry.day30Paying ?? baselineTelemetry.pivotedPaying ?? 0;
  const payingStart = canCompareTestedChange ? baselineDay30Paying : unchangedBaseline ? day14Paying : day30Paying;
  const payingCaption = canCompareTestedChange ? `${result.comparisonLabel || "Unchanged baseline"} → tested change at Day 30` : unchangedBaseline ? "Day 14 → Day 30 with the idea unchanged" : "Day-30 count in this saved result";
  const gmvStart = canCompareTestedChange ? baselineTelemetry.day30MonthlyGmv : unchangedBaseline ? telemetry.day14MonthlyGmv ?? telemetry.rawMonthlyGmv : telemetry.day30MonthlyGmv ?? telemetry.pivotedMonthlyGmv;
  const gmvCaption = canCompareTestedChange ? `${result.comparisonLabel || "Unchanged baseline"} → tested change; not booked revenue` : unchangedBaseline ? "Day 14 → Day 30; not booked revenue" : "Saved Day-30 estimate; not booked revenue";
  const describedChange = testedChange || (legacySavedRun ? result.pivotHistory?.at(-1)?.pivot || suggestedChange : suggestedChange);
  const day14Difference = percent(counts.day14, counts.total) - percent(counts.day1, counts.total);
  const day30Difference = percent(counts.day30, counts.total) - percent(counts.day14, counts.total);
  const day30ActivityNote = canCompareTestedChange
    ? `Day 1 and Day 14 remain on the unchanged idea. The optional change moved modeled Day-30 activity from ${baselineTelemetry.day30Active}% (${result.comparisonLabel || "unchanged baseline"}) to ${telemetry.day30Active}% in this scenario.`
    : testedChange
      ? "This saved result includes a tested change, but the unchanged Day-30 baseline was not saved, so its effect cannot be compared here."
    : unchangedBaseline
      ? `The baseline keeps the idea unchanged across all three floors. Day-30 activity changed ${Math.abs(day30Difference)} points from Day 14 (${day30Difference > 0 ? "up" : day30Difference < 0 ? "down" : "unchanged"}).`
      : "This saved run predates unchanged-baseline mode and includes the previous version's default change.";
  const diagnosis = critic.executiveDiagnosis || "No venture diagnosis was returned for this run.";
  const resultType = result.demo ? "Illustrative demo · synthetic example" : "Live run · synthetic simulation";
  const seedIncluded = input.seedMaterial ? "Supplied research notes informed the simulation; their source text is omitted from this PDF." : "No research notes were supplied.";
  return `<article class="report-document">
    <header class="report-brand"><span>CrucibleFish</span><span>${esc(resultType)}</span></header>
    <section class="report-intro">
      <p class="report-date">Run completed ${esc(dateLabel(result.createdAt))}</p>
      <p class="scenario-label">${esc(scenarioLabel)}</p>
      <h1>${esc(input.startupName || "Startup simulation")}</h1>
      <p class="report-pitch">${esc(input.oneLinePitch || "No pitch was saved with this run.")}</p>
    </section>
    <aside class="truth-note"><strong>Read this as a stress test.</strong><span>These ${counts.total} customer profiles and every retention, payment, market, and social figure below are model-generated hypotheses. They are not interviews, observed behavior, revenue forecasts, or verified market research.</span></aside>
    <section class="report-section overview-section">
      <h2>What happened across the three floors</h2>
      <p class="section-lead">${textBlock(diagnosis)}</p>
      <div class="floor-chart" aria-label="Synthetic activity across the simulation floors">
        ${floorRow("Day 1", "Adopted or paid at first use", counts.day1, counts.total, "day-one")}
        ${floorRow("Day 14", testedChange ? "Active on the unchanged idea" : "Still active on the idea", counts.day14, counts.total, "day-fourteen")}
        ${floorRow("Day 30", unchangedBaseline ? "Active with the idea unchanged" : testedChange ? "Active after the optional change" : "Active in this saved run", counts.day30, counts.total, "day-thirty")}
      </div>
      <div class="reading-note"><strong>How to read this:</strong> activity changed ${Math.abs(day14Difference)} points from Day 1 to Day 14 (${day14Difference > 0 ? "up" : day14Difference < 0 ? "down" : "unchanged"}). ${esc(day30ActivityNote)}</div>
      ${canCompareTestedChange ? `<div class="comparison-block"><div><h3>Day-30 active profiles</h3><p>${esc(result.comparisonLabel || "Unchanged baseline")} → optional change</p></div><strong>${Number(baselineTelemetry.day30Active) || 0}% <span>→</span> ${Number(telemetry.day30Active) || 0}%</strong></div>` : ""}
      <div class="comparison-block"><div><h3>Modeled paying profiles</h3><p>${payingCaption}</p></div><strong>${payingStart}${canCompareTestedChange || unchangedBaseline ? ` <span>→</span> ${day30Paying}` : ""} <small>of ${counts.total}</small></strong></div>
      <div class="comparison-block"><div><h3>Hypothetical monthly GMV</h3><p>${gmvCaption}</p></div><strong>${canCompareTestedChange || unchangedBaseline ? `$${Number(gmvStart) || 0} <span>→</span> ` : ""}$${Number(telemetry.day30MonthlyGmv ?? telemetry.pivotedMonthlyGmv) || 0}</strong></div>
    </section>
    <section class="report-section">
      <h2>Strongest friction and attraction signals</h2>
      <p>These labels summarize synthetic profiles. They show what the simulation emphasized; they do not prove that a feature caused an outcome.</p>
      <dl class="signal-list"><div><dt>Most common friction label among inactive Day-14 profiles</dt><dd>${esc(trigger.feature || "Not available")} <span>${Number(trigger.count) || 0} profiles</span></dd></div><div><dt>Most common favorite among active Day-1 profiles</dt><dd>${esc(viral.feature || "Not available")} <span>${Number(viral.count) || 0} profiles</span></dd></div></dl>
    </section>
    <section class="report-section brief-section">
      <h2>Startup brief used</h2>
      ${renderBrief(input)}
    </section>
    <section class="report-section page-start">
      <h2>Three simulated customer paths</h2>
      <p>${testedChange && hasBaselineSnapshot ? "Day 1 and Day 14 remain on the unchanged idea. Each Day-30 example shows the saved baseline beside the tested change." : testedChange ? "This saved result includes a change, but the original aggregate baseline was not saved. These synthetic profiles are not customer testimonials." : "These examples are selected from the unchanged baseline. They are synthetic profiles, not customer testimonials."}</p>
      ${renderSamples(personas, result)}
      <h2 class="social-heading">Scenario conversations</h2>
      <p>Threads are generated scenario material assigned before the customer profiles; no real posts or interactions were observed.</p>
      ${renderSocial(result.ontology?.socialThreads || [])}
    </section>
    <section class="report-section page-start venture-section">
      <h2>Venture critique</h2>
      <p>${textBlock(diagnosis)}</p>
      <div class="score-line"><span>Model score before feature triage</span><strong>${Number(critic.overallViabilityScoreRaw) || 0} / 100</strong><span>After feature triage</span><strong>${Number(critic.overallViabilityScorePivoted) || 0} / 100</strong></div>
      <p class="score-caveat">These are generated venture-critique judgments, not objective investment ratings. The “after feature triage” score is not a simulated outcome; customer results change only when a separate Day-30 scenario is tested.</p>
      <h3 class="subheading">Feature triage</h3>
      ${renderTriage(critic.featureTriageMatrix)}
      <h3 class="subheading">${testedChange ? "Tested Day-30 change" : legacySavedRun ? "Change used in this older saved run" : "Optional change suggestion · not applied"}</h3>
      <p class="pivot-summary">${textBlock(describedChange)}</p>
      <h3 class="subheading">90-day action plan</h3>
      ${renderActionPlan(critic.ninetyDayActionPlan)}
    </section>
    <section class="report-section page-start market-section">
      <h2>Market and capital hypotheses</h2>
      ${renderMarket({ ...(critic.marketResearch || {}), vcPipeline: critic.vcPipeline || [] })}
      <h2 class="social-heading">How to use this report</h2>
      <ol class="next-steps"><li>Pick one assumption that would change your next product decision.</li><li>Write a test with real prospective customers and define what result would change your mind.</li><li>Use this simulation to choose what to ask or observe; real customers decide what is true.</li></ol>
      <footer class="report-footer"><strong>Limits and source notes</strong><p>This PDF summarizes one synthetic run. Model outputs depend on the brief, any supplied research notes, and the configured provider. ${esc(seedIncluded)} Market estimates and investor suggestions need independent verification. No real customer observations are included.</p><p>Run ID: ${esc(result.id || "unavailable")} · Generated locally by CrucibleFish · No additional AI call was used to create this report.</p></footer>
    </section>
  </article>`;
}

async function loadReport() {
  const runId = new URLSearchParams(location.search).get("run");
  if (!runId) throw new Error("This report link is missing its run ID. Return to CrucibleFish and open the PDF report from a completed run.");
  const response = await fetch(`/api/runs/${encodeURIComponent(runId)}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "This saved run could not be loaded.");
  const result = payload.result || payload;
  if (!result.input || !Array.isArray(result.personas)) throw new Error("The saved run does not contain a complete simulation report.");
  root.innerHTML = renderReport(result);
  root.setAttribute("aria-busy", "false");
  document.title = `${String(result.input.startupName || "CrucibleFish").slice(0, 80)} — CrucibleFish report`;
  printButton.disabled = false;
}

printButton.addEventListener("click", () => window.print());
loadReport().catch((error) => {
  root.innerHTML = `<section class="report-error"><h1>Could not prepare this report</h1><p>${esc(error.message)}</p><a class="return-link" href="/">Return to CrucibleFish</a></section>`;
  root.setAttribute("aria-busy", "false");
});
