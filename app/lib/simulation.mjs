import { randomUUID } from "node:crypto";
import { normalizeOpenAIConfig, requestJson as openAiJson } from "./openai.mjs";
import { ONTOLOGY_SCHEMA, VENTURE_SCHEMA, swarmSchema, deltaSchema } from "./schemas.mjs";
import { ONTOLOGY_SYSTEM_PROMPT, CRITIC_SYSTEM_PROMPT, buildSwarmPrompt, buildDeltaPrompt } from "./prompts.mjs";
import { createDemoSimulation } from "./demo.mjs";
import { computeTelemetry } from "./telemetry.mjs";
import { env } from "./env.mjs";

export { createDemoSimulation, computeTelemetry };
const configuredConcurrency = Number(env("SWARM_CONCURRENCY"));
export const SWARM_CONCURRENCY = Number.isInteger(configuredConcurrency) && configuredConcurrency >= 1 && configuredConcurrency <= 5 ? configuredConcurrency : 2;
const ARCHETYPE_PLAN = [
  ...Array(15).fill("HAIR_ON_FIRE_POWER_USER"),
  ...Array(35).fill("PRAGMATIC_URBAN_MAINSTREAM"),
  ...Array(20).fill("SKEPTICAL_INCUMBENT_LOYALIST"),
  ...Array(20).fill("PRICE_SENSITIVE_FREE_RIDER"),
  ...Array(10).fill("B2B_SUPPLY_SIDE_PARTNER"),
];
const configuredBatchSize = Number(env("SWARM_BATCH_SIZE"));
export const BATCH_SIZE = Number.isInteger(configuredBatchSize) && configuredBatchSize >= 5 && configuredBatchSize <= 20 ? configuredBatchSize : 20;
export const BATCH_CONFIGS = [];
for (let startId = 1; startId <= 100; startId += BATCH_SIZE) {
  const endId = Math.min(100, startId + BATCH_SIZE - 1);
  const counts = new Map();
  for (const archetype of ARCHETYPE_PLAN.slice(startId - 1, endId)) counts.set(archetype, (counts.get(archetype) || 0) + 1);
  const distribution = [...counts].map(([name, count]) => `${count} ${name}`).join(", ") + (counts.has("B2B_SUPPLY_SIDE_PARTNER") ? " (Vets, Sitters, Organizers)" : "");
  BATCH_CONFIGS.push({ startId, endId, distribution });
}
const ACTIONS = new Set(["ADOPT_AND_EVANGELIZE", "ADOPT_PASSIVELY", "POST_FRICTION_COMPLAINT", "INFLUENCED_TO_CHURN", "BOUNCE_IMMEDIATELY", "CONVERT_TO_PAID"]);
const STATUSES = new Set(["PAYING_CHAMPION", "FREE_ACTIVE_DATA_CONTRIBUTOR", "SAVED_BY_GODS_EYE_PIVOT", "CHURNED_PERMANENTLY"]);
const REQUIRED_FIELDS = ["name", "locationCity", "occupation", "archetype", "specificIdentityContext", "round1ReactionNote", "round2SocialContagionNote", "round3PivotReactionNote", "favoriteFeature", "mostHatedFeature", "finalLifecycleStatus"];

const FIELD_LABELS = {
  startupName: "Startup name",
  oneLinePitch: "One-line pitch",
  targetGeography: "Target geography",
  currentTraction: "Current traction",
  unfairAdvantages: "Unfair advantages",
  proposedPricing: "Pricing & packaging",
  businessModel: "Business model",
};

function badRequest(message) { const error = new Error(message); error.status = 400; return error; }

