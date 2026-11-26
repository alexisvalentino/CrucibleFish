import { nextRovingIndex } from "./grid.mjs";
import { loadCharacter, saveCharacter, loadSettings, saveSettings, loadChat, saveChat, getJson, postJson, streamEvents } from "./client.mjs";
import { esc, fmt, icon, avatar, titleCase, renderSimulation, renderCritique, renderMarket, renderPersona, renderFeatureRows } from "./views.mjs";
const $ = (selector) => document.querySelector(selector);
const RUN_FAILURE_KEY = "cruciblefish.runFailureV1";
function readRunFailure() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(RUN_FAILURE_KEY) || "null");
    return saved && typeof saved.message === "string" ? saved : null;
  } catch { return null; }
}
function persistRunFailure(failure) {
  try { sessionStorage.setItem(RUN_FAILURE_KEY, JSON.stringify(failure)); } catch { /* storage may be unavailable */ }
}
function clearRunFailure() {
  state.runFailure = null;
  try { sessionStorage.removeItem(RUN_FAILURE_KEY); } catch { /* storage may be unavailable */ }
}
const state = {
  result: null, demoInput: null, character: loadCharacter(), settings: loadSettings(), serverConfig: {}, history: [],
  view: "simulation", floor: 2, channel: "COMMUNITY_REDDIT_FB_GROUP", socialRound: "ALL", archetypeFilter: "ALL", statusFilter: "ALL",
  selectedPersonaId: null, gridFocusId: 1, messages: [], streaming: false, pivotDraft: "", pivoting: false,
  liveRun: null, runFailure: readRunFailure(), liveSource: null, liveTimer: null, liveStartedAt: 0, draftInput: null, sidebarOpen: false, onboardingStep: 0,
};
let chatRenderQueued = false;
let toastTimer;
const dialogReturnFocus = new Map();
const DISCLAIMER_KEY = "cruciblefish.disclaimerDismissed";
const ONBOARDING_KEY = "cruciblefish.onboardingSeenV1";
function setDisclaimerVisible(visible) {
  $("#disclaimerBar").hidden = !visible;
  document.body.classList.toggle("has-disclaimer", visible);
}
function initDisclaimer() {
  let dismissed = false;
  try { dismissed = localStorage.getItem(DISCLAIMER_KEY) === "1"; } catch { /* storage may be unavailable */ }
  setDisclaimerVisible(!dismissed);
}
function renderOnboardingStep() {
  const steps = [...document.querySelectorAll("#onboardingDialog .onboarding-step")];
  const labels = ["Start here", "Connections", "Your first run", "The workbench", "Optional scenarios", "Your guide"];
  steps.forEach((element, index) => { element.hidden = index !== state.onboardingStep; });
  $("#onboardingStepLabel").textContent = `Step ${state.onboardingStep + 1} of ${steps.length} · ${labels[state.onboardingStep] || ""}`;
  $("#onboardingBack").disabled = state.onboardingStep === 0;
  $("#onboardingNext").textContent = state.onboardingStep === steps.length - 1 ? "Start using CrucibleFish" : "Next";
  if (state.onboardingStep === steps.length - 1) {
    $("#onboardingName").value = state.character.name || "";
    $("#onboardingRole").value = state.character.role || "";
  }
  $("#onboardingDialog .onboarding-body").scrollTop = 0;
}
function markOnboardingSeen() { try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch { /* storage may be unavailable */ } }
function openOnboarding() { state.onboardingStep = 0; renderOnboardingStep(); openDialog("onboardingDialog"); }
function toast(message) { clearTimeout(toastTimer); $("#toast").textContent = message; $("#toast").hidden = false; toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 3600); }
function initialMessages(result) {
  const t = result.telemetry;
  const legacySavedRun = result.baselineMode !== "unchanged" && !result.activePivot;
  const day30 = result.activePivot
    ? `The tested change reaches **${t.day30Active}%** active by Day 30; ${result.comparisonLabel || "the unchanged baseline"} was **${result.baselineTelemetry?.day30Active ?? "—"}%**.`
    : legacySavedRun
      ? `This saved run has **${t.day30Active}%** active by Day 30; it includes the previous version's default change.`
      : `With the idea unchanged, **${t.day30Active}%** are active by Day 30.`;
  return [{ role: "assistant", content: `# ${result.input.startupName} is on the table.\nI walked **100 synthetic customers** through Day 1, Day 14, and Day 30.\n\nDay-14 activity is **${t.day14Active}%**. ${day30}\n\n${t.topChurnTrigger.feature} is the main friction point. Inspect the Day 14 floor or optionally test a future change.${result.demo ? "\n\nThis is an illustrative demo, not measured customer research." : ""}` }];
}
function showError(selector, message) { const element = $(selector); if (!element) return; element.textContent = message || ""; element.hidden = !message; }
function scrollChat() { requestAnimationFrame(() => { const scroll = $("#chatScroll"); scroll.scrollTop = scroll.scrollHeight; }); }
function renderMessages() {
  const idle = !state.messages.length && !state.liveRun;
  $("#chatInner").innerHTML = idle
    ? `<article class="message assistant">${avatar(state.character, "avatar message-avatar")}<div><div class="message-name">${esc(state.character.name)}</div><div class="message-content"><h1 class="welcome-title">Pressure-test an idea before you build it.</h1><p>Give it a name, a customer, and a one-line pitch. The simulator models 100 synthetic customer journeys over 30 days; research notes and future plans are optional.</p><div class="welcome-actions"><button class="button primary" id="welcomeNewBtn" type="button">Start with an idea</button><button class="button secondary" id="welcomeDemoBtn" type="button">Explore the demo</button></div><p class="welcome-note">The results are generated hypotheses, not observed customer research.</p></div></div></article>`
    : state.messages.map((message) => message.role === "user"
      ? `<article class="message user"><div class="message-content">${fmt(message.content)}</div></article>`
      : `<article class="message assistant">${avatar(state.character, "avatar message-avatar")}<div><div class="message-name">${esc(state.character.name)}</div><div class="message-content">${fmt(message.content)}</div></div></article>`).join("");
  $("#typingRow").hidden = !state.streaming || state.messages.at(-1)?.streaming;
  const canChat = Boolean(state.result) && !state.liveRun;
  $("#chatSend").disabled = state.streaming || !canChat;
  $("#chatInput").disabled = !canChat;
  $("#chatInput").placeholder = canChat ? `Ask ${state.character.name} about the simulation…` : "Complete a simulation to ask the guide…";
  scrollChat();
}
function queueMessageRender() { if (chatRenderQueued) return; chatRenderQueued = true; requestAnimationFrame(() => { chatRenderQueued = false; renderMessages(); }); }
function renderCharacter() {
  const summary = `<div class="guide-summary">${avatar(state.character)}<span class="guide-summary-text"><strong>${esc(state.character.name)}</strong><small>${esc(state.character.role)}</small></span><button class="icon-button guide-edit" type="button" data-edit-character aria-label="Edit your guide" title="Edit your guide">${icon("edit")}</button></div>`;
  $("#guideCard").innerHTML = summary;
  $("#chatPerson").innerHTML = `${avatar(state.character)}<span><strong>${esc(state.character.name)}</strong><small class="presence">${esc(state.character.role)}</small></span>`;
  $("#typingAvatar").innerHTML = avatar(state.character, "avatar message-avatar");
  $("#chatInput").placeholder = `Ask ${state.character.name} about the simulation…`;
  $("#characterPreview").innerHTML = avatar(state.character);
}
function renderHeader() {
  if (state.result) {
    $("#runIdentity").innerHTML = `<strong>${esc(state.result.input.startupName)}</strong><span>${state.result.demo ? "Illustrative demo" : "Live synthetic run"}</span>`;
    $("#chatMode").textContent = state.result.demo && !state.settings.apiKey && !state.serverConfig.hasServerOpenAIKey ? "Illustrative demo responses" : `${state.settings.model} · Live guide`;
  } else if (state.liveRun) {
    $("#runIdentity").innerHTML = `<strong>${esc(state.liveRun.startupName || "Your simulation")}</strong><span>Running now</span>`;
    $("#chatMode").textContent = `${state.settings.model} · Running`;
  } else if (state.runFailure) {
    const name = state.runFailure.input?.startupName || "Your simulation";
    $("#runIdentity").innerHTML = `<strong>${esc(name)}</strong><span>${state.runFailure.uncertain ? "Status needs checking" : "Run stopped"}</span>`;
    $("#chatMode").textContent = "Run needs attention";
  } else {
    $("#runIdentity").innerHTML = `<strong>No simulation loaded</strong><span>Start one or explore the demo</span>`;
    $("#chatMode").textContent = "Load a simulation to chat";
  }
  $("#activeModel").textContent = state.settings.model;
  const suggestions = state.result ? ["Why do customers churn?", "What surprised you?", "What change could I test?"] : [];
  $("#chatSuggestions").innerHTML = suggestions.map((question) => `<button class="suggestion" type="button" data-question="${esc(question)}">${esc(question)}</button>`).join("");
}
function renderHistory() {
  $("#demoHistoryBtn").classList.toggle("active", state.result?.id === "demo-pawsmatch");
  $("#historyList").innerHTML = state.history.map((run) => `<button class="history-item ${state.result?.id === run.id ? "active" : ""}" type="button" data-run="${esc(run.id)}"><span class="history-dot"></span><span><strong>${esc(run.startupName)}</strong><small>${run.status === "running" ? "Running now" : run.status === "error" ? "Run failed · open to recover" : `${run.telemetry?.day30Active ?? "—"}% Day-30 active`}</small></span></button>`).join("");
}
function startProgressTimer() {
  clearInterval(state.liveTimer);
  state.liveStartedAt = Date.now();
  state.liveTimer = setInterval(() => {
    const element = document.getElementById("progressTimer");
    if (!element) return;
    const seconds = Math.floor((Date.now() - state.liveStartedAt) / 1000);
    element.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }, 1000);
}
function stopProgressTimer() { clearInterval(state.liveTimer); state.liveTimer = null; }
function renderProgress() {
  const box = $("#runProgress");
  box.classList.toggle("failed", Boolean(state.runFailure));
  if (state.runFailure) {
    const failure = state.runFailure;
    const actions = [
      failure.uncertain && failure.id ? `<button class="button primary" type="button" data-check-run="${esc(failure.id)}">Check run status</button>` : "",
      failure.input && !failure.uncertain ? `<button class="button primary" type="button" data-retry-run>Retry run</button>` : "",
      failure.input ? `<button class="button secondary" type="button" data-edit-run>Review brief</button>` : "",
      `<button class="button secondary" type="button" data-new-run>Start a new brief</button>`,
    ].filter(Boolean).join("");
    box.hidden = false;
    box.innerHTML = `<div class="run-failure" role="alert"><div class="run-failure-heading"><span class="progress-beacon failed"><i></i></span><div><strong>${failure.uncertain ? "Run status is unclear" : "Run stopped before results were ready"}</strong><p>${esc(failure.message)}</p></div></div><p class="run-failure-note">${failure.input ? "Your brief is kept in this tab for retry or review." : "This run was opened from history; its original brief is not available here."}</p><div class="run-failure-actions">${actions}</div></div>`;
    return;
  }
  if (!state.liveRun) { box.hidden = true; return; }
  const events = state.liveRun.events;
  const last = events.at(-1) || { label: "Starting the pipeline", completed: 0, total: 7 };
  const total = Math.max(3, last.total || 7);
  const batchCount = Math.max(1, total - 2);
  const hasOntology = events.some((item) => item.phase === "ontology");
  const hasCritic = events.some((item) => item.phase === "critic");
  const doneBatches = events.filter((item) => item.phase === "swarm").length;
  const hasAggregate = events.some((item) => item.phase === "aggregate");
  const isComplete = events.some((item) => item.phase === "complete");
  const isError = events.some((item) => item.phase === "error");
  const stages = [
    { label: "Market reality graph", done: hasOntology, active: !hasOntology && !isError },
    { label: "Venture critique", done: hasCritic, active: hasOntology && !hasCritic && !isError },
    ...Array.from({ length: batchCount }, (_, index) => ({ label: `Customer batch ${index + 1}`, done: index < doneBatches, active: index === doneBatches && hasCritic && !isError })),
    { label: "Retention & GMV", done: hasAggregate || isComplete, active: doneBatches >= batchCount && !hasAggregate && !isError },
  ];
  const seconds = Math.floor((Date.now() - (state.liveStartedAt || Date.now())) / 1000);
  const timer = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const percent = isComplete ? 100 : Math.max(3, ((last.completed || 0) / total) * 100);
  const recent = events.slice(-3).reverse().map((item) => `<li><time>${esc(new Date(item.at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }))}</time>${esc(item.label || item.error || item.phase)}</li>`).join("");
  box.hidden = false;
  box.innerHTML = `<div class="progress-head"><span class="progress-beacon ${isError ? "failed" : ""}"><i></i></span><div class="progress-titles"><strong>${isError ? "Run stopped" : isComplete ? "Run finished" : "Building your simulation"}</strong><span>${esc(last.label || "Simulation in progress")}</span></div><span class="progress-count">${isComplete ? total : last.completed || 0} / ${total}</span><span class="progress-timer" id="progressTimer">${timer}</span></div><div class="progress-track"><i style="width:${percent}%"></i></div><div class="progress-stages">${stages.map((stage) => `<span class="progress-stage ${stage.done ? "done" : stage.active ? "active" : "pending"}"><i></i>${esc(stage.label)}</span>`).join("")}</div>${isError ? `<div class="progress-error">${esc(last.error || "The run failed.")}</div>` : `<ul class="progress-events">${recent}</ul>`}`;
}
function workbenchFocusSelector() {
  const active = document.activeElement;
  if (!$("#workbenchContent").contains(active)) return "";
  if (active.id) return `#${active.id}`;
  for (const attribute of ["data-floor", "data-channel", "data-persona"]) if (active.hasAttribute(attribute)) return `[${attribute}="${active.getAttribute(attribute)}"]`;
  return "";
}
function renderWorkbench({ resetScroll = false, focusTitle = false } = {}) {
  const focusSelector = workbenchFocusSelector();
  $("#exportReportBtn").hidden = !state.result || Boolean(state.liveRun || state.pivoting);
  if (!state.result) {
    $("#workbenchContent").innerHTML = state.liveRun
      ? `<div class="empty-state"><strong>Building your simulation</strong><p>The market graph, critique, and customer batches are running. Results will appear here when the run completes.</p></div>`
      : `<div class="empty-state start-state"><strong>Nothing to show yet.</strong><p>Run a simulation from your idea and target customer, or load the clearly illustrative PawsMatch case study.</p><div class="start-actions"><button class="button primary" id="emptyNewBtn" type="button">New simulation</button><button class="button secondary" id="emptyDemoBtn" type="button">Explore demo</button></div><p class="start-note">Optional interview notes or other context can go in the startup brief.</p></div>`;
    renderProgress();
    return;
  }
  const titles = { simulation: ["Simulation", "Three floors. One unchanged idea; optional changes to test."], critique: ["Venture critique", "Scope, retention, and the data-to-AI flywheel."], market: ["Market & capital", "Reality graph, market hypotheses, and investor research."] };
  $("#viewTitle").textContent = titles[state.view][0]; $("#viewSubtitle").textContent = titles[state.view][1];
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  $("#workbenchContent").innerHTML = state.view === "simulation" ? renderSimulation(state) : state.view === "critique" ? renderCritique(state) : renderMarket(state);
  if (resetScroll) $("#workbenchContent").scrollTop = 0;
  if (focusSelector) $("#workbenchContent").querySelector(focusSelector)?.focus({ preventScroll: true });
  if (focusTitle) $("#viewTitle").focus({ preventScroll: true });
  renderProgress();
}
function renderAll(options = {}) { renderCharacter(); renderHeader(); renderHistory(); renderMessages(); renderWorkbench(options); renderIntervention(); }
function openDialog(id) { dialogReturnFocus.set(id, document.activeElement); closeSidebar(); const dialog = $(`#${id}`); if (!dialog.open) dialog.showModal(); }
function closeDialog(id) { const dialog = $(`#${id}`); if (dialog?.open) dialog.close(); }
function setMobilePane(pane) { $(".app-shell").dataset.mobilePane = pane; document.querySelectorAll("[data-mobile-pane]").forEach((button) => button.classList.toggle("active", button.dataset.mobilePane === pane)); closeSidebar(); }
function syncSidebarAccessibility() {
  const closed = window.matchMedia("(max-width: 900px)").matches && !state.sidebarOpen;
  $("#sidebar").inert = closed;
  if (closed) $("#sidebar").setAttribute("aria-hidden", "true"); else $("#sidebar").removeAttribute("aria-hidden");
  $("#menuBtn").setAttribute("aria-expanded", String(state.sidebarOpen));
}
function closeSidebar(restoreFocus = false) {
  const wasOpen = state.sidebarOpen;
  state.sidebarOpen = false; $("#sidebar").classList.remove("open"); $("#sidebarScrim").hidden = true;
  syncSidebarAccessibility();
  if (wasOpen && restoreFocus) $("#menuBtn").focus({ preventScroll: true });
}
const STANDARD_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"];
function openSettings() {
  const settings = state.settings;
  $("#openaiKey").value = settings.apiKey || "";
  $("#baseUrl").value = settings.baseUrl || ""; $("#fastModel").value = settings.fastModel || "";
  $("#rememberKeys").checked = Boolean(settings.rememberKeys);
  $("#modelSelect").value = STANDARD_MODELS.includes(settings.model) ? settings.model : "custom";
  $("#customModel").value = STANDARD_MODELS.includes(settings.model) ? "" : settings.model;
  $("#customModelGroup").hidden = $("#modelSelect").value !== "custom";
  showError("#settingsError", ""); $("#connectionStatus").textContent = state.serverConfig.hasServerOpenAIKey ? "A server OpenAI key is also available." : "";
  openDialog("settingsDialog");
}
function readSettingsForm() {
  const model = $("#modelSelect").value === "custom" ? $("#customModel").value.trim() : $("#modelSelect").value;
  if (!model) throw new Error("Enter the custom model name.");
  return { apiKey: $("#openaiKey").value.trim(), model, fastModel: $("#fastModel").value.trim(), baseUrl: $("#baseUrl").value.trim(), rememberKeys: $("#rememberKeys").checked };
}
function openCharacter() {
  $("#characterName").value = state.character.name; $("#characterRole").value = state.character.role;
  $("#characterPersonality").value = state.character.personality;
  $("#characterPreview").innerHTML = avatar(state.character); showError("#characterError", "");
  openDialog("characterDialog");
}
function readCharacterForm() {
  const character = { name: $("#characterName").value.trim(), role: $("#characterRole").value.trim(), personality: $("#characterPersonality").value.trim() };
  if (Object.values(character).some((value) => !value)) throw new Error("Complete the guide’s name, role, and personality.");
  return character;
}
async function testConnection() {
  const button = $("#testConnectionBtn"); button.disabled = true; $("#connectionStatus").textContent = "Checking the models endpoint…"; showError("#settingsError", "");
  try {
    const settings = readSettingsForm();
    const result = await postJson("/api/settings/test", { settings });
    $("#connectionStatus").textContent = `Connected${result.models.length ? ` · ${result.models.length} models available` : " · no model list returned"}.`;
  } catch (error) { showError("#settingsError", error.message); $("#connectionStatus").textContent = "Connection failed."; }
  finally { button.disabled = false; }
}
function blankInput() {
  return { startupName: "", websiteUrl: "", targetCustomer: "", oneLinePitch: "", businessModel: "", targetGeography: "", currentTraction: "", currentFeatures: [], plannedRoadmapFeatures: [], unfairAdvantages: "", proposedPricing: "", seedMaterial: "" };
}
function renderFeatureEditors() {
  $("#currentFeatures").innerHTML = state.draftInput.currentFeatures.length ? renderFeatureRows(state.draftInput.currentFeatures, "current") : `<p class="feature-empty">No current features added. You can still simulate the idea.</p>`;
  $("#plannedFeatures").innerHTML = state.draftInput.plannedRoadmapFeatures.length ? renderFeatureRows(state.draftInput.plannedRoadmapFeatures, "planned") : `<p class="feature-empty">No future plan added. The baseline keeps the idea unchanged.</p>`;
}
function hasOptionalContext(input) {
  return ["websiteUrl", "businessModel", "targetGeography", "currentTraction", "unfairAdvantages", "proposedPricing", "seedMaterial"].some((key) => Boolean(input[key]?.trim()))
    || Boolean(input.currentFeatures?.length || input.plannedRoadmapFeatures?.length);
}
function fillIntake(input) {
  state.draftInput = structuredClone(input);
  for (const key of ["startupName", "websiteUrl", "targetCustomer", "oneLinePitch", "businessModel", "targetGeography", "currentTraction", "unfairAdvantages", "proposedPricing", "seedMaterial"]) $(`#${key}`).value = input[key] || "";
  state.draftInput.currentFeatures ||= [];
  state.draftInput.plannedRoadmapFeatures ||= [];
  $("#optionalContext").open = hasOptionalContext(state.draftInput);
  renderFeatureEditors(); showError("#simulationError", "");
}
function captureFeatureEditors() {
  for (const [container, key, type] of [["#currentFeatures", "currentFeatures", "current"], ["#plannedFeatures", "plannedRoadmapFeatures", "planned"]]) {
    state.draftInput[key] = [...$(container).querySelectorAll(".feature-row")].map((row, index) => {
      const previous = state.draftInput[key][index] || {};
      const feature = { ...previous, id: previous.id || `${type}-${Date.now()}-${index}`, name: row.querySelector('[data-field="name"]').value.trim(), description: row.querySelector('[data-field="description"]').value.trim() };
      if (type === "current") feature.isManualInputRequired = row.querySelector('[data-field="isManualInputRequired"]').checked;
      else feature.category = row.querySelector('[data-field="category"]').value;
      return feature;
    });
  }
}
function collectIntake() {
  captureFeatureEditors();
  const input = structuredClone(state.draftInput);
  for (const key of ["startupName", "websiteUrl", "targetCustomer", "oneLinePitch", "businessModel", "targetGeography", "currentTraction", "unfairAdvantages", "proposedPricing", "seedMaterial"]) input[key] = $(`#${key}`).value.trim();
  return input;
}
async function refreshRuns() { try { state.history = (await getJson("/api/runs")).runs; renderHistory(); } catch { /* the current run remains usable */ } }
async function finishLiveRun(id) {
  const response = await getJson(`/api/runs/${id}`);
  if (!response.result) { setTimeout(() => finishLiveRun(id), 150); return; }
  state.result = response.result; state.liveRun = null; clearRunFailure(); stopProgressTimer(); state.liveSource?.close(); state.liveSource = null;
  state.floor = 2; state.view = "simulation"; state.selectedPersonaId = null;
  const runningMessage = state.messages.find((message) => /building the baseline with the idea unchanged/i.test(message.content || ""));
  state.messages = runningMessage ? [runningMessage] : [];
  state.messages.push({ role: "assistant", content: `# ${response.result.input.startupName} is ready.\nAll **100 customers** completed the three floors with the idea unchanged. Day-14 activity is **${response.result.telemetry.day14Active}%**; Day-30 activity is **${response.result.telemetry.day30Active}%**.\n\n${response.result.telemetry.topChurnTrigger.feature} is the leading friction point. Inspect the customer field or optionally test a future change.` });
  saveChat(state.result.id, state.messages); renderAll({ resetScroll: true }); setMobilePane("workbench"); refreshRuns();
}
function setRunFailure(message, { id = state.liveRun?.id || null, input = state.liveRun?.input || null, uncertain = false } = {}) {
  const startupName = input?.startupName || state.liveRun?.startupName || "Your simulation";
  state.liveSource?.close(); state.liveSource = null; stopProgressTimer();
  state.result = null; state.liveRun = null;
  state.runFailure = { id, input: input ? structuredClone(input) : null, message, uncertain };
  persistRunFailure(state.runFailure);
  state.messages = [{ role: "assistant", content: `# ${startupName} didn’t finish.\n\n${message}\n\n${input ? "Your brief is saved in this tab so you can retry or review it." : "Start a new brief to try another run."}` }];
  if (id) saveChat(id, state.messages);
  renderAll();
  if (window.matchMedia("(max-width: 900px)").matches) setMobilePane("workbench");
  refreshRuns();
}
function subscribeLiveRun(id) {
  state.liveSource?.close();
  const source = new EventSource(`/api/runs/${id}/events`); state.liveSource = source;
  source.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.phase === "error") { setRunFailure(data.error || "The run could not be completed. Check your AI connection and try again."); return; }
    state.liveRun.events.push(data); renderProgress();
    if (data.phase === "complete") finishLiveRun(id);
  };
  source.onerror = () => {
    if (!state.liveRun) return;
    source.close();
    getJson(`/api/runs/${id}`).then((run) => {
      if (run.result) finishLiveRun(id);
      else if (run.status === "error") setRunFailure(run.events.at(-1)?.error || "The run failed before results were ready.");
      else if (run.status === "running") subscribeLiveRun(id);
      else setRunFailure("The live connection ended and the run status could not be confirmed. Check the status before starting another run.", { uncertain: true });
    }).catch(() => setRunFailure("We lost contact with the local run service, so its status is unknown. Check run history before starting another run.", { uncertain: true }));
  };
}
function setInterventionOpen(open) {
  $("#interventionPanel").hidden = !open;
  $("#interventionToggle").setAttribute("aria-expanded", String(open));
  if (open) { renderIntervention(); $("#pivotInput").focus({ preventScroll: true }); }
}
function renderIntervention() {
  const result = state.result;
  const ready = Boolean(result) && !state.liveRun;
  const legacySavedRun = result && result.baselineMode !== "unchanged" && !result.activePivot;
  const previousChange = result?.pivotHistory?.at(-1)?.pivot;
  $("#interventionStatus").textContent = !result ? "Run a baseline first" : state.pivoting ? "Testing a change on Day 30…" : result.activePivot ? `Compared with the ${result.comparisonLabel || "unchanged baseline"}` : legacySavedRun ? "Optional. Scenarios start from this saved Day-30 result." : "Optional. The baseline is unchanged.";
  const current = result?.activePivot;
  const suggested = result?.ventureCritic?.recommendedGodsEyePivotSummary;
  $("#interventionCurrent").innerHTML = current
    ? `<span class="intervention-label">Current tested change</span><p>${esc(current)}</p>`
    : legacySavedRun && suggested ? `<span class="intervention-label">Change included in this older saved run</span><p>${esc(previousChange || suggested)}</p>`
      : suggested ? `<span class="intervention-label">Optional suggestion · not applied</span><p>${esc(suggested)}</p>` : "";
  const history = result?.pivotHistory || [];
  $("#interventionHistory").innerHTML = history.length ? `<span class="intervention-label">Recent tested changes</span>${history.slice(-4).reverse().map((item) => `<div class="intervention-item"><time>${esc(new Date(item.at).toLocaleString())}</time><p>${esc(item.pivot)}</p></div>`).join("")}` : "";
  const input = $("#pivotInput");
  const submit = $("#pivotForm button[type=submit]");
  input.disabled = !ready || state.pivoting;
  input.value = state.pivotDraft || "";
  if (submit) { submit.disabled = !ready || state.pivoting; submit.textContent = state.pivoting ? "Testing…" : "Test this change"; }
  $("#interventionPanel").classList.toggle("unavailable", !ready);
}
async function discoverFromWebsite() {
  const button = $("#discoverBtn"); const original = button.textContent;
  const raw = $("#websiteUrl").value.trim();
  let parsed;
  try { parsed = new URL(raw); } catch { toast("Enter a valid website URL, including https://."); return; }
  if (!["http:", "https:"].includes(parsed.protocol)) { toast("Only http and https websites can be read."); return; }
  if (["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(parsed.hostname)) { toast("Local or internal addresses cannot be read."); return; }
  const started = Date.now();
  const status = $("#discoverStatus");
  button.disabled = true;
  button.innerHTML = `<span class="btn-spinner"></span>Reading the site…`;
  status.hidden = false;
  try {
    const result = await postJson("/api/intake/discover", { name: $("#startupName").value, websiteUrl: raw });
    status.innerHTML = `<i></i>Filling the fields…`;
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 450 - (Date.now() - started))));
    let filled = 0;
    for (const [key, value] of Object.entries(result.fields || {})) {
      const element = document.getElementById(key);
      if (element && !element.value.trim()) { element.value = value; filled += 1; }
    }
    toast(filled ? `Filled ${filled} field${filled === 1 ? "" : "s"} from the site${result.usedAI ? " with AI help" : ""}.` : (result.notes || "Nothing usable found — fill the form manually."));
  } catch (error) { toast(error.message); }
  finally {
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 450 - (Date.now() - started))));
    button.disabled = false; button.textContent = original; status.hidden = true;
    status.innerHTML = `<i></i>Reading the website…`;
  }
}
async function startSimulation({ retryInput = null } = {}) {
  const button = $("#startRunBtn"); button.disabled = true; showError("#simulationError", "");
  try {
    const input = retryInput ? structuredClone(retryInput) : collectIntake();
    const started = await postJson("/api/simulate", { input, character: state.character, settings: state.settings });
    closeDialog("simulationDialog");
    state.result = null; clearRunFailure(); state.view = "simulation"; state.floor = 2; state.selectedPersonaId = null;
    state.liveRun = { id: started.id, events: [], startupName: input.startupName, input: structuredClone(input) };
    state.messages = [{ role: "assistant", content: `# ${input.startupName}\nI’m building the baseline with the idea unchanged. You can optionally test a future change after the customers are ready.` }];
    startProgressTimer();
    saveChat(started.id, state.messages); renderAll(); renderProgress(); subscribeLiveRun(started.id); setMobilePane("workbench");
  } catch (error) {
    if (retryInput) { fillIntake(retryInput); openDialog("simulationDialog"); }
    showError("#simulationError", error.message);
    if (error.status === 503) toast("Add your OpenAI key in AI connections, then run again.");
  }
  finally { button.disabled = false; }
}
function useResult(result, restoreChat = true) {
  state.result = result; clearRunFailure(); state.floor = 2; state.view = "simulation"; state.selectedPersonaId = null; state.pivotDraft = "";
  state.messages = restoreChat ? loadChat(result.id) : [];
  if (!state.messages.length) state.messages = initialMessages(result);
  saveChat(result.id, state.messages); renderAll({ resetScroll: true });
}
async function loadDemo() {
  state.liveSource?.close(); state.liveSource = null; state.liveRun = null; stopProgressTimer();
  const result = await getJson("/api/demo?reset=1"); useResult(result, false); renderProgress(); toast("PawsMatch demo loaded.");
}
async function loadRun(id) {
  const previousFailure = state.runFailure?.id === id ? state.runFailure : null;
  let response;
  try { response = await getJson(`/api/runs/${id}`); }
  catch (error) {
    if (error.status === 404 && previousFailure) {
      setRunFailure("This run is no longer active or available, so retrying the saved brief will not create a duplicate.", { input: previousFailure.input, uncertain: false });
      setMobilePane("workbench"); return;
    }
    throw error;
  }
  if (response.status === "running") {
    const startupName = state.history.find((run) => run.id === id)?.startupName || "Your simulation";
    state.result = null; clearRunFailure(); state.view = "simulation"; state.floor = 2; state.selectedPersonaId = null;
    state.liveRun = { id, events: response.events || [], startupName, input: previousFailure?.input || null };
    state.messages = loadChat(id);
    if (!state.messages.length) state.messages = [{ role: "assistant", content: `# ${startupName}\nI’m building the baseline with the idea unchanged. You can optionally test a future change after the customers are ready.` }];
    startProgressTimer(); renderAll(); renderProgress(); subscribeLiveRun(id); setMobilePane("workbench"); return;
  }
  if (response.status === "error") { setRunFailure(response.events?.at(-1)?.error || "The run failed before results were ready.", { id, input: previousFailure?.input || null }); setMobilePane("workbench"); return; }
  if (!response.result) throw new Error("This run has no completed result yet.");
  useResult(response.result); setMobilePane("workbench"); closeSidebar();
}
async function retryFailedRun() {
  const failure = state.runFailure;
  if (!failure?.input || failure.uncertain) return;
  await startSimulation({ retryInput: failure.input });
}
function reviewFailedBrief() {
  const input = state.runFailure?.input;
  if (!input) return;
  fillIntake(input); openDialog("simulationDialog");
}
function openPersona(id) {
  const persona = state.result.personas.find((item) => item.id === Number(id));
  if (!persona) return;
  state.selectedPersonaId = persona.id;
  state.gridFocusId = persona.id;
  $("#personaTitle").textContent = `Customer #${persona.id} · ${persona.name}`;
  $("#personaBody").innerHTML = renderPersona(persona);
  openDialog("personaDialog"); renderWorkbench();
}
async function runPivot() {
  const input = $("#pivotInput");
  state.pivotDraft = input.value.trim();
  if (state.pivotDraft.length < 8) { showError("#pivotError", "Describe the change in at least 8 characters."); return; }
  state.pivoting = true; renderIntervention();
  try {
    const result = await postJson(`/api/runs/${state.result.id}/pivot`, { pivot: state.pivotDraft, settings: state.settings });
    state.result = result; state.floor = 3; state.pivotDraft = "";
    const baseline = result.baselineTelemetry;
    state.messages.push({ role: "assistant", content: `# Optional change tested\nThe unchanged idea has **${baseline?.day30Active ?? "—"}%** Day-30 activity. With this change, Day-30 activity is **${result.telemetry.day30Active}%** and **${result.telemetry.pivotedPaying}** customers would pay. Day 1 and Day 14 stay the same.\n\n${result.demo && !state.settings.apiKey && !state.serverConfig.hasServerOpenAIKey ? "This is a deterministic demo scenario, not an OpenAI run." : "The same 100 synthetic profiles were re-evaluated; these results are still hypotheses."}` });
    saveChat(result.id, state.messages); toast("Change tested against the unchanged baseline.");
  } catch (error) {
    state.messages.push({ role: "assistant", content: `I couldn’t test that change: ${error.message}` });
    toast("Change test failed. Your previous results are unchanged.");
  } finally { state.pivoting = false; renderAll(); }
}
async function sendChat(text) {
  const message = String(text || "").trim();
  if (state.liveRun) { toast("Wait for the run to finish before asking the guide."); return; }
  if (!message || state.streaming || !state.result) return;
  if (!state.result.demo && !state.settings.apiKey && !state.serverConfig.hasServerOpenAIKey) { showError("#chatError", "Add an OpenAI API key in AI connections to chat about this live run."); openSettings(); return; }
  showError("#chatError", ""); state.messages.push({ role: "user", content: message }); state.streaming = true;
  $("#chatInput").value = ""; $("#chatInput").style.height = "auto"; renderMessages();
  let answer = "";
  try {
    const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: state.result.id, character: state.character, messages: state.messages, selectedPersonaId: state.selectedPersonaId, settings: state.settings }) });
    await streamEvents(response, {
      onText: (delta) => { if (!answer) state.messages.push({ role: "assistant", content: "", streaming: true }); answer += delta; state.messages.at(-1).content = answer; queueMessageRender(); },
      onEvent: (data) => { if (data.error) throw new Error(data.error); },
    });
    if (!answer.trim()) throw new Error("The guide returned an empty response. Try again.");
    delete state.messages.at(-1).streaming;
  } catch (error) {
    if (answer) delete state.messages.at(-1).streaming;
    showError("#chatError", error.message);
  } finally { state.streaming = false; saveChat(state.result.id, state.messages); renderMessages(); }
}
function autoGrow() { const input = $("#chatInput"); input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight, 140)}px`; }
$("#onboardingBtn").addEventListener("click", openOnboarding);
$("#onboardingBack").addEventListener("click", () => { if (state.onboardingStep > 0) { state.onboardingStep -= 1; renderOnboardingStep(); } });
$("#onboardingNext").addEventListener("click", () => {
  const count = document.querySelectorAll("#onboardingDialog .onboarding-step").length;
  if (state.onboardingStep < count - 1) { state.onboardingStep += 1; renderOnboardingStep(); }
  else {
    const name = $("#onboardingName").value.trim();
    const role = $("#onboardingRole").value.trim();
    if (name) {
      state.character = { ...state.character, name, role: role || state.character.role };
      saveCharacter(state.character); renderCharacter(); renderHeader(); renderMessages();
    }
    markOnboardingSeen(); closeDialog("onboardingDialog");
  }
});
$("#onboardingDialog").addEventListener("close", markOnboardingSeen);
$("#disclaimerDetailsBtn").addEventListener("click", () => openDialog("limitsDialog"));
$("#composerLimitsBtn").addEventListener("click", () => openDialog("limitsDialog"));
$("#disclaimerCloseBtn").addEventListener("click", () => {
  setDisclaimerVisible(false);
  try { localStorage.setItem(DISCLAIMER_KEY, "1"); } catch { /* storage may be unavailable */ }
  $("#newSimulationBtn").focus({ preventScroll: true });
});
$("#settingsBtn").addEventListener("click", openSettings);
$("#testConnectionBtn").addEventListener("click", testConnection);
$("#interventionToggle").addEventListener("click", () => setInterventionOpen($("#interventionPanel").hidden));
$("#interventionClose").addEventListener("click", () => setInterventionOpen(false));
$("#newSimulationBtn").addEventListener("click", () => { fillIntake(blankInput()); openDialog("simulationDialog"); });
$("#loadPresetBtn").addEventListener("click", () => fillIntake(state.demoInput || state.result.input));
$("#discoverBtn").addEventListener("click", discoverFromWebsite);
$("#demoTopBtn").addEventListener("click", () => loadDemo().catch((error) => toast(error.message)));
$("#demoHistoryBtn").addEventListener("click", () => loadDemo().catch((error) => toast(error.message)));
$("#clearChatBtn").addEventListener("click", () => { state.messages = initialMessages(state.result); state.selectedPersonaId = null; saveChat(state.result.id, state.messages); renderAll(); });
$("#menuBtn").addEventListener("click", () => {
  if (state.sidebarOpen) { closeSidebar(true); return; }
  state.sidebarOpen = true; $("#sidebar").classList.add("open"); $("#sidebarScrim").hidden = false; syncSidebarAccessibility();
  $("#newSimulationBtn").focus({ preventScroll: true });
});
$("#sidebarScrim").addEventListener("click", () => closeSidebar(true));
$("#chatInput").addEventListener("input", autoGrow);
$("#chatInput").addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); $("#chatForm").requestSubmit(); } });
$("#modelSelect").addEventListener("change", () => { $("#customModelGroup").hidden = $("#modelSelect").value !== "custom"; });
document.addEventListener("keydown", (event) => { if (event.key !== "Escape") return; if ($("#onboardingDialog").open) markOnboardingSeen(); if (state.sidebarOpen) closeSidebar(true); });
document.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.target.id === "chatForm") await sendChat($("#chatInput").value);
  if (event.target.id === "pivotForm") await runPivot();
  if (event.target.id === "simulationForm") await startSimulation();
  if (event.target.id === "settingsForm") {
    try { state.settings = readSettingsForm(); saveSettings(state.settings); closeDialog("settingsDialog"); renderHeader(); toast("AI connections saved."); }
    catch (error) { showError("#settingsError", error.message); }
  }
  if (event.target.id === "characterForm") {
    try { state.character = readCharacterForm(); saveCharacter(state.character); closeDialog("characterDialog"); renderAll(); toast(`${state.character.name} is now your guide.`); }
    catch (error) { showError("#characterError", error.message); }
  }
});
document.addEventListener("invalid", (event) => {
  const optionalContext = event.target.closest?.("#optionalContext");
  if (optionalContext) optionalContext.open = true;
}, true);
document.addEventListener("change", async (event) => {
  if (event.target.id === "archetypeFilter") { state.archetypeFilter = event.target.value; renderWorkbench(); }
  if (event.target.id === "statusFilter") { state.statusFilter = event.target.value; renderWorkbench(); }
  if (event.target.id === "socialRound") { state.socialRound = event.target.value; renderWorkbench(); }
});
document.addEventListener("input", (event) => { if (event.target.id === "pivotInput") state.pivotDraft = event.target.value; });
document.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  try {
    if (target.dataset.close) { if (target.dataset.close === "onboardingDialog") markOnboardingSeen(); closeDialog(target.dataset.close); return; }
    if (target.id === "exportReportBtn") {
      if (!state.result) return;
      window.open(`/report.html?run=${encodeURIComponent(state.result.id)}`, "_blank", "noopener");
      return;
    }
    if (target.dataset.mobilePane) { setMobilePane(target.dataset.mobilePane); return; }
    if (target.id === "welcomeNewBtn") { fillIntake(blankInput()); openDialog("simulationDialog"); return; }
    if (target.id === "welcomeDemoBtn") { await loadDemo(); return; }
    if (target.id === "emptyNewBtn") { fillIntake(blankInput()); openDialog("simulationDialog"); return; }
    if (target.id === "emptyDemoBtn") { await loadDemo(); return; }
    if (target.hasAttribute("data-check-run")) { await loadRun(target.dataset.checkRun); return; }
    if (target.hasAttribute("data-retry-run")) { await retryFailedRun(); return; }
    if (target.hasAttribute("data-edit-run")) { reviewFailedBrief(); return; }
    if (target.hasAttribute("data-new-run")) { fillIntake(blankInput()); openDialog("simulationDialog"); return; }
    if (target.dataset.view) { state.view = target.dataset.view; renderWorkbench({ resetScroll: true, focusTitle: true }); setMobilePane("workbench"); return; }
    if (target.dataset.floor) { state.floor = Number(target.dataset.floor); renderWorkbench(); return; }
    if (target.dataset.channel) { state.channel = target.dataset.channel; renderWorkbench(); return; }
    if (target.dataset.explainThread) { setMobilePane("chat"); await sendChat(`Why did this spread in the simulation: "${target.dataset.explainThread}"?`); return; }
    if (target.dataset.question) { await sendChat(target.dataset.question); return; }
    if (target.dataset.run) { await loadRun(target.dataset.run); return; }
    if (target.hasAttribute("data-edit-character")) { openCharacter(); return; }
    if (target.dataset.askPersona) { const id = Number(target.dataset.askPersona); dialogReturnFocus.set("personaDialog", $("#chatInput")); closeDialog("personaDialog"); setMobilePane("chat"); await sendChat(`What should I learn from customer #${id}?`); return; }
    if (target.dataset.persona) { openPersona(target.dataset.persona); return; }
    if (target.id === "addCurrentFeature" || target.id === "addPlannedFeature") {
      captureFeatureEditors();
      const planned = target.id === "addPlannedFeature"; const key = planned ? "plannedRoadmapFeatures" : "currentFeatures";
      state.draftInput[key].push(planned ? { id: `planned-${Date.now()}`, name: "", description: "", category: "OTHER" } : { id: `current-${Date.now()}`, name: "", description: "", isManualInputRequired: false });
      $("#optionalContext").open = true; renderFeatureEditors();
      $(`#${planned ? "plannedFeatures" : "currentFeatures"} .feature-row:last-child [data-field="name"]`)?.focus();
      return;
    }
    if (target.dataset.removeFeature !== undefined) {
      captureFeatureEditors();
      const key = target.dataset.featureType === "planned" ? "plannedRoadmapFeatures" : "currentFeatures";
      state.draftInput[key].splice(Number(target.dataset.removeFeature), 1); renderFeatureEditors();
    }
  } catch (error) { toast(error.message); }
});
document.addEventListener("focusin", (event) => {
  if (!event.target.classList?.contains("agent-node")) return;
  state.gridFocusId = Number(event.target.dataset.persona);
  document.querySelectorAll(".agent-node").forEach((node) => { node.tabIndex = node === event.target ? 0 : -1; });
});
document.addEventListener("keydown", (event) => {
  if (!event.target.classList?.contains("agent-node")) return;
  const keys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  const nodes = [...document.querySelectorAll(".agent-node")];
  const columns = getComputedStyle(event.target.parentElement).gridTemplateColumns.split(" ").filter(Boolean).length;
  const next = nextRovingIndex(nodes.indexOf(event.target), event.key, nodes.length, columns);
  if (next >= 0 && nodes[next]) { state.gridFocusId = Number(nodes[next].dataset.persona); nodes.forEach((node, index) => { node.tabIndex = index === next ? 0 : -1; }); nodes[next].focus(); }
});
document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("close", () => {
  const previous = dialogReturnFocus.get(dialog.id);
  const fallback = dialog.id === "personaDialog" ? document.querySelector(`[data-persona="${state.gridFocusId}"]`) : dialog.id === "settingsDialog" ? $("#settingsBtn") : dialog.id === "characterDialog" ? document.querySelector("[data-edit-character]") : dialog.id === "simulationDialog" ? $("#viewTitle") : $("#newSimulationBtn");
  dialogReturnFocus.delete(dialog.id);
  requestAnimationFrame(() => {
    const target = previous?.isConnected && !previous.closest("[inert]") ? previous : fallback;
    if (target?.isConnected && !target.closest("[inert]")) target.focus({ preventScroll: true });
  });
}));
window.addEventListener("resize", syncSidebarAccessibility);
initDisclaimer();
syncSidebarAccessibility();
async function boot() {
  try {
    const [config, demo, runs] = await Promise.all([getJson("/api/config"), getJson("/api/demo"), getJson("/api/runs")]);
    state.serverConfig = config; state.demoInput = structuredClone(demo.input); state.history = runs.runs;
    state.result = null; state.messages = state.runFailure ? [{ role: "assistant", content: `# ${state.runFailure.input?.startupName || "Your simulation"} didn’t finish.\n\n${state.runFailure.message}\n\n${state.runFailure.input ? "Your brief is kept in this tab for retry or review." : "The original brief is unavailable; start a new brief to try another run."}` }] : []; state.view = "simulation"; state.floor = 2;
    renderAll();
  } catch (error) {
    $("#workbenchContent").innerHTML = `<div class="empty-state">The local server could not load the demo.<br>${esc(error.message)}</div>`;
    showError("#chatError", "Start the app with npm start, then reload this page.");
  }
}
boot();
