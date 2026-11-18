import "./test-env.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { BATCH_CONFIGS, applyRound3Deltas, applyDemoPivot, computeTelemetry, createDemoSimulation, demoGuideReply, runCrucibleSimulation, validateStartupInput } from "../lib/simulation.mjs";
import { buildGuidePrompt, findMentionedPersona } from "../lib/prompts.mjs";

test("demo contains 100 unique customers and stable temporal telemetry", () => {
  const demo = createDemoSimulation();
  assert.equal(demo.personas.length, 100);
  assert.deepEqual(demo.personas.map((p) => p.id), Array.from({ length: 100 }, (_, i) => i + 1));
  assert.equal(new Set(demo.personas.map((p) => p.name)).size, 100);
  assert.ok(demo.personas.every((p) => p.episodicMemoryLog.length === 3));
  assert.equal(demo.telemetry.day1Adoption, 86);
  assert.equal(demo.telemetry.day14Active, 24);
  assert.equal(demo.telemetry.day30Active, 71);
  assert.equal(demo.telemetry.retentionLift, 47);
  assert.equal(demo.telemetry.rawPaying, 8);
  assert.equal(demo.telemetry.pivotedPaying, 31);
  assert.equal(demo.telemetry.pivotedMonthlyGmv, 186);
  assert.equal(demo.ventureCritic.featureTriageMatrix.length, 12);
  assert.equal(demo.ventureCritic.fourStageDataFlywheel.length, 4);
  assert.equal(demo.ontology.socialThreads.length, 6);
});

test("intake requires an explicit business model and accepts untested pricing", () => {
  const fixture = createDemoSimulation();
  assert.ok(fixture.input.businessModel, "the preset must demonstrate a business model");
  assert.ok(fixture.input.targetCustomer, "the preset must demonstrate the target customer");
  assert.throws(() => validateStartupInput({ ...fixture.input, businessModel: "" }), /Business model/i);
  assert.throws(() => validateStartupInput({ ...fixture.input, businessModel: "free" }), /at least 20 characters/i);
  const accepted = validateStartupInput({
    ...fixture.input,
    businessModel: "B2C freemium: owners use it free; clinics pay a monthly licence for structured intake and referrals.",
    proposedPricing: "TBD",
    seedMaterial: "Interview notes from 12 owners (synthetic test data).",
  });
  assert.equal(accepted.proposedPricing, "TBD");
  assert.match(accepted.seedMaterial, /Interview notes/);
  assert.throws(() => validateStartupInput({ ...fixture.input, seedMaterial: "x".repeat(20001) }), /seed material/i);
});

test("live prompts carry the business model and payer context to every stage", async () => {
  const fixture = createDemoSimulation();
  const calls = [];
  const requestJson = async (options) => {
    calls.push(options);
    if (options.schemaName === "market_reality") return fixture.ontology;
    if (options.schemaName === "venture_critic") return fixture.ventureCritic;
    const match = options.system.match(/Persona IDs (\d+) through (\d+)/);
    return { personas: fixture.personas.slice(Number(match[1]) - 1, Number(match[2])) };
  };
  await runCrucibleSimulation(fixture.input, { apiKey: "test" }, { requestJson });
  assert.match(calls[0].system, /business model/i);
  assert.match(calls[1].system, /business model/i);
  assert.ok(calls.slice(2).every((call) => /payer/i.test(call.system)));
  for (const call of calls) assert.match(call.prompt, /businessModel/);
  assert.ok(calls.slice(0, 3).every((call) => /seed material/i.test(call.system)));
  assert.match(calls[0].prompt, /"seedMaterial"/);
  assert.doesNotMatch(calls[2].system, /must produce fatigue/i);
  assert.match(calls[2].system, /evaluate whether/i);
});

