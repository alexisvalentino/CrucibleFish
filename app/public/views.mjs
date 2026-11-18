export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
export const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
export const avatar = (character, className = "avatar") => {
  const initial = String(character?.name || "M").trim().charAt(0).toUpperCase() || "M";
  return `<span class="${className}" aria-hidden="true">${esc(initial)}</span>`;
};
export const titleCase = (value) => String(value || "").toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
export function fmt(text) {
  let source = String(text || "");
  let heading = "";
  if (source.startsWith("# ")) {
    const end = source.indexOf("\n");
    heading = `<h1 class="welcome-title">${esc(source.slice(2, end < 0 ? undefined : end))}</h1>`;
    source = end < 0 ? "" : source.slice(end + 1);
  }
  const paragraphs = source.split(/\n{2,}/).filter((part) => part.trim()).map((part) => `<p>${esc(part).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replaceAll("\n", "<br>")}</p>`).join("");
  return heading + paragraphs;
}
export const FLOORS = {
  1: { day: "Day 1", short: "Launch", title: "Discovery and first value", description: "Adoption before routine friction sets in.", retentionKey: "day1Adoption" },
  2: { day: "Day 14", short: "Friction", title: "Reality and social contagion", description: "The raw idea meets habits, effort, and community critique.", retentionKey: "day14Active" },
  3: { day: "Day 30", short: "Pivot", title: "Response to the intervention", description: "Cumulative memory decides who returns, pays, or stays away.", retentionKey: "day30Active" },
};
const ARCHETYPES = ["HAIR_ON_FIRE_POWER_USER", "PRAGMATIC_URBAN_MAINSTREAM", "SKEPTICAL_INCUMBENT_LOYALIST", "PRICE_SENSITIVE_FREE_RIDER", "B2B_SUPPLY_SIDE_PARTNER"];
const STATUS_LABELS = { paying: "Paying champion", saved: "Saved by pivot", free: "Free active", churned: "Churned" };
export function statusFor(persona, floor) {
  if (floor === 3) return { PAYING_CHAMPION: "paying", SAVED_BY_GODS_EYE_PIVOT: "saved", FREE_ACTIVE_DATA_CONTRIBUTOR: "free" }[persona.finalLifecycleStatus] || "churned";
  const action = floor === 1 ? persona.round1Day1Action : persona.round2Day14ActionRawIdea;
  if (action === "CONVERT_TO_PAID") return "paying";
  return ["ADOPT_AND_EVANGELIZE", "ADOPT_PASSIVELY"].includes(action) ? "free" : "churned";
}
function legend() {
  return `<div class="agent-legend" aria-label="Customer status legend">${Object.entries(STATUS_LABELS).map(([key, label]) => `<span class="legend-item ${key}"><i class="legend-dot"></i>${label}</span>`).join("")}</div>`;
}
function socialThread(result, floor, channel) {
  const threads = result.ontology?.socialThreads || [];
  const thread = threads.find((item) => item.round === floor && item.channel === channel) || threads.find((item) => item.round === floor);
  if (!thread) return `<div class="empty-state">No seed thread was generated for this floor.</div>`;
  return `<article class="social-post"><div class="post-author"><span class="post-index">#${thread.authorPersonaId}</span><span><strong>${esc(thread.authorName)}</strong><small>${esc(titleCase(thread.authorArchetype))}</small></span></div><h4>${esc(thread.postTitleOrHook)}</h4><p>${esc(thread.postBody)}</p><div class="post-meta"><span>${thread.upvotes} upvotes</span><span>${thread.replyCount} replies</span><span>${esc(titleCase(thread.sentiment))}</span></div><div class="influence-line">Triggered by ${esc(thread.triggeredByFeature)} · Influenced customer IDs ${thread.influencedPersonaIds.map((id) => `#${id}`).join(", ") || "none"}</div></article>`;
}
export function renderSimulation(state) {
  const { result, floor } = state;
  const t = result.telemetry;
  const current = FLOORS[floor];
  const people = result.personas.filter((persona) => (state.archetypeFilter === "ALL" || persona.archetype === state.archetypeFilter) && (state.statusFilter === "ALL" || statusFor(persona, floor) === state.statusFilter));
  state.gridFocusId = people.some((persona) => persona.id === state.gridFocusId) ? state.gridFocusId : people[0]?.id || null;
  const floorButtons = Object.entries(FLOORS).map(([number, meta]) => `<button type="button" class="floor-button ${Number(number) === floor ? "active" : ""}" data-floor="${number}" aria-pressed="${Number(number) === floor}"><strong>${meta.day}</strong><small>${meta.short}</small><span class="floor-retention">${t[meta.retentionKey]}%</span></button>`).join("");
  const archetypeOptions = ["ALL", ...ARCHETYPES].map((value) => `<option value="${value}" ${state.archetypeFilter === value ? "selected" : ""}>${value === "ALL" ? "All archetypes" : esc(titleCase(value).replace("Pragmatic Urban ", "").replace("Hair On Fire ", ""))}</option>`).join("");
  const statusOptions = [["ALL", "All statuses"], ...Object.entries(STATUS_LABELS)].map(([value, label]) => `<option value="${value}" ${state.statusFilter === value ? "selected" : ""}>${label}</option>`).join("");
  const nodes = people.map((persona) => {
    const status = statusFor(persona, floor);
    return `<button type="button" tabindex="${state.gridFocusId === persona.id ? "0" : "-1"}" class="agent-node status-${status} ${state.selectedPersonaId === persona.id ? "selected" : ""}" data-persona="${persona.id}" title="#${persona.id} ${esc(persona.name)} — ${STATUS_LABELS[status]}" aria-label="Customer ${persona.id}, ${esc(persona.name)}, ${STATUS_LABELS[status]}"></button>`;
  }).join("");
  return `<div class="simulation-view">
    <section class="telemetry" aria-label="Simulation telemetry"><div class="telemetry-item"><strong>${t.day1Adoption}<span>%</span></strong><small>Day-1 adoption</small></div><div class="telemetry-item"><strong>${t.day14Active}<span>%</span></strong><small>Raw Day-14 active</small></div><div class="telemetry-item"><strong class="delta">${t.day30Active}<span>%</span></strong><small>Day-30 active · +${t.retentionLift} pts</small></div></section>
    <div class="trap-line"><strong>Founder trap</strong><p>${esc(t.topChurnTrigger.feature)} drives ${t.topChurnTrigger.count} inactive-customer memories. Paid conversion moves ${t.rawPaying} → ${t.pivotedPaying} after the pivot.</p></div>
    <div class="floor-layout"><nav class="floor-directory" aria-label="Temporal simulation floors">${floorButtons}</nav><section class="floor-stage" aria-label="${current.title}"><div class="floor-stage-head"><div><h3>${current.title}</h3><p>${current.description}</p></div><span class="cohort-count">${people.length} / 100 shown</span></div><div class="filter-bar"><label class="sr-only" for="archetypeFilter">Filter by archetype</label><select id="archetypeFilter">${archetypeOptions}</select><label class="sr-only" for="statusFilter">Filter by status</label><select id="statusFilter">${statusOptions}</select></div><span class="sr-only" id="customerGridHelp">Use arrow keys to move between customers. Press Enter to inspect a customer.</span><div class="agent-grid" role="group" aria-label="Simulated customers" aria-describedby="customerGridHelp">${nodes || `<div class="empty-filter">No customers match these filters. Clear one filter to bring them back.</div>`}</div>${legend()}</section></div>
    <section class="social-evidence"><div class="social-head"><h3>Social contagion</h3><div class="channel-tabs" role="group" aria-label="Social channel"><button type="button" class="channel-tab ${state.channel === "SHORT_FORM_TIKTOK_X" ? "active" : ""}" data-channel="SHORT_FORM_TIKTOK_X">Viral feed</button><button type="button" class="channel-tab ${state.channel === "COMMUNITY_REDDIT_FB_GROUP" ? "active" : ""}" data-channel="COMMUNITY_REDDIT_FB_GROUP">Community</button></div></div>${socialThread(result, floor, state.channel)}</section>
    <form class="pivot-form" id="pivotForm"><label for="pivotInput">Test a God’s-eye intervention</label><textarea id="pivotInput" minlength="8" maxlength="3000" placeholder="What if clinics pay instead of pet owners, and the BLE tag is free after three events?" required ${state.pivoting ? "disabled" : ""}>${esc(state.pivotDraft)}</textarea><div class="pivot-footer"><small>Only Day 30 changes. Identities and the first two floors stay intact.</small><button class="button primary" type="submit" ${state.pivoting ? "disabled" : ""}>${state.pivoting ? "Re-simulating…" : "Run intervention"}</button></div><div class="inline-error" id="pivotError" role="alert" hidden></div></form>
  </div>`;
}
const VERDICTS = {
  CORE_WEDGE_KEEP: ["Keep", "keep"], TRIM_SCOPE: ["Trim scope", "trim"], KILL_MANUAL_UI: ["Kill manual UI", "kill"],
  REPURPOSE: ["Repurpose", "trim"], PHASE_1_AI_BUILD: ["Phase 1 build", "build"], PHASE_2_ODM_OR_MARKETPLACE: ["Phase 2 / ODM", "phase"],
};
export function renderCritique(state) {
  const critic = state.result.ventureCritic;
  const features = (critic.featureTriageMatrix || []).map((item) => {
    const [label, className] = VERDICTS[item.verdict] || [titleCase(item.verdict), "trim"];
    return `<tr><td>${esc(item.featureName)}<details class="feature-details"><summary>Reason and execution fix</summary><p>${esc(item.strategicRationale)}</p><p><strong>Fix:</strong> ${esc(item.executionFix)}</p><p><strong>Flywheel:</strong> ${esc(titleCase(item.dataFlywheelRole))}</p></details></td><td><span class="verdict ${className}">${label}</span></td><td>${item.predicted14DayRetentionPercent}%</td><td>${esc(titleCase(item.humanEffortRating))}</td></tr>`;
  }).join("");
  const stages = (critic.fourStageDataFlywheel || []).map((stage) => `<div class="flywheel-stage"><span class="stage-number">${stage.stageNumber}</span><div><h4>${esc(stage.stageTitle)}</h4><p>${esc(stage.mechanismDescription)}</p><div class="data-list">${stage.structuredDataCaptured.map((data) => `<span class="data-tag">${esc(data)}</span>`).join("")}</div><p><strong>Output:</strong> ${esc(stage.outputToNextStage)}</p></div></div>`).join("");
  const roadmap = (critic.ninetyDayActionPlan || []).map((month) => `<div class="roadmap-item"><strong>${esc(titleCase(month.month))} · ${esc(month.focusTitle)}</strong><ul>${month.concreteDeliverables.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>`).join("");
  return `<div class="analysis-view"><section class="analysis-intro"><h3>${esc(state.result.input.startupName)} needs a narrower first loop.</h3><p>${esc(critic.executiveDiagnosis)}</p><div class="score-comparison"><div class="score-item"><strong>${critic.overallViabilityScoreRaw}</strong><small>Raw viability / 100</small></div><span class="score-arrow">→</span><div class="score-item pivoted"><strong>${critic.overallViabilityScorePivoted}</strong><small>After triage / 100</small></div></div></section><section class="analysis-section"><h3>Feature triage</h3><p class="section-copy">Every current and planned feature has a verdict, effort rating, and predicted raw retention.</p><table class="triage-table"><thead><tr><th>Feature</th><th>Verdict</th><th>Day 14</th><th>Effort</th></tr></thead><tbody>${features}</tbody></table></section><section class="analysis-section"><h3>Data-to-AI flywheel</h3><p class="section-copy">Ground truth enters only when a real outcome verifies the input.</p><div class="flywheel">${stages}</div></section><section class="analysis-section"><h3>Recommended God’s-eye pivot</h3><p class="section-copy">${esc(critic.recommendedGodsEyePivotSummary)}</p></section><section class="analysis-section"><h3>90-day action plan</h3>${roadmap}</section></div>`;
}

