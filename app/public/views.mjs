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
  3: { day: "Day 30", short: "Continue", title: "Day 30 with the idea unchanged", description: "How the same idea holds up without a future change.", retentionKey: "day30Active" },
};
const ARCHETYPES = ["HAIR_ON_FIRE_POWER_USER", "PRAGMATIC_URBAN_MAINSTREAM", "SKEPTICAL_INCUMBENT_LOYALIST", "PRICE_SENSITIVE_FREE_RIDER", "B2B_SUPPLY_SIDE_PARTNER"];
const STATUS_LABELS = { paying: "Paying champion", saved: "Saved by change", free: "Free active", churned: "Churned" };
export function statusFor(persona, floor) {
  if (floor === 3) return { PAYING_CHAMPION: "paying", SAVED_BY_GODS_EYE_PIVOT: "saved", FREE_ACTIVE_DATA_CONTRIBUTOR: "free" }[persona.finalLifecycleStatus] || "churned";
  const action = floor === 1 ? persona.round1Day1Action : persona.round2Day14ActionRawIdea;
  if (action === "CONVERT_TO_PAID") return "paying";
  return ["ADOPT_AND_EVANGELIZE", "ADOPT_PASSIVELY"].includes(action) ? "free" : "churned";
}
function legend() {
  return `<div class="agent-legend" aria-label="Customer status legend">${Object.entries(STATUS_LABELS).map(([key, label]) => `<span class="legend-item ${key}"><i class="legend-dot"></i>${label}</span>`).join("")}</div>`;
}
function socialThread(result, channel, roundFilter = "ALL") {
  const threads = (result.ontology?.socialThreads || []).filter((item) =>
    item.channel === channel && (roundFilter === "ALL" || item.round === Number(roundFilter)));
  if (!threads.length) return `<div class="empty-state">No thread was generated for this channel${roundFilter === "ALL" ? "" : ` in round ${roundFilter}`}.</div>`;
  const personas = new Map((result.personas || []).map((persona) => [persona.id, persona]));
  const roundLabel = (round) => ({ 1: "Day 1 · Launch", 2: "Day 14 · Friction", 3: "Day 30 · Continued use" })[round] || `Round ${round}`;
  return threads.map((thread) => {
    const influenced = (thread.influencedPersonaIds || []).map((id) => {
      const persona = personas.get(id);
      return `<button type="button" class="influence-chip" data-persona="${id}" title="${persona ? esc(persona.name) : `Customer ${id}`}">#${id}${persona ? ` · ${esc(titleCase(persona.round2Day14ActionRawIdea))}` : ""}</button>`;
    }).join("");
    return `<article class="social-post"><div class="post-top"><span class="post-round">${esc(roundLabel(thread.round))}</span><span class="post-sentiment">${esc(titleCase(thread.sentiment))}</span></div><div class="post-author"><span class="post-index">#${thread.authorPersonaId}</span><span><strong>${esc(thread.authorName)}</strong><small>${esc(titleCase(thread.authorArchetype))}</small></span></div><h4>${esc(thread.postTitleOrHook)}</h4><p>${esc(thread.postBody)}</p><div class="post-meta"><span>${thread.upvotes} upvotes</span><span>${thread.replyCount} replies</span><span>Triggered by ${esc(thread.triggeredByFeature)}</span></div><div class="influence-line"><strong>Influenced customers</strong><div class="influence-chips">${influenced || "none"}</div></div><button class="button text-button post-explain" type="button" data-explain-thread="${esc(thread.postTitleOrHook)}">Ask the guide why this spread</button></article>`;
  }).join("");
}
export function renderSimulation(state) {
  const { result, floor } = state;
  const t = result.telemetry;
  const hasPivot = Boolean(result.activePivot);
  const legacySavedRun = result.baselineMode !== "unchanged" && !hasPivot;
  const current = floor === 3 && hasPivot
    ? { ...FLOORS[3], short: "Scenario", title: "Day 30 after your change", description: "The same customer profiles respond to your optional future change." }
    : floor === 3 && legacySavedRun
      ? { ...FLOORS[3], short: "Saved run", title: "Day 30 from this saved run", description: "This older run includes the previous version's default change." }
      : FLOORS[floor];
  const people = result.personas.filter((persona) => (state.archetypeFilter === "ALL" || persona.archetype === state.archetypeFilter) && (state.statusFilter === "ALL" || statusFor(persona, floor) === state.statusFilter));
  state.gridFocusId = people.some((persona) => persona.id === state.gridFocusId) ? state.gridFocusId : people[0]?.id || null;
  const floorButtons = Object.entries(FLOORS).map(([number, baseMeta]) => {
    const meta = Number(number) === 3 && hasPivot ? { ...baseMeta, short: "Scenario" } : Number(number) === 3 && legacySavedRun ? { ...baseMeta, short: "Saved run" } : baseMeta;
    return `<button type="button" class="floor-button ${Number(number) === floor ? "active" : ""}" data-floor="${number}" aria-pressed="${Number(number) === floor}"><strong>${meta.day}</strong><small>${meta.short}</small><span class="floor-retention">${t[meta.retentionKey]}%</span></button>`;
  }).join("");
  const archetypeOptions = ["ALL", ...ARCHETYPES].map((value) => `<option value="${value}" ${state.archetypeFilter === value ? "selected" : ""}>${value === "ALL" ? "All archetypes" : esc(titleCase(value).replace("Pragmatic Urban ", "").replace("Hair On Fire ", ""))}</option>`).join("");
  const statusOptions = [["ALL", "All statuses"], ...Object.entries(STATUS_LABELS)].map(([value, label]) => `<option value="${value}" ${state.statusFilter === value ? "selected" : ""}>${label}</option>`).join("");
  const nodes = people.map((persona) => {
    const status = statusFor(persona, floor);
    return `<button type="button" tabindex="${state.gridFocusId === persona.id ? "0" : "-1"}" class="agent-node status-${status} ${state.selectedPersonaId === persona.id ? "selected" : ""}" data-persona="${persona.id}" title="#${persona.id} ${esc(persona.name)} — ${STATUS_LABELS[status]}" aria-label="Customer ${persona.id}, ${esc(persona.name)}, ${STATUS_LABELS[status]}"></button>`;
  }).join("");
  const day30Label = hasPivot ? "Day-30 active · tested change" : result.baselineMode === "unchanged" ? "Day-30 active · idea unchanged" : "Day-30 active · saved run";
  const day14Paying = t.day14Paying ?? t.rawPaying;
  const day30Paying = t.day30Paying ?? t.pivotedPaying;
  const comparison = hasPivot && result.baselineTelemetry
    ? `<section class="scenario-comparison" aria-label="Saved Day-30 result compared with tested change"><div><strong>Day-30 comparison</strong><small>${esc(result.comparisonLabel || "Unchanged baseline")} → tested change · same 100 synthetic profiles</small></div><div><span>Active</span><strong>${result.baselineTelemetry.day30Active}% → ${t.day30Active}%</strong></div><div><span>Paying</span><strong>${result.baselineTelemetry.day30Paying ?? result.baselineTelemetry.pivotedPaying} → ${day30Paying} / 100</strong></div></section>`
    : "";
  return `<div class="simulation-view">
    <section class="telemetry" aria-label="Simulation telemetry"><div class="telemetry-item"><strong>${t.day1Adoption}<span>%</span></strong><small>Day-1 adoption</small></div><div class="telemetry-item"><strong>${t.day14Active}<span>%</span></strong><small>Day-14 active</small></div><div class="telemetry-item"><strong class="delta">${t.day30Active}<span>%</span></strong><small>${day30Label}</small></div></section>
    <div class="trap-line"><strong>Main friction</strong><p>${esc(t.topChurnTrigger.feature)} appears in ${t.topChurnTrigger.count} inactive-customer memories. Paying customers: ${day14Paying} at Day 14 → ${day30Paying} at Day 30${hasPivot ? " after the tested change" : legacySavedRun ? " in this saved run" : " with the idea unchanged"}.</p></div>
    ${comparison}
    <div class="floor-layout"><nav class="floor-directory" aria-label="Temporal simulation floors">${floorButtons}</nav><section class="floor-stage" aria-label="${current.title}"><div class="floor-stage-head"><div><h3>${current.title}</h3><p>${current.description}</p></div><span class="cohort-count">${people.length} / 100 shown</span></div><div class="filter-bar"><label class="sr-only" for="archetypeFilter">Filter by archetype</label><select id="archetypeFilter">${archetypeOptions}</select><label class="sr-only" for="statusFilter">Filter by status</label><select id="statusFilter">${statusOptions}</select></div><span class="sr-only" id="customerGridHelp">Use arrow keys to move between customers. Press Enter to inspect a customer.</span><div class="agent-grid" role="group" aria-label="Simulated customers" aria-describedby="customerGridHelp">${nodes || `<div class="empty-filter">No customers match these filters. Clear one filter to bring them back.</div>`}</div>${legend()}</section></div>
    <section class="social-evidence"><div class="social-head"><div><h3>Social evidence</h3><p class="section-copy">Seed threads written before the customers were generated — not observed interactions.</p></div><div class="social-controls"><label class="sr-only" for="socialRound">Filter by round</label><select id="socialRound"><option value="ALL" ${state.socialRound === "ALL" ? "selected" : ""}>All rounds</option><option value="1" ${state.socialRound === "1" ? "selected" : ""}>Day 1</option><option value="2" ${state.socialRound === "2" ? "selected" : ""}>Day 14</option><option value="3" ${state.socialRound === "3" ? "selected" : ""}>Day 30</option></select><div class="channel-tabs" role="group" aria-label="Social channel"><button type="button" class="channel-tab ${state.channel === "SHORT_FORM_TIKTOK_X" ? "active" : ""}" data-channel="SHORT_FORM_TIKTOK_X">Short-form</button><button type="button" class="channel-tab ${state.channel === "COMMUNITY_REDDIT_FB_GROUP" ? "active" : ""}" data-channel="COMMUNITY_REDDIT_FB_GROUP">Community</button></div></div></div>${socialThread(result, state.channel, state.socialRound)}</section>
  </div>`;
}
const VERDICTS = {
  CORE_WEDGE_KEEP: ["Keep", "keep"], TRIM_SCOPE: ["Trim scope", "trim"], KILL_MANUAL_UI: ["Kill manual UI", "kill"],
  REPURPOSE: ["Repurpose", "trim"], PHASE_1_AI_BUILD: ["Phase 1 build", "build"], PHASE_2_ODM_OR_MARKETPLACE: ["Phase 2 / ODM", "phase"],
};
export function renderCritique(state) {
  const critic = state.result.ventureCritic;
  const legacySavedRun = state.result.baselineMode !== "unchanged" && !state.result.activePivot;
  const features = (critic.featureTriageMatrix || []).map((item) => {
    const [label, className] = VERDICTS[item.verdict] || [titleCase(item.verdict), "trim"];
    return `<tr><td>${esc(item.featureName)}<details class="feature-details"><summary>Reason and execution fix</summary><p>${esc(item.strategicRationale)}</p><p><strong>Fix:</strong> ${esc(item.executionFix)}</p><p><strong>Flywheel:</strong> ${esc(titleCase(item.dataFlywheelRole))}</p></details></td><td><span class="verdict ${className}">${label}</span></td><td>${item.predicted14DayRetentionPercent}%</td><td>${esc(titleCase(item.humanEffortRating))}</td></tr>`;
  }).join("");
  const stages = (critic.fourStageDataFlywheel || []).map((stage) => `<div class="flywheel-stage"><span class="stage-number">${stage.stageNumber}</span><div><h4>${esc(stage.stageTitle)}</h4><p>${esc(stage.mechanismDescription)}</p><div class="data-list">${stage.structuredDataCaptured.map((data) => `<span class="data-tag">${esc(data)}</span>`).join("")}</div><p><strong>Output:</strong> ${esc(stage.outputToNextStage)}</p></div></div>`).join("");
  const roadmap = (critic.ninetyDayActionPlan || []).map((month) => `<div class="roadmap-item"><strong>${esc(titleCase(month.month))} · ${esc(month.focusTitle)}</strong><ul>${month.concreteDeliverables.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>`).join("");
  const suggestedChange = critic.recommendedGodsEyePivotSummary;
  const changeSection = suggestedChange
    ? `<section class="analysis-section"><h3>${legacySavedRun ? "Change included in this older saved run" : "Optional future change · not applied"}</h3><p class="section-copy">${esc(suggestedChange)}</p>${legacySavedRun ? "" : `<p class="section-copy">The baseline above evaluates the idea as described. Test this separately only if it is useful to you.</p>`}</section>`
    : "";
  return `<div class="analysis-view"><section class="analysis-intro"><h3>${esc(state.result.input.startupName)} needs a narrower first loop.</h3><p>${esc(critic.executiveDiagnosis)}</p><div class="score-comparison"><div class="score-item"><strong>${critic.overallViabilityScoreRaw}</strong><small>Raw viability / 100</small></div><span class="score-arrow">→</span><div class="score-item pivoted"><strong>${critic.overallViabilityScorePivoted}</strong><small>After triage / 100</small></div></div></section><section class="analysis-section"><h3>Feature triage</h3><p class="section-copy">Current and future features are optional; only provided features appear here.</p><table class="triage-table"><thead><tr><th>Feature</th><th>Verdict</th><th>Day 14</th><th>Effort</th></tr></thead><tbody>${features || `<tr><td colspan="4">No features were provided. The simulation still evaluates the idea.</td></tr>`}</tbody></table></section><section class="analysis-section"><h3>Data-to-AI flywheel</h3><p class="section-copy">Ground truth enters only when a real outcome verifies the input.</p><div class="flywheel">${stages}</div></section>${changeSection}<section class="analysis-section"><h3>90-day action plan</h3>${roadmap}</section></div>`;
}

