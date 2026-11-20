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
  return ({ PAYING_CHAMPION: "Paying after pivot", SAVED_BY_GODS_EYE_PIVOT: "Stayed after pivot", FREE_ACTIVE_DATA_CONTRIBUTOR: "Active on free tier", CHURNED_PERMANENTLY: "Churned by Day 30" })[persona.finalLifecycleStatus] || "Status unavailable";
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
  const rawPaid = personas.filter((persona) => persona.round2Day14ActionRawIdea === "CONVERT_TO_PAID").length;
  const pivotPaid = personas.filter((persona) => persona.finalLifecycleStatus === "PAYING_CHAMPION").length;
  return { total, day1, day14, day30, rawPaid, pivotPaid };
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
  return `<dl class="brief-list">${fields.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${textBlock(value)}</dd></div>`).join("")}${input.websiteUrl ? `<div><dt>Website</dt><dd>${safeWebsite(input.websiteUrl)}</dd></div>` : ""}<div><dt>Seed material</dt><dd>${input.seedMaterial ? "Provided to the simulation; source text is omitted from this PDF." : "None provided."}</dd></div></dl>`;
}
function renderSamples(personas) {
  const wanted = ["PAYING_CHAMPION", "SAVED_BY_GODS_EYE_PIVOT", "CHURNED_PERMANENTLY"];
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
    ["Day 30", "round3Day30ActionAfterPivot", "round3PivotReactionNote"],
  ];
  return chosen.map((persona) => `<article class="customer-sample">
    <header><div><h3>Customer #${Number(persona.id) || "—"} · ${esc(persona.name || "Unnamed profile")}</h3><p>${esc(persona.occupation || "Occupation unspecified")} · ${esc(persona.locationCity || "Location unspecified")}</p></div><span class="sample-status">${esc(statusLabel(persona))}</span></header>
    <p class="sample-context">${esc(persona.specificIdentityContext || "No profile context supplied.")}</p>
    <dl class="sample-timeline">${days.map(([label, action, note]) => `<div><dt>${label} · ${esc(actionLabel(persona[action]))}</dt><dd>${esc(persona[note] || "No note supplied.")}</dd></div>`).join("")}</dl>
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
  return `<div class="social-list">${selected.map((thread) => `<article><div class="social-meta">${esc(({ 1: "Day 1 · Launch", 2: "Day 14 · Friction", 3: "Day 30 · Pivot" })[thread.round] || "Scenario thread")} · ${esc(titleCase(thread.channel))}</div><h3>${esc(thread.postTitleOrHook || "Untitled thread")}</h3><p>${esc(thread.postBody || "")}</p><small>${Number(thread.influencedPersonaIds?.length) || 0} simulated customers were assigned as influenced</small></article>`).join("")}</div>`;
}
function renderReport(result) {
  const input = result.input || {};
  const critic = result.ventureCritic || {};
  const telemetry = result.telemetry || {};
  const personas = Array.isArray(result.personas) ? result.personas : [];
  const counts = getCounts(personas);
  const trigger = telemetry.topChurnTrigger || {};
  const viral = telemetry.topViralHook || {};
  const pivot = result.pivotHistory?.at(-1)?.pivot || critic.recommendedGodsEyePivotSummary || "No pivot description was saved.";
  const day14Difference = percent(counts.day14, counts.total) - percent(counts.day1, counts.total);
  const day30Difference = percent(counts.day30, counts.total) - percent(counts.day14, counts.total);
  const diagnosis = critic.executiveDiagnosis || "No venture diagnosis was returned for this run.";
  const resultType = result.demo ? "Illustrative demo · synthetic example" : "Live run · synthetic simulation";
  const seedIncluded = input.seedMaterial ? "Seed material informed the simulation; its source text is omitted from this PDF." : "No seed material was included.";
  return `<article class="report-document">
    <header class="report-brand"><span>CrucibleFish</span><span>${esc(resultType)}</span></header>
    <section class="report-intro">
      <p class="report-date">Run completed ${esc(dateLabel(result.createdAt))}</p>
      <h1>${esc(input.startupName || "Startup simulation")}</h1>
      <p class="report-pitch">${esc(input.oneLinePitch || "No pitch was saved with this run.")}</p>
    </section>
    <aside class="truth-note"><strong>Read this as a stress test.</strong><span>These ${counts.total} customer profiles and every retention, payment, market, and social figure below are model-generated hypotheses. They are not interviews, observed behavior, revenue forecasts, or verified market research.</span></aside>
    <section class="report-section overview-section">
      <h2>What happened across the three floors</h2>
      <p class="section-lead">${textBlock(diagnosis)}</p>
      <div class="floor-chart" aria-label="Synthetic activity across the simulation floors">
        ${floorRow("Day 1", "Adopted or paid at first use", counts.day1, counts.total, "day-one")}
        ${floorRow("Day 14", "Still active on the raw idea", counts.day14, counts.total, "day-fourteen")}
        ${floorRow("Day 30", "Active after the pivot", counts.day30, counts.total, "day-thirty")}
      </div>
      <div class="reading-note"><strong>How to read this:</strong> the activity share changed ${Math.abs(day14Difference)} points from Day 1 to Day 14 (${day14Difference > 0 ? "up" : day14Difference < 0 ? "down" : "unchanged"}), then ${Math.abs(day30Difference)} points from Day 14 to Day 30 (${day30Difference > 0 ? "up" : day30Difference < 0 ? "down" : "unchanged"}). Day 30 includes the pivot, so it is a different scenario state.</div>
      <div class="comparison-block"><div><h3>Modeled paying profiles</h3><p>Raw idea at Day 14 → after pivot at Day 30</p></div><strong>${counts.rawPaid} <span>→</span> ${counts.pivotPaid} <small>of ${counts.total}</small></strong></div>
      <div class="comparison-block"><div><h3>Hypothetical monthly GMV</h3><p>Modelled willingness to pay, not booked revenue</p></div><strong>$${Number(telemetry.rawMonthlyGmv) || 0} <span>→</span> $${Number(telemetry.pivotedMonthlyGmv) || 0}</strong></div>
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
      <p>These are examples selected from the generated cohort to make the shift easier to inspect. They are synthetic profiles, not customer testimonials.</p>
      ${renderSamples(personas)}
      <h2 class="social-heading">Scenario conversations</h2>
      <p>Threads are generated scenario material assigned before the customer profiles; no real posts or interactions were observed.</p>
      ${renderSocial(result.ontology?.socialThreads || [])}
    </section>
    <section class="report-section page-start venture-section">
      <h2>Venture critique</h2>
      <p>${textBlock(diagnosis)}</p>
      <div class="score-line"><span>Model score before feature triage</span><strong>${Number(critic.overallViabilityScoreRaw) || 0} / 100</strong><span>After feature triage</span><strong>${Number(critic.overallViabilityScorePivoted) || 0} / 100</strong></div>
      <p class="score-caveat">These scores are generated judgments, not an objective investment rating.</p>
      <h3 class="subheading">Feature triage</h3>
      ${renderTriage(critic.featureTriageMatrix)}
      <h3 class="subheading">Applied Day-30 pivot</h3>
      <p class="pivot-summary">${textBlock(pivot)}</p>
      <h3 class="subheading">90-day action plan</h3>
      ${renderActionPlan(critic.ninetyDayActionPlan)}
    </section>
    <section class="report-section page-start market-section">
      <h2>Market and capital hypotheses</h2>
      ${renderMarket({ ...(critic.marketResearch || {}), vcPipeline: critic.vcPipeline || [] })}
      <h2 class="social-heading">How to use this report</h2>
      <ol class="next-steps"><li>Pick one assumption that would change your next product decision.</li><li>Write a test with real prospective customers and define what result would change your mind.</li><li>Record what happens in the Evidence log, then compare it with the simulation over time.</li></ol>
      <footer class="report-footer"><strong>Limits and source notes</strong><p>This PDF summarizes one synthetic run. Model outputs depend on the brief, any supplied seed material, and the configured provider. ${esc(seedIncluded)} Market estimates and investor suggestions need independent verification. No real customer evidence or Evidence log entries are included in this PDF.</p><p>Run ID: ${esc(result.id || "unavailable")} · Generated locally by CrucibleFish · No additional AI call was used to create this report.</p></footer>
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
