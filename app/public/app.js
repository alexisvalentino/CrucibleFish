import { nextRovingIndex } from "./grid.mjs";
import { loadCharacter, saveCharacter, loadSettings, saveSettings, loadChat, saveChat, getJson, postJson, streamEvents } from "./client.mjs";
import { esc, fmt, icon, avatar, titleCase, renderSimulation, renderCritique, renderMarket, renderEvidence, renderCalibration, renderPersona, renderFeatureRows } from "./views.mjs";
import { loadEvidence, saveEvidence, evidenceDigest, evidenceCsv } from "./evidence.mjs";
const $ = (selector) => document.querySelector(selector);
const state = {
  result: null, demoInput: null, character: loadCharacter(), settings: loadSettings(), serverConfig: {}, history: [],
  view: "simulation", floor: 2, channel: "COMMUNITY_REDDIT_FB_GROUP", archetypeFilter: "ALL", statusFilter: "ALL",
  selectedPersonaId: null, gridFocusId: 1, messages: [], streaming: false, pivotDraft: "", pivoting: false,
  liveRun: null, liveSource: null, liveTimer: null, liveStartedAt: 0, draftInput: null, sidebarOpen: false, evidence: loadEvidence(), calibrationRuns: {}, onboardingStep: 0,
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
function downloadText(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function loadCalibration() {
  const ids = [...new Set((state.evidence || []).map((entry) => entry.runId).filter(Boolean))];
  await Promise.all(ids.map(async (id) => {
    try { state.calibrationRuns[id] = await getJson(`/api/runs/${id}`); } catch { /* an unavailable run stays unloaded */ }
  }));
}
function renderOnboardingStep() {
  const steps = [...document.querySelectorAll("#onboardingDialog .onboarding-step")];
  const labels = ["Start here", "Connections", "Your first run", "The workbench", "The weekly loop"];
  steps.forEach((element, index) => { element.hidden = index !== state.onboardingStep; });
  $("#onboardingStepLabel").textContent = `Step ${state.onboardingStep + 1} of ${steps.length} · ${labels[state.onboardingStep] || ""}`;
  $("#onboardingBack").disabled = state.onboardingStep === 0;
  $("#onboardingNext").textContent = state.onboardingStep === steps.length - 1 ? "Start using CrucibleFish" : "Next";
  $("#onboardingDialog .onboarding-body").scrollTop = 0;
}
function markOnboardingSeen() { try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch { /* storage may be unavailable */ } }
function openOnboarding() { state.onboardingStep = 0; renderOnboardingStep(); openDialog("onboardingDialog"); }
function toast(message) { clearTimeout(toastTimer); $("#toast").textContent = message; $("#toast").hidden = false; toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 3600); }
function initialMessages(result) {
  const t = result.telemetry;
  return [{ role: "assistant", content: `# ${result.input.startupName} is on the table.\nI walked **100 synthetic customers** through Day 1, Day 14, and Day 30.\n\nThe raw idea holds **${t.day14Active}%** by Day 14. The pivot reaches **${t.day30Active}%** by changing the friction and payment model.\n\n${t.topChurnTrigger.feature} is the main break point. Start with the Day 14 floor, or ask me what I would cut.${result.demo ? "\n\nThis is an illustrative demo, not measured customer research." : ""}` }];
}
function showError(selector, message) { const element = $(selector); if (!element) return; element.textContent = message || ""; element.hidden = !message; }
function scrollChat() { requestAnimationFrame(() => { const scroll = $("#chatScroll"); scroll.scrollTop = scroll.scrollHeight; }); }
function renderMessages() {
  $("#chatInner").innerHTML = state.messages.map((message) => message.role === "user"
    ? `<article class="message user"><div class="message-content">${fmt(message.content)}</div></article>`
    : `<article class="message assistant">${avatar(state.character, "avatar message-avatar")}<div><div class="message-name">${esc(state.character.name)}</div><div class="message-content">${fmt(message.content)}</div></div></article>`).join("");
  $("#typingRow").hidden = !state.streaming || state.messages.at(-1)?.streaming;
  $("#chatSend").disabled = state.streaming || Boolean(state.liveRun);
  $("#chatInput").disabled = Boolean(state.liveRun);
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
  } else {
    $("#runIdentity").innerHTML = `<strong>Loading simulation</strong><span>Preparing the workbench</span>`;
    $("#chatMode").textContent = "Preparing the guide";
  }
  $("#activeModel").textContent = state.settings.model;
  const suggestions = ["Why do customers churn?", "What should I cut first?", "Who pays after the pivot?"];
  $("#chatSuggestions").innerHTML = suggestions.map((question) => `<button class="suggestion" type="button" data-question="${esc(question)}">${esc(question)}</button>`).join("");
}
function renderHistory() {
  $("#demoHistoryBtn").classList.toggle("active", state.result?.id === "demo-pawsmatch");
  $("#historyList").innerHTML = state.history.map((run) => `<button class="history-item ${state.result?.id === run.id ? "active" : ""}" type="button" data-run="${esc(run.id)}"><span class="history-dot"></span><span><strong>${esc(run.startupName)}</strong><small>${run.status === "running" ? "Running now" : `${run.telemetry?.day30Active ?? "—"}% Day-30 active`}</small></span></button>`).join("");
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
  if (!state.result) { $("#workbenchContent").innerHTML = state.liveRun ? `<div class="empty-state"><strong>Building your simulation</strong><p>The market graph, critique, and customer batches are running. Results will appear here when the run completes.</p></div>` : `<div class="empty-state">Loading the simulation workbench…</div>`; return; }
  const titles = { simulation: ["Simulation", "Three floors. One cumulative customer memory."], critique: ["Venture critique", "Scope, retention, and the data-to-AI flywheel."], market: ["Market & capital", "Reality graph, market hypotheses, and investor research."], evidence: ["Evidence log", "Real weekly observations, separate from synthetic results."], calibration: ["Calibration", "Predicted results compared with real weekly observations."] };
  $("#viewTitle").textContent = titles[state.view][0]; $("#viewSubtitle").textContent = titles[state.view][1];
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  $("#workbenchContent").innerHTML = state.view === "simulation" ? renderSimulation(state) : state.view === "critique" ? renderCritique(state) : state.view === "evidence" ? renderEvidence(state) : state.view === "calibration" ? renderCalibration(state) : renderMarket(state);
  if (resetScroll) $("#workbenchContent").scrollTop = 0;
  if (focusSelector) $("#workbenchContent").querySelector(focusSelector)?.focus({ preventScroll: true });
  if (focusTitle) $("#viewTitle").focus({ preventScroll: true });
  renderProgress();
}
function renderAll(options = {}) { renderCharacter(); renderHeader(); renderHistory(); renderMessages(); renderWorkbench(options); }
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
  return { startupName: "", websiteUrl: "", targetCustomer: "", oneLinePitch: "", businessModel: "", targetGeography: "", currentTraction: "", currentFeatures: [{ id: "current-1", name: "", description: "", isManualInputRequired: false }], plannedRoadmapFeatures: [{ id: "planned-1", name: "", description: "", category: "OTHER" }], unfairAdvantages: "", proposedPricing: "", seedMaterial: "" };
}
function renderFeatureEditors() {
  $("#currentFeatures").innerHTML = renderFeatureRows(state.draftInput.currentFeatures, "current");
  $("#plannedFeatures").innerHTML = renderFeatureRows(state.draftInput.plannedRoadmapFeatures, "planned");
}
function fillIntake(input) {
  state.draftInput = structuredClone(input);
  for (const key of ["startupName", "websiteUrl", "targetCustomer", "oneLinePitch", "businessModel", "targetGeography", "currentTraction", "unfairAdvantages", "proposedPricing", "seedMaterial"]) $(`#${key}`).value = input[key] || "";
  $("#includeEvidenceInRun").checked = true; renderFeatureEditors(); showError("#simulationError", "");
}
function captureFeatureEditors() {
  for (const [container, key, type] of [["#currentFeatures", "currentFeatures", "current"], ["#plannedFeatures", "plannedRoadmapFeatures", "planned"]]) {
    state.draftInput[key] = [...$(container).children].map((row, index) => {
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
  if ($("#includeEvidenceInRun")?.checked && state.evidence.length) {
    const digest = evidenceDigest(state.evidence);
    input.seedMaterial = input.seedMaterial ? `${input.seedMaterial}\n\n${digest}` : digest;
  }
  return input;
}
async function refreshRuns() { try { state.history = (await getJson("/api/runs")).runs; renderHistory(); } catch { /* the current run remains usable */ } }
async function finishLiveRun(id) {
  const response = await getJson(`/api/runs/${id}`);
  if (!response.result) { setTimeout(() => finishLiveRun(id), 150); return; }
  state.result = response.result; state.liveRun = null; stopProgressTimer(); state.liveSource?.close(); state.liveSource = null;
  state.floor = 2; state.view = "simulation"; state.selectedPersonaId = null;
  const runningMessage = state.messages.find((message) => /running the market graph/i.test(message.content || ""));
  state.messages = runningMessage ? [runningMessage] : [];
  state.messages.push({ role: "assistant", content: `# ${response.result.input.startupName} is ready.\nAll **100 customers** completed the three floors. Raw Day-14 retention is **${response.result.telemetry.day14Active}%**, compared with **${response.result.telemetry.day30Active}%** after the recommended pivot.\n\n${response.result.telemetry.topChurnTrigger.feature} is the leading churn trigger. Ask me to explain the trade-off, or inspect the customer field.` });
  saveChat(state.result.id, state.messages); renderAll({ resetScroll: true }); setMobilePane("workbench"); refreshRuns();
}
function subscribeLiveRun(id) {
  state.liveSource?.close();
  const source = new EventSource(`/api/runs/${id}/events`); state.liveSource = source;
  source.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.phase === "error") { state.liveRun = null; stopProgressTimer(); source.close(); showError("#chatError", data.error || "The run failed. Check your provider settings and try again."); renderProgress(); return; }
    state.liveRun.events.push(data); renderProgress();
    if (data.phase === "complete") finishLiveRun(id);
  };
  source.onerror = () => {
    if (!state.liveRun) return;
    source.close();
    getJson(`/api/runs/${id}`).then((run) => { if (run.result) finishLiveRun(id); else if (run.status === "error") { state.liveRun = null; stopProgressTimer(); showError("#chatError", run.events.at(-1)?.error || "The simulation failed."); renderProgress(); } else subscribeLiveRun(id); }).catch(() => { state.liveRun = null; stopProgressTimer(); showError("#chatError", "Lost contact with the local run. Reload the page and check Run history."); renderProgress(); });
  };
}
async function discoverFromWebsite() {
  const button = $("#discoverBtn"); const original = button.textContent;
  const raw = $("#websiteUrl").value.trim();
  let parsed;
  try { parsed = new URL(raw); } catch { toast("Enter a valid website URL, including https://."); return; }
  if (!["http:", "https:"].includes(parsed.protocol)) { toast("Only http and https websites can be read."); return; }
  if (["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(parsed.hostname)) { toast("Local or internal addresses cannot be read."); return; }
  button.disabled = true; button.textContent = "Reading the site…";
  try {
    const result = await postJson("/api/intake/discover", { name: $("#startupName").value, websiteUrl: raw });
    let filled = 0;
    for (const [key, value] of Object.entries(result.fields || {})) {
      const element = document.getElementById(key);
      if (element && !element.value.trim()) { element.value = value; filled += 1; }
    }
    toast(filled ? `Filled ${filled} field${filled === 1 ? "" : "s"} from the site.` : (result.notes || "Nothing usable found — fill the form manually."));
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; button.textContent = original; }
}
async function startSimulation() {
  const button = $("#startRunBtn"); button.disabled = true; showError("#simulationError", "");
  try {
    const input = collectIntake();
    const started = await postJson("/api/simulate", { input, character: state.character, settings: state.settings });
    closeDialog("simulationDialog");
    state.result = null; state.view = "simulation"; state.floor = 2; state.selectedPersonaId = null;
    state.liveRun = { id: started.id, events: [], startupName: input.startupName };
    state.messages = [{ role: "assistant", content: `# ${input.startupName}\nI’m running the market graph and venture critique, then the customer batches. I’ll keep the raw Day-14 behavior separate from the Day-30 pivot.` }];
    startProgressTimer();
    saveChat(started.id, state.messages); renderAll(); renderProgress(); subscribeLiveRun(started.id); setMobilePane("workbench");
  } catch (error) { showError("#simulationError", error.message); if (error.status === 503) toast("Add your OpenAI key in AI connections, then run again."); }
  finally { button.disabled = false; }
}
function useResult(result, restoreChat = true) {
  state.result = result; state.floor = 2; state.view = "simulation"; state.selectedPersonaId = null; state.pivotDraft = "";
  state.messages = restoreChat ? loadChat(result.id) : [];
  if (!state.messages.length) state.messages = initialMessages(result);
  saveChat(result.id, state.messages); renderAll({ resetScroll: true });
}
async function loadDemo() {
  state.liveSource?.close(); state.liveRun = null; stopProgressTimer();
  const result = await postJson("/api/demo/reset", {}); useResult(result, false); renderProgress(); toast("PawsMatch demo restored.");
}
async function loadRun(id) {
  const response = await getJson(`/api/runs/${id}`);
  if (response.status === "running") {
    const startupName = state.history.find((run) => run.id === id)?.startupName || "Your simulation";
    state.result = null; state.view = "simulation"; state.floor = 2; state.selectedPersonaId = null;
    state.liveRun = { id, events: response.events || [], startupName };
    state.messages = loadChat(id);
    if (!state.messages.length) state.messages = [{ role: "assistant", content: `# ${startupName}\nI’m running the market graph and venture critique, then the customer batches.` }];
    startProgressTimer(); renderAll(); renderProgress(); subscribeLiveRun(id); setMobilePane("workbench"); return;
  }
  if (!response.result) throw new Error("This run has no completed result yet.");
  useResult(response.result); setMobilePane("workbench"); closeSidebar();
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
  if (state.pivotDraft.length < 8) { showError("#pivotError", "Describe the intervention in at least 8 characters."); return; }
  state.pivoting = true; renderWorkbench();
  try {
    const result = await postJson(`/api/runs/${state.result.id}/pivot`, { pivot: state.pivotDraft, settings: state.settings });
    state.result = result; state.floor = 3; state.pivotDraft = "";
    state.messages.push({ role: "assistant", content: `# Day 30 has been re-simulated.\nThe intervention now holds **${result.telemetry.day30Active}%** of customers and produces **${result.telemetry.pivotedPaying} paying champions**. Day 1 and Day 14 were not changed.\n\n${result.demo && !state.settings.apiKey && !state.serverConfig.hasServerOpenAIKey ? "This is a deterministic demo intervention, not an OpenAI run." : "The same 100 identities re-evaluated the new intervention with their existing memories."}` });
    saveChat(result.id, state.messages); toast("Day 30 updated across all 100 customers.");
  } catch (error) {
    state.messages.push({ role: "assistant", content: `I couldn’t apply that intervention: ${error.message}` });
    toast("Intervention failed. Your previous Day 30 is unchanged.");
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
    const response = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: state.result.id, character: state.character, messages: state.messages, selectedPersonaId: state.selectedPersonaId, settings: state.settings, evidence: evidenceDigest(state.evidence) }) });
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
  else { markOnboardingSeen(); closeDialog("onboardingDialog"); }
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
  if (event.target.id === "evidenceForm") {
    const entry = {
      weekEnding: $("#evidenceWeek").value,
      cohortSize: $("#evidenceCohort").value,
      source: $("#evidenceSource").value,
      runId: $("#evidenceRun").value,
      hypothesis: $("#evidenceHypothesis").value,
      thresholdMetric: $("#evidenceThresholdMetric").value,
      thresholdValue: $("#evidenceThresholdValue").value,
      interviews: $("#evidenceInterviews").value,
      active: $("#evidenceActive").value,
      churned: $("#evidenceChurned").value,
      paid: $("#evidencePaid").value,
      gmv: $("#evidenceGmv").value,
      note: $("#evidenceNote").value,
    };
    if (!entry.weekEnding || !entry.note.trim()) { toast("Add a week ending and what you learned."); return; }
    state.evidence = saveEvidence([entry, ...state.evidence]);
    event.target.reset(); renderWorkbench(); toast("Weekly observation saved."); return;
  }
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
document.addEventListener("change", async (event) => {
  if (event.target.id === "archetypeFilter") { state.archetypeFilter = event.target.value; renderWorkbench(); }
  if (event.target.id === "statusFilter") { state.statusFilter = event.target.value; renderWorkbench(); }
  if (event.target.id === "importEvidenceFile") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : [];
      if (!incoming.length) throw new Error("No observations in that file.");
      state.evidence = saveEvidence([...incoming, ...state.evidence]);
      renderWorkbench(); toast(`Imported ${incoming.length} observations.`);
    } catch (error) { toast(`Import failed: ${error.message}`); }
  }
});
document.addEventListener("input", (event) => { if (event.target.id === "pivotInput") state.pivotDraft = event.target.value; });
document.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  try {
    if (target.dataset.close) { if (target.dataset.close === "onboardingDialog") markOnboardingSeen(); closeDialog(target.dataset.close); return; }
    if (target.dataset.removeEvidence) { state.evidence = state.evidence.filter((entry) => entry.id !== target.dataset.removeEvidence); saveEvidence(state.evidence); renderWorkbench(); toast("Observation removed."); return; }
    if (target.id === "exportEvidenceJson") { downloadText("cruciblefish-evidence.json", JSON.stringify(state.evidence, null, 2), "application/json"); return; }
    if (target.id === "exportEvidenceCsv") { downloadText("cruciblefish-evidence.csv", evidenceCsv(state.evidence), "text/csv"); return; }
    if (target.id === "importEvidenceBtn") { $("#importEvidenceFile").click(); return; }
    if (target.dataset.mobilePane) { setMobilePane(target.dataset.mobilePane); return; }
    if (target.dataset.view) { state.view = target.dataset.view; if (state.view === "calibration") await loadCalibration(); renderWorkbench({ resetScroll: true, focusTitle: true }); setMobilePane("workbench"); return; }
    if (target.dataset.floor) { state.floor = Number(target.dataset.floor); renderWorkbench(); return; }
    if (target.dataset.channel) { state.channel = target.dataset.channel; renderWorkbench(); return; }
    if (target.dataset.question) { await sendChat(target.dataset.question); return; }
    if (target.dataset.run) { await loadRun(target.dataset.run); return; }
    if (target.hasAttribute("data-edit-character")) { openCharacter(); return; }
    if (target.dataset.askPersona) { const id = Number(target.dataset.askPersona); dialogReturnFocus.set("personaDialog", $("#chatInput")); closeDialog("personaDialog"); setMobilePane("chat"); await sendChat(`What should I learn from customer #${id}?`); return; }
    if (target.dataset.persona) { openPersona(target.dataset.persona); return; }
    if (target.id === "addCurrentFeature" || target.id === "addPlannedFeature") {
      captureFeatureEditors();
      const planned = target.id === "addPlannedFeature"; const key = planned ? "plannedRoadmapFeatures" : "currentFeatures";
      state.draftInput[key].push(planned ? { id: `planned-${Date.now()}`, name: "", description: "", category: "OTHER" } : { id: `current-${Date.now()}`, name: "", description: "", isManualInputRequired: false });
      renderFeatureEditors(); return;
    }
    if (target.dataset.removeFeature !== undefined) {
      captureFeatureEditors();
      const key = target.dataset.featureType === "planned" ? "plannedRoadmapFeatures" : "currentFeatures";
      if (state.draftInput[key].length === 1) { toast("Keep at least one feature in this section."); return; }
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
  const fallback = dialog.id === "personaDialog" ? document.querySelector(`[data-persona="${state.gridFocusId}"]`) : dialog.id === "settingsDialog" ? $("#settingsBtn") : dialog.id === "characterDialog" ? document.querySelector("[data-edit-character]") : $("#newSimulationBtn");
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
    state.result = demo; state.messages = loadChat(demo.id);
    if (!state.messages.length) state.messages = initialMessages(demo);
    renderAll();
    let onboardingSeen = false;
    try { onboardingSeen = localStorage.getItem(ONBOARDING_KEY) === "1"; } catch { /* storage may be unavailable */ }
    if (!onboardingSeen) openOnboarding();
  } catch (error) {
    $("#workbenchContent").innerHTML = `<div class="empty-state">The local server could not load the demo.<br>${esc(error.message)}</div>`;
    showError("#chatError", "Start the app with npm start, then reload this page.");
  }
}
boot();