export function renderMarket(state) {
  const research = state.result.ventureCritic.marketResearch || { metrics: [], regionalCompetitors: [], globalBenchmarks: [] };
  const metrics = research.metrics.map((metric) => `<tr><td>${esc(metric.segmentName)}</td><td>${esc(metric.valuation2026)}</td><td>${esc(metric.cagrPercent)}</td><td>${esc(metric.projectedValuation)}</td></tr>`).join("");
  const nodes = (state.result.ontology?.knowledgeGraph?.nodes || []).map((node) => `<div class="reality-node"><span>${esc(node.label)}</span><span title="Effort or friction">${node.effortOrFrictionScore}/10</span><span title="Standalone value">${node.standaloneValueScore}/10</span></div>`).join("");
  const vcs = (state.result.ventureCritic.vcPipeline || []).map((vc) => `<tr><td><span class="vc-tier">${vc.tier === "GLOBAL_SPECIALIST" ? "Global specialist" : "PH / SEA"}</span>${esc(vc.firmName)}</td><td>${esc(vc.stageAndCheckSize)}<details class="feature-details"><summary>Fit and pitch angle</summary><p>${esc(vc.whyTheyFitAndPitchAngle)}</p><p>${esc(vc.notableComparablePortfolio)}</p></details></td></tr>`).join("");
  return `<div class="analysis-view"><div class="notice">Market sizes and investor matches are ${state.result.demo ? "illustrative demo values" : "model-generated hypotheses"}. Verify sources, mandates, and current check sizes before using them externally.</div><section class="analysis-section"><h3>Market reality graph</h3><p class="section-copy">Features and incumbent habits scored by friction and standalone value.</p><div class="reality-node"><span>Node</span><span>Friction</span><span>Value</span></div>${nodes}</section><section class="analysis-section"><h3>Market sizing</h3><table class="market-table"><thead><tr><th>Segment</th><th>2026</th><th>CAGR</th><th>Projection</th></tr></thead><tbody>${metrics}</tbody></table><div class="roadmap-item"><strong>Local edge to test</strong><p class="section-copy">${esc(research.unfairLocalEdge)}</p></div></section><section class="analysis-section"><h3>Incumbents and benchmarks</h3><p class="section-copy"><strong>Regional:</strong> ${research.regionalCompetitors.map(esc).join(" · ")}</p><p class="section-copy"><strong>Global:</strong> ${research.globalBenchmarks.map(esc).join(" · ")}</p></section><section class="analysis-section"><h3>Venture pipeline</h3><p class="section-copy">A research shortlist, not a claim of investor interest.</p><table class="market-table"><thead><tr><th>Firm</th><th>Stage and fit</th></tr></thead><tbody>${vcs}</tbody></table></section></div>`;
}
export function renderPersona(persona) {
  const days = ["Day 1", "Day 14", "Day 30"];
  const actions = [persona.round1Day1Action, persona.round2Day14ActionRawIdea, persona.round3Day30Action ?? persona.round3Day30ActionAfterPivot];
  const lifecycle = persona.finalLifecycleStatus === "SAVED_BY_GODS_EYE_PIVOT" ? "Retained after tested change" : titleCase(persona.finalLifecycleStatus);
  return `<div class="persona-overview"><span class="avatar">#${persona.id}</span><div><h3>${esc(persona.name)}</h3><p>${persona.age} · ${esc(persona.occupation)} · ${esc(persona.locationCity)}</p><span class="persona-status">${esc(lifecycle)}</span></div></div><div class="persona-facts"><div class="persona-fact"><strong>Archetype</strong><span>${esc(titleCase(persona.archetype))}</span></div><div class="persona-fact"><strong>Social role</strong><span>${esc(titleCase(persona.socialInfluenceRole))}</span></div><div class="persona-fact"><strong>Budget</strong><span>${esc(persona.monthlyDisposableBudgetLocal)}</span></div><div class="persona-fact"><strong>Incumbent tools</strong><span>${persona.incumbentToolsUsed.map(esc).join(" · ")}</span></div><div class="persona-fact"><strong>Loved</strong><span>${esc(persona.favoriteFeature)}</span></div><div class="persona-fact"><strong>Rejected</strong><span>${esc(persona.mostHatedFeature)}</span></div></div><div class="notice">${esc(persona.specificIdentityContext)}</div><section class="memory-timeline"><h4>Episodic memory</h4>${persona.episodicMemoryLog.map((memory, index) => `<div class="memory-entry"><strong>${days[index]}</strong><div><p>${esc(memory)}</p><p><strong>Action:</strong> ${esc(titleCase(actions[index]))}</p></div></div>`).join("")}</section><div class="persona-actions"><span class="persona-wtp">Day-30 willingness to pay<br><strong>${persona.willingnessToPayMonthlyUsdDay30 ?? persona.willingnessToPayMonthlyUsdAfterPivot ?? 0}</strong> / month${persona.baselineDay30 ? `<small>Before change: ${persona.baselineDay30.willingnessToPay}</small>` : ""}</span><button class="button primary" type="button" data-ask-persona="${persona.id}">Ask the guide about #${persona.id}</button></div>`;
}

export function renderFeatureRows(features, type) {
  const planned = type === "planned";
  return features.map((feature, index) => `<div class="feature-row ${planned ? "planned" : ""}" data-feature-index="${index}"><label class="field"><span>Name</span><input data-field="name" value="${esc(feature.name)}" required></label><label class="field"><span>Description</span><input data-field="description" value="${esc(feature.description)}" required></label>${planned ? `<label class="field"><span>Category</span><select data-field="category">${["AI_VISION", "HARDWARE_WEARABLE", "TELEHEALTH", "MARKETPLACE", "OTHER"].map((category) => `<option value="${category}" ${feature.category === category ? "selected" : ""}>${titleCase(category)}</option>`).join("")}</select></label>` : `<label class="feature-check"><input data-field="isManualInputRequired" type="checkbox" ${feature.isManualInputRequired ? "checked" : ""}>Routine manual input</label>`}<button class="icon-button remove-feature" type="button" data-remove-feature="${index}" data-feature-type="${type}" aria-label="Remove ${esc(feature.name || "feature")}" title="Remove feature">${icon("trash")}</button></div>`).join("");
}