export function renderMarket(state) {
  const research = state.result.ventureCritic.marketResearch || { metrics: [], regionalCompetitors: [], globalBenchmarks: [] };
  const metrics = research.metrics.map((metric) => `<tr><td>${esc(metric.segmentName)}</td><td>${esc(metric.valuation2026)}</td><td>${esc(metric.cagrPercent)}</td><td>${esc(metric.projectedValuation)}</td></tr>`).join("");
  const nodes = (state.result.ontology?.knowledgeGraph?.nodes || []).map((node) => `<div class="reality-node"><span>${esc(node.label)}</span><span title="Effort or friction">${node.effortOrFrictionScore}/10</span><span title="Standalone value">${node.standaloneValueScore}/10</span></div>`).join("");
  const vcs = (state.result.ventureCritic.vcPipeline || []).map((vc) => `<tr><td><span class="vc-tier">${vc.tier === "GLOBAL_SPECIALIST" ? "Global specialist" : "PH / SEA"}</span>${esc(vc.firmName)}</td><td>${esc(vc.stageAndCheckSize)}<details class="feature-details"><summary>Fit and pitch angle</summary><p>${esc(vc.whyTheyFitAndPitchAngle)}</p><p>${esc(vc.notableComparablePortfolio)}</p></details></td></tr>`).join("");
  return `<div class="analysis-view"><div class="notice">Market sizes and investor matches are ${state.result.demo ? "illustrative demo values" : "model-generated hypotheses"}. Verify sources, mandates, and current check sizes before using them externally.</div><section class="analysis-section"><h3>Market reality graph</h3><p class="section-copy">Features and incumbent habits scored by friction and standalone value.</p><div class="reality-node"><span>Node</span><span>Friction</span><span>Value</span></div>${nodes}</section><section class="analysis-section"><h3>Market sizing</h3><table class="market-table"><thead><tr><th>Segment</th><th>2026</th><th>CAGR</th><th>Projection</th></tr></thead><tbody>${metrics}</tbody></table><div class="roadmap-item"><strong>Local edge to test</strong><p class="section-copy">${esc(research.unfairLocalEdge)}</p></div></section><section class="analysis-section"><h3>Incumbents and benchmarks</h3><p class="section-copy"><strong>Regional:</strong> ${research.regionalCompetitors.map(esc).join(" · ")}</p><p class="section-copy"><strong>Global:</strong> ${research.globalBenchmarks.map(esc).join(" · ")}</p></section><section class="analysis-section"><h3>Venture pipeline</h3><p class="section-copy">A research shortlist, not a claim of investor interest.</p><table class="market-table"><thead><tr><th>Firm</th><th>Stage and fit</th></tr></thead><tbody>${vcs}</tbody></table></section></div>`;
}
export function renderEvidence(state) {
  const entries = state.evidence || [];
  const runOptions = `<option value="">No linked run</option><option value="demo-pawsmatch">PawsMatch demo</option>${(state.history || []).map((run) => `<option value="${esc(run.id)}">${esc(run.startupName || run.id)}</option>`).join("")}`;
  const tools = `<div class="evidence-tools"><button class="button secondary" id="exportEvidenceJson" type="button">Export JSON</button><button class="button secondary" id="exportEvidenceCsv" type="button">Export CSV</button><button class="button secondary" id="importEvidenceBtn" type="button">Import JSON</button><input type="file" id="importEvidenceFile" accept=".json,application/json" hidden></div>`;
  const form = `<form class="evidence-form" id="evidenceForm"><div class="form-grid two"><label class="field"><span>Week ending</span><input type="date" id="evidenceWeek" required></label><label class="field"><span>Cohort size <em>Optional</em></span><input type="number" id="evidenceCohort" min="0" step="1" placeholder="40"></label></div><div class="form-grid two"><label class="field"><span>Source of numbers</span><select id="evidenceSource"><option value="MEASURED">Measured</option><option value="ESTIMATED">Estimated</option></select></label><label class="field"><span>Linked run <em>Optional</em></span><select id="evidenceRun">${runOptions}</select></label></div><label class="field"><span>What this week tests <em>Optional</em></span><input id="evidenceHypothesis" maxlength="200" placeholder="e.g. Clinics pay for structured intake"></label><div class="form-grid two"><label class="field"><span>Interviews completed <em>Optional</em></span><input type="number" id="evidenceInterviews" min="0" step="1" placeholder="0"></label><label class="field"><span>Active customers <em>Optional</em></span><input type="number" id="evidenceActive" min="0" step="1" placeholder="0"></label></div><div class="form-grid two"><label class="field"><span>Churned <em>Optional</em></span><input type="number" id="evidenceChurned" min="0" step="1" placeholder="0"></label><label class="field"><span>Paid conversions <em>Optional</em></span><input type="number" id="evidencePaid" min="0" step="1" placeholder="0"></label></div><label class="field"><span>Observed GMV, USD <em>Optional</em></span><input type="number" id="evidenceGmv" min="0" step="1" placeholder="0"></label><label class="field"><span>What you actually learned</span><textarea id="evidenceNote" rows="3" maxlength="2000" required placeholder="A real quote, decision, or surprise from this week."></textarea></label><div class="evidence-form-footer"><button class="button primary" type="submit">Add weekly observation</button><span>Real data only — stored in this browser.</span></div></form>`;
  const table = entries.length ? `<table class="evidence-table"><thead><tr><th>Week</th><th>Cohort</th><th>Source</th><th>Run</th><th>Interviews</th><th>Active</th><th>Churned</th><th>Paid</th><th>GMV</th><th>Observation</th><th></th></tr></thead><tbody>${entries.map((entry) => `<tr><td>${esc(entry.weekEnding)}</td><td>${entry.cohortSize ?? "—"}</td><td>${entry.source === "ESTIMATED" ? "Estimated" : "Measured"}</td><td>${esc(entry.runId || "—")}</td><td>${entry.interviews ?? "—"}</td><td>${entry.active ?? "—"}</td><td>${entry.churned ?? "—"}</td><td>${entry.paid ?? "—"}</td><td>${entry.gmv !== null ? `$${entry.gmv}` : "—"}</td><td>${entry.hypothesis ? `<strong>${esc(entry.hypothesis)}</strong><br>` : ""}${esc(entry.note)}</td><td><button class="button text-button" type="button" data-remove-evidence="${esc(entry.id)}" aria-label="Remove observation for ${esc(entry.weekEnding)}">Remove</button></td></tr>`).join("")}</tbody></table>` : `<div class="notice">No observations yet. Log one real week to start calibrating the hypotheses above.</div>`;
  return `<div class="evidence-view"><div class="analysis-intro"><h3>Real evidence, kept separate from the simulation.</h3><p>Record what actually happened each week, including the cohort size and whether the numbers were measured or estimated. Link an entry to a run to compare its prediction with reality. The guide treats these as observed facts, never as model output.</p></div>${tools}${form}<section class="analysis-section"><h3>Weekly observations</h3><p class="section-copy">${entries.length} recorded · newest first · stored only in this browser.</p>${table}</section></div>`;
}