test("social threads are validated and only routed to the batches they affect", async () => {
  const fixture = createDemoSimulation();
  const calls = [];
  const ontology = {
    knowledgeGraph: { nodes: [], edges: [] },
    socialThreads: [
      { threadId: "t-early", round: 1, authorPersonaId: 3, influencedPersonaIds: [5, 12], postTitleOrHook: "EARLY_HOOK" },
      { threadId: "t-late", round: 2, authorPersonaId: 95, influencedPersonaIds: [97], postTitleOrHook: "LATE_HOOK" },
      ...Array.from({ length: 4 }, (_, index) => ({
        threadId: `t-fill-${index}`, round: 3, authorPersonaId: 30 + index,
        influencedPersonaIds: [30 + index], postTitleOrHook: "FILL_HOOK",
      })),
    ],
  };
  const requestJson = async (options) => {
    calls.push(options);
    if (options.schemaName === "market_reality") return ontology;
    if (options.schemaName === "venture_critic") return fixture.ventureCritic;
    const match = options.system.match(/Persona IDs (\d+) through (\d+)/);
    return { personas: fixture.personas.slice(Number(match[1]) - 1, Number(match[2])) };
  };
  await runCrucibleSimulation(fixture.input, { apiKey: "test" }, { requestJson });
  const swarm = calls.filter((call) => call.schemaName === "swarm_batch");
  assert.match(swarm[0].prompt, /EARLY_HOOK/);
  assert.doesNotMatch(swarm[0].prompt, /LATE_HOOK/);
  assert.match(swarm[4].prompt, /LATE_HOOK/);
});

test("malformed social threads stop a run before personas are generated", async () => {
  const fixture = createDemoSimulation();
  const requestJson = async (options) => {
    if (options.schemaName === "market_reality") return { knowledgeGraph: { nodes: [], edges: [] }, socialThreads: [] };
    if (options.schemaName === "venture_critic") return fixture.ventureCritic;
    return { personas: fixture.personas.slice(0, 20) };
  };
  await assert.rejects(
    () => runCrucibleSimulation(fixture.input, { apiKey: "test" }, { requestJson }),
    /six social threads/i,
  );
});

test("the guide resolves a mentioned persona and sees seed evidence", () => {
  const fixture = createDemoSimulation();
  const persona = fixture.personas[41];
  assert.equal(findMentionedPersona(fixture, `What happened to customer #${persona.id}?`)?.id, persona.id);
  assert.equal(findMentionedPersona(fixture, `Tell me about ${persona.name}`)?.id, persona.id);
  assert.equal(findMentionedPersona(fixture, "Why do customers churn?"), null);
  assert.match(buildGuidePrompt({}, fixture, persona), new RegExp(persona.name));
  assert.match(buildGuidePrompt({}, { ...fixture, input: { ...fixture.input, seedMaterial: "OWNER_INTERVIEW_EXCERPT" } }), /OWNER_INTERVIEW_EXCERPT/);
  assert.match(buildGuidePrompt({}, fixture, persona, "WEEK_EVIDENCE_MARKER"), /WEEK_EVIDENCE_MARKER/);
  assert.match(buildGuidePrompt({}, fixture, persona), /has not entered real weekly observations/);
});

test("Round-3 interventions preserve identity and the first two rounds", () => {
  const demo = createDemoSimulation();
  const before = structuredClone(demo.personas[41]);
  const updated = applyRound3Deltas(demo, [{
    id: 42,
    round3Day30ActionAfterPivot: "CONVERT_TO_PAID",
    round3PivotReactionNote: "The clinic-paid plan fits my budget.",
    willingnessToPayMonthlyUsdAfterPivot: 0,
    finalLifecycleStatus: "SAVED_BY_GODS_EYE_PIVOT",
    episodicMemoryEntry: "Day 30: I returned when my clinic paid.",
  }], "Make owner accounts free and charge clinics.");
  const after = updated.personas[41];
  for (const key of ["name", "age", "locationCity", "archetype", "round1Day1Action", "round1ReactionNote", "round2Day14ActionRawIdea", "round2SocialContagionNote"]) {
    assert.deepEqual(after[key], before[key], key);
  }
  assert.deepEqual(after.episodicMemoryLog.slice(0, 2), before.episodicMemoryLog.slice(0, 2));
  assert.equal(after.episodicMemoryLog[2], "Day 30: I returned when my clinic paid.");
  assert.equal(updated.ventureCritic.recommendedGodsEyePivotSummary, "Make owner accounts free and charge clinics.");
  assert.equal(updated.pivotHistory.at(-1).pivot, "Make owner accounts free and charge clinics.");
  assert.deepEqual(updated.telemetry, computeTelemetry(updated.personas));
  assert.throws(() => applyRound3Deltas(demo, [{ id: 42, finalLifecycleStatus: "UNKNOWN" }], "bad"), /status/i);
});