export function validateStartupInput(input = {}) {
  const required = ["startupName", "oneLinePitch", "targetGeography", "currentTraction", "unfairAdvantages", "proposedPricing", "businessModel"];
  for (const key of required) if (typeof input[key] !== "string" || input[key].trim().length < 2) throw badRequest(`Complete the ${FIELD_LABELS[key] || key} field before running the simulation.`);
  if (input.oneLinePitch.trim().length < 20) throw badRequest("Describe the startup and its customer in at least 20 characters.");
  if (input.businessModel.trim().length < 20) throw badRequest("Describe the business model in at least 20 characters (who pays, for what, and how revenue is captured).");
  if (input.seedMaterial !== undefined && input.seedMaterial !== null && input.seedMaterial !== "") {
    if (typeof input.seedMaterial !== "string" || input.seedMaterial.length > 20000) throw badRequest("Describe the seed material in under 20,000 characters.");
  }
  for (const key of ["currentFeatures", "plannedRoadmapFeatures"]) {
    if (!Array.isArray(input[key]) || !input[key].length) throw badRequest(`Add at least one item to ${key}.`);
    if (input[key].length > 30) throw badRequest(`${key} is limited to 30 items per run.`);
    for (const feature of input[key]) if (!feature.name || !feature.description) throw badRequest(`Every ${key} item needs a name and description.`);
  }
  return structuredClone(input);
}

function validateBatch(payload, batch, expectedCount = 20) {
  const personas = payload?.personas;
  if (!Array.isArray(personas) || personas.length !== expectedCount) throw new Error(`Swarm batch ${batch.startId}-${batch.endId} must return exactly ${expectedCount} personas.`);
  personas.forEach((persona, index) => {
    const expected = batch.startId + index;
    if (persona.id !== expected) throw new Error(`Swarm IDs are out of order: expected ${expected}, received ${persona.id}.`);
    for (const key of REQUIRED_FIELDS) if (typeof persona[key] !== "string" || !persona[key].trim()) throw new Error(`Persona ${expected} is missing ${key}.`);
    if (!ACTIONS.has(persona.round1Day1Action) || !ACTIONS.has(persona.round2Day14ActionRawIdea) || !ACTIONS.has(persona.round3Day30ActionAfterPivot)) throw new Error(`Persona ${expected} has an invalid round action.`);
    if (!STATUSES.has(persona.finalLifecycleStatus)) throw new Error(`Persona ${expected} has an invalid final status.`);
    if (!Array.isArray(persona.episodicMemoryLog) || persona.episodicMemoryLog.length !== 3) throw new Error(`Persona ${expected} needs three episodic memories.`);
  });
  return personas;
}

function validateOntology(ontology) {
  const graph = ontology?.knowledgeGraph;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new Error("The market ontology is missing its knowledge graph.");
  if (!Array.isArray(ontology.socialThreads) || ontology.socialThreads.length !== 6) throw new Error("The market ontology must produce exactly six social threads.");
  const seen = new Set();
  for (const thread of ontology.socialThreads) {
    if (!thread || typeof thread.threadId !== "string" || !thread.threadId.trim()) throw new Error("Every social thread needs a threadId.");
    if (seen.has(thread.threadId)) throw new Error(`Duplicate social thread ${thread.threadId}.`);
    seen.add(thread.threadId);
    if (![1, 2, 3].includes(Number(thread.round))) throw new Error(`Social thread ${thread.threadId} has an invalid round.`);
    if (!Number.isInteger(thread.authorPersonaId) || thread.authorPersonaId < 1 || thread.authorPersonaId > 100) throw new Error(`Social thread ${thread.threadId} needs an author persona ID between 1 and 100.`);
    if (!Array.isArray(thread.influencedPersonaIds)) throw new Error(`Social thread ${thread.threadId} needs an influencedPersonaIds list.`);
    for (const id of thread.influencedPersonaIds) {
      if (!Number.isInteger(id) || id < 1 || id > 100) throw new Error(`Social thread ${thread.threadId} has an invalid influenced persona ID.`);
    }
  }
  return ontology;
}