export function renderCalibration(state) {
  const entries = (state.evidence || []).filter((entry) => entry.runId);
  const runs = state.calibrationRuns || {};
  const intro = `<div class="analysis-intro"><h3>Prediction versus reality.</h3><p>Observations linked to a run are compared with that run's post-pivot telemetry. Cohorts and timing may differ from the 100 synthetic customers, so treat a gap as a question to investigate — not proof the model was wrong.</p></div>`;
  if (!entries.length) return `<div class="analysis-view">${intro}<div class="notice">No linked observations yet. In the Evidence log, choose a run when you record a week to unlock this view.</div></div>`;
  const num = (value) => (value === null || value === undefined || value === "" ? null : Number(value));
  const diffCell = (predicted, observed) => {
    const a = num(predicted); const b = num(observed);
    if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return "—";
    const delta = b - a;
    return `<span class="calib-diff ${delta > 0 ? "up" : delta < 0 ? "down" : ""}">${delta > 0 ? "+" : ""}${Math.round(delta)}</span>`;
  };
  const rows = [];
  for (const entry of entries) {
    const telemetry = runs[entry.runId]?.result?.telemetry;
    if (!telemetry) { rows.push(`<tr><td>${esc(entry.weekEnding)}</td><td colspan="5">Run ${esc(entry.runId)} is not loaded yet.</td></tr>`); continue; }
    const cohort = num(entry.cohortSize);
    const observedActive = cohort && entry.active !== null ? Math.round((Number(entry.active) / cohort) * 100) : null;
    const observedPaid = cohort && entry.paid !== null ? Math.round((Number(entry.paid) / cohort) * 100) : null;
    const metrics = [
      { name: "Active", predicted: telemetry.day30Active, observed: observedActive, predictedLabel: `${telemetry.day30Active}%`, observedLabel: observedActive === null ? "—" : `${observedActive}%` },
      { name: "Paying", predicted: telemetry.pivotedPaying, observed: observedPaid, predictedLabel: `${telemetry.pivotedPaying}%`, observedLabel: observedPaid === null ? "—" : `${observedPaid}%` },
      { name: "Churned", predicted: 100 - telemetry.day30Active, observed: num(entry.churned), predictedLabel: `${100 - telemetry.day30Active}`, observedLabel: entry.churned ?? "—" },
      { name: "GMV (USD)", predicted: telemetry.pivotedMonthlyGmv, observed: num(entry.gmv), predictedLabel: `$${telemetry.pivotedMonthlyGmv}`, observedLabel: entry.gmv !== null ? `$${entry.gmv}` : "—" },
    ];
    for (const metric of metrics) rows.push(`<tr><td>${esc(entry.weekEnding)}</td><td>${esc(entry.hypothesis || entry.note.slice(0, 60))}</td><td>${esc(metric.name)}</td><td>${esc(metric.predictedLabel)}</td><td>${esc(metric.observedLabel)}</td><td>${diffCell(metric.predicted, metric.observed)}</td></tr>`);
  }
  return `<div class="analysis-view">${intro}<section class="analysis-section"><h3>Linked observations</h3><p class="section-copy">${entries.length} linked · positive difference means reality was higher than the prediction.</p><table class="calibration-table"><thead><tr><th>Week</th><th>Test</th><th>Metric</th><th>Predicted</th><th>Observed</th><th>Difference</th></tr></thead><tbody>${rows.join("")}</tbody></table></section></div>`;
}