test("demo guide distinguishes a selected customer from generic churn questions", () => {
  const demo = createDemoSimulation();
  const selected = demo.personas[41];
  assert.match(demoGuideReply("What should I learn from customer #42?", demo, selected), /Cheska Ramos/);
  assert.doesNotMatch(demoGuideReply("Why do customers churn?", demo, selected), /Cheska Ramos/);
  assert.match(demoGuideReply("Why do customers churn?", demo, selected), /24%/);
});

test("favorable demo pivots retain persistent skeptics instead of universal conversion", () => {
  const demo = createDemoSimulation();
  const updated = applyDemoPivot(demo, "Make owner accounts free and let veterinary clinics pay for structured intake.");
  assert.ok(updated.telemetry.statusCounts.CHURNED_PERMANENTLY >= 15);
  assert.ok(updated.telemetry.day30Active <= 85);
  assert.deepEqual(updated.personas.map((p) => p.round2Day14ActionRawIdea), demo.personas.map((p) => p.round2Day14ActionRawIdea));
});

test("live orchestration makes seven calls and five exact 20-person batches", async () => {
  const fixture = createDemoSimulation();
  const calls = [];
  const progress = [];
  const requestJson = async (options) => {
    calls.push(options);
    if (options.schemaName === "market_reality") return fixture.ontology;
    if (options.schemaName === "venture_critic") return fixture.ventureCritic;
    const match = options.system.match(/Persona IDs (\d+) through (\d+)/);
    assert.ok(match, options.system.slice(0, 300));
    return { personas: fixture.personas.slice(Number(match[1]) - 1, Number(match[2])) };
  };
  const result = await runCrucibleSimulation(fixture.input, { model: "gpt-4o", fastModel: "gpt-4o-mini", apiKey: "test" }, {
    requestJson, onProgress: (event) => progress.push(event),
  });
  assert.equal(calls.length, 7);
  assert.equal(calls.filter((call) => call.schemaName === "swarm_batch").length, 5);
  assert.deepEqual(BATCH_CONFIGS.map((batch) => [batch.startId, batch.endId]), [[1,20],[21,40],[41,60],[61,80],[81,100]]);
  assert.equal(calls[0].model, "gpt-4o-mini");
  assert.equal(calls[1].model, "gpt-4o");
  assert.ok(calls.slice(2).every((call) => call.model === "gpt-4o-mini"));
  assert.equal(result.personas.length, 100);
  assert.equal(result.telemetry.day30Active, 71);
  assert.equal(progress.at(-1).phase, "complete");
});

test("incomplete or duplicate swarm output is rejected instead of silently simulating fewer customers", async () => {
  const fixture = createDemoSimulation();
  const requestJson = async (options) => {
    if (options.schemaName === "market_reality") return fixture.ontology;
    if (options.schemaName === "venture_critic") return fixture.ventureCritic;
    return { personas: fixture.personas.slice(0, 19) };
  };
  await assert.rejects(() => runCrucibleSimulation(fixture.input, { apiKey: "test" }, { requestJson }), /20 personas|IDs|duplicate/i);
});