function threadsForBatch(ontology, batch) {
  const inRange = (id) => Number.isInteger(id) && id >= batch.startId && id <= batch.endId;
  return ontology.socialThreads.filter((thread) => inRange(thread.authorPersonaId) || thread.influencedPersonaIds.some(inRange));
}

export async function runCrucibleSimulation(rawInput, settings = {}, dependencies = {}) {
  const input = validateStartupInput(rawInput);
  const config = normalizeOpenAIConfig(settings);
  const requestJson = dependencies.requestJson || openAiJson;
  const progress = dependencies.onProgress || (() => {});
  const total = 2 + BATCH_CONFIGS.length;
  progress({ phase: "preflight", label: "Mapping market reality and auditing the roadmap", completed: 0, total });
  const ontologyPromise = requestJson({
    settings, model: config.fastModel, system: ONTOLOGY_SYSTEM_PROMPT, prompt: JSON.stringify(input),
    schema: ONTOLOGY_SCHEMA, schemaName: "market_reality", maxTokens: 7000, temperature: 0.4,
  }).then((data) => { validateOntology(data); progress({ phase: "ontology", label: "Market reality graph and six seed threads ready", completed: 1, total }); return data; });
  const criticPromise = requestJson({
    settings, model: config.model, system: CRITIC_SYSTEM_PROMPT, prompt: JSON.stringify(input),
    schema: VENTURE_SCHEMA, schemaName: "venture_critic", maxTokens: 10000, temperature: 0.3,
  }).then((data) => { progress({ phase: "critic", label: "Feature triage and God's-eye pivot ready", completed: 2, total }); return data; });
  const [ontology, ventureCritic] = await Promise.all([ontologyPromise, criticPromise]);
  if (!ventureCritic.recommendedGodsEyePivotSummary) throw new Error("The venture critic did not produce a God's-eye pivot.");
  let completed = 2;
  const runBatch = async (batch) => {
    const system = buildSwarmPrompt(batch, input.targetGeography, ventureCritic.recommendedGodsEyePivotSummary);
    const prompt = JSON.stringify({ startupInput: input, knowledgeGraph: ontology.knowledgeGraph, communityThreads: threadsForBatch(ontology, batch), godsEyePivot: ventureCritic.recommendedGodsEyePivotSummary });
    const options = { settings, model: config.fastModel, prompt, schema: swarmSchema(BATCH_SIZE), schemaName: "swarm_batch", maxTokens: 9000, temperature: 0.7 };
    let valid;
    try { valid = validateBatch(await requestJson({ ...options, system }), batch, BATCH_SIZE); }
    catch (error) {
      const repair = `${system}\nREPAIR: your previous response was rejected — ${error.message}. Return the full batch again with every required field present and non-empty.`;
      valid = validateBatch(await requestJson({ ...options, system: repair }), batch, BATCH_SIZE);
    }
    completed += 1;
    progress({ phase: "swarm", label: `Customer batch ${batch.startId}-${batch.endId} complete`, completed, total, batch });
    return valid;
  };
  const personas = [];
  for (let index = 0; index < BATCH_CONFIGS.length; index += SWARM_CONCURRENCY) {
    const slice = BATCH_CONFIGS.slice(index, index + SWARM_CONCURRENCY);
    const results = await Promise.all(slice.map(runBatch));
    personas.push(...results.flat());
  }
  if (personas.length !== 100 || new Set(personas.map((p) => p.id)).size !== 100) throw new Error("The swarm returned duplicate or incomplete customer IDs.");
  progress({ phase: "aggregate", label: "Computing retention, churn contagion, and paid conversion", completed: total, total });
  const result = { id: randomUUID(), demo: false, createdAt: new Date().toISOString(), input, ontology, ventureCritic, personas, telemetry: computeTelemetry(personas), pivotHistory: [] };
  progress({ phase: "complete", label: "All 100 customers are ready", completed: total, total });
  return result;
}