export function renderPersona(persona) {
  const days = ["Day 1", "Day 14", "Day 30"];
  const actions = [persona.round1Day1Action, persona.round2Day14ActionRawIdea, persona.round3Day30ActionAfterPivot];
  return `<div class="persona-overview"><span class="avatar">#${persona.id}</span><div><h3>${esc(persona.name)}</h3><p>${persona.age} · ${esc(persona.occupation)} · ${esc(persona.locationCity)}</p><span class="persona-status">${esc(titleCase(persona.finalLifecycleStatus))}</span></div></div><div class="persona-facts"><div class="persona-fact"><strong>Archetype</strong><span>${esc(titleCase(persona.archetype))}</span></div><div class="persona-fact"><strong>Social role</strong><span>${esc(titleCase(persona.socialInfluenceRole))}</span></div><div class="persona-fact"><strong>Budget</strong><span>${esc(persona.monthlyDisposableBudgetLocal)}</span></div><div class="persona-fact"><strong>Incumbent tools</strong><span>${persona.incumbentToolsUsed.map(esc).join(" · ")}</span></div><div class="persona-fact"><strong>Loved</strong><span>${esc(persona.favoriteFeature)}</span></div><div class="persona-fact"><strong>Rejected</strong><span>${esc(persona.mostHatedFeature)}</span></div></div><div class="notice">${esc(persona.specificIdentityContext)}</div><section class="memory-timeline"><h4>Episodic memory</h4>${persona.episodicMemoryLog.map((memory, index) => `<div class="memory-entry"><strong>${days[index]}</strong><div><p>${esc(memory)}</p><p><strong>Action:</strong> ${esc(titleCase(actions[index]))}</p></div></div>`).join("")}</section><div class="persona-actions"><span class="persona-wtp">Willingness to pay<br><strong>$${persona.willingnessToPayMonthlyUsdAfterPivot}</strong> / month after pivot</span><button class="button primary" type="button" data-ask-persona="${persona.id}">Ask the guide about #${persona.id}</button></div>`;
}

export function renderFeatureRows(features, type) {
  const planned = type === "planned";
  return features.map((feature, index) => `<div class="feature-row ${planned ? "planned" : ""}" data-feature-index="${index}"><label class="field"><span>Name</span><input data-field="name" value="${esc(feature.name)}" required></label><label class="field"><span>Description</span><input data-field="description" value="${esc(feature.description)}" required></label>${planned ? `<label class="field"><span>Category</span><select data-field="category">${["AI_VISION", "HARDWARE_WEARABLE", "TELEHEALTH", "MARKETPLACE", "OTHER"].map((category) => `<option value="${category}" ${feature.category === category ? "selected" : ""}>${titleCase(category)}</option>`).join("")}</select></label>` : `<label class="feature-check"><input data-field="isManualInputRequired" type="checkbox" ${feature.isManualInputRequired ? "checked" : ""}>Routine manual input</label>`}<button class="icon-button remove-feature" type="button" data-remove-feature="${index}" data-feature-type="${type}" aria-label="Remove ${esc(feature.name || "feature")}" title="Remove feature">${icon("trash")}</button></div>`).join("");
}