export function applyRound3Deltas(simulation, deltas, pivot) {
  if (!Array.isArray(deltas)) throw new Error("Round-3 deltas must be an array.");
  const seen = new Set();
  for (const delta of deltas) {
    if (!STATUSES.has(delta.finalLifecycleStatus)) throw new Error(`Invalid final lifecycle status for persona ${delta.id}.`);
    if (!ACTIONS.has(delta.round3Day30ActionAfterPivot)) throw new Error(`Invalid Round-3 action for persona ${delta.id}.`);
    if (seen.has(delta.id)) throw new Error(`Duplicate Round-3 delta for persona ${delta.id}.`);
    seen.add(delta.id);
  }
  const cleanPivot = String(pivot || "").trim();
  if (cleanPivot.length < 8) throw new Error("Describe the pivot in at least 8 characters.");
  const byId = new Map(deltas.map((delta) => [delta.id, delta]));
  const result = structuredClone(simulation);
  result.personas = result.personas.map((persona) => {
    const delta = byId.get(persona.id);
    if (!delta) return persona;
    const note = String(delta.round3PivotReactionNote || "The new intervention did not change my decision.").slice(0, 1200);
    return {
      ...persona,
      round3Day30ActionAfterPivot: delta.round3Day30ActionAfterPivot,
      round3PivotReactionNote: note,
      willingnessToPayMonthlyUsdAfterPivot: Math.max(0, Number(delta.willingnessToPayMonthlyUsdAfterPivot) || 0),
      finalLifecycleStatus: delta.finalLifecycleStatus,
      episodicMemoryLog: [...persona.episodicMemoryLog.slice(0, 2), String(delta.episodicMemoryEntry || `Day 30: ${note}`).slice(0, 1200)],
    };
  });
  result.ventureCritic.recommendedGodsEyePivotSummary = cleanPivot;
  result.telemetry = computeTelemetry(result.personas);
  result.pivotHistory = [...(result.pivotHistory || []), { pivot: cleanPivot, at: new Date().toISOString() }].slice(-12);
  return result;
}

export async function reSimulateRound3(simulation, pivot, settings = {}, dependencies = {}) {
  const cleanPivot = String(pivot || "").trim();
  if (cleanPivot.length < 8) throw new Error("Describe the intervention in at least 8 characters.");
  const config = normalizeOpenAIConfig(settings);
  const requestJson = dependencies.requestJson || openAiJson;
  const batches = BATCH_CONFIGS.map((batch) => {
    const people = simulation.personas.slice(batch.startId - 1, batch.endId);
    return requestJson({
      settings, model: config.fastModel, system: buildDeltaPrompt(batch, cleanPivot),
      prompt: JSON.stringify({ startup: simulation.input, customers: people, intervention: cleanPivot }),
      schema: deltaSchema(BATCH_SIZE), schemaName: "round_three_delta", maxTokens: 6500, temperature: 0.55,
    }).then((payload) => {
      if (!Array.isArray(payload.deltas) || payload.deltas.length !== BATCH_SIZE) throw new Error(`Pivot batch ${batch.startId}-${batch.endId} must return ${BATCH_SIZE} deltas.`);
      payload.deltas.forEach((delta, index) => { if (delta.id !== batch.startId + index) throw new Error(`Pivot delta IDs must stay in their original order.`); });
      return payload.deltas;
    });
  });
  return applyRound3Deltas(simulation, (await Promise.all(batches)).flat(), cleanPivot);
}

export function applyDemoPivot(simulation, pivot) {
  const text = String(pivot || "").toLowerCase();
  const deltas = simulation.personas.map((persona) => {
    const b2b = persona.archetype === "B2B_SUPPLY_SIDE_PARTNER";
    const priceSensitive = persona.archetype === "PRICE_SENSITIVE_FREE_RIDER";
    const clinicPaid = /clinic|b2b|vet(?:erinary)?(?:\s+\w+){0,3}\s+pay/.test(text);
    const automation = /ocr|automat|passive|remove|manual|scan/.test(text);
    const free = /free|no charge|zero cost/.test(text);
    const hostile = /double|expensive|\$\d{3,}|premium only/.test(text);
    const wins = !hostile && ((clinicPaid && (b2b || priceSensitive)) || (automation && persona.id % 3 !== 0) || (free && persona.id % 4 !== 0));
    const pays = wins && (b2b || (!priceSensitive && persona.id % 3 === 1));
    const stubborn = persona.id % 4 === 0 && !b2b;
    const churn = stubborn || (hostile ? persona.id % 3 !== 0 : !wins && persona.finalLifecycleStatus === "CHURNED_PERMANENTLY");
    const status = churn ? "CHURNED_PERMANENTLY" : pays ? "PAYING_CHAMPION" : wins ? "SAVED_BY_GODS_EYE_PIVOT" : persona.finalLifecycleStatus;
    const note = churn ? "This change still does not fit my habit or budget." : pays ? "The new model has a clear buyer and a useful outcome." : wins ? "This intervention removes the specific friction that pushed me away." : "My original assessment is unchanged by this intervention.";
    return {
      id: persona.id,
      round3Day30ActionAfterPivot: churn ? "INFLUENCED_TO_CHURN" : pays ? "CONVERT_TO_PAID" : "ADOPT_PASSIVELY",
      round3PivotReactionNote: note,
      willingnessToPayMonthlyUsdAfterPivot: pays ? (clinicPaid && b2b ? 18 : 6) : 0,
      finalLifecycleStatus: status,
      episodicMemoryEntry: `Day 30: ${note}`,
    };
  });
  return applyRound3Deltas(simulation, deltas, pivot);
}

export function demoGuideReply(message, simulation, selectedPersona) {
  const text = String(message || "").toLowerCase();
  if (selectedPersona && new RegExp(`(?:this (?:customer|person|profile)|customer\\s*#?${selectedPersona.id}\\b|#${selectedPersona.id}\\b)`, "i").test(text)) return `${selectedPersona.name} is a ${selectedPersona.archetype.toLowerCase().replaceAll("_", " ")} in ${selectedPersona.locationCity}. Their Day-14 memory says: “${selectedPersona.episodicMemoryLog[1]}” Their final status is ${selectedPersona.finalLifecycleStatus.toLowerCase().replaceAll("_", " ")}. I would test the specific friction in that memory, not treat this one synthetic profile as a real interview.`;
  if (/churn|retention|friction|break|problem/.test(text)) return `The raw idea reaches ${simulation.telemetry.day14Active}% Day-14 retention. ${simulation.telemetry.topChurnTrigger.feature} is the most common friction among inactive customers. The important next step is a small real-world test: remove routine typing for one cohort and compare their repeat behavior with the current flow.`;
  if (/pay|price|revenue|gmv|conversion/.test(text)) return `The demo moves from ${simulation.telemetry.rawPaying} to ${simulation.telemetry.pivotedPaying} paying champions, with illustrative monthly GMV rising from $${simulation.telemetry.rawMonthlyGmv} to $${simulation.telemetry.pivotedMonthlyGmv} per 100 customers. Treat that as a hypothesis about the stronger payment moment, not a revenue forecast.`;
  if (/feature|cut|kill|build|roadmap/.test(text)) return `I would keep QR events and the OCR health card as the wedge, kill routine manual health and activity entry, and defer custom hardware and the sitter marketplace. The first build should close one record-to-vet-outcome loop before adding another operational business.`;
  return `I would start with the Day-14 evidence: only ${simulation.telemetry.day14Active}% remain active on the raw idea, compared with ${simulation.telemetry.day30Active}% after the pivot. Ask me about churn, pricing, a customer number, or which features to cut. These are simulated hypotheses to help design real customer tests.`;
}
