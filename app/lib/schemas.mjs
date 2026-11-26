const str = { type: "string" };
const num = { type: "number" };
const int = { type: "integer" };
const bool = { type: "boolean" };
const list = (items) => ({ type: "array", items });
const obj = (properties) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const choices = (...values) => ({ type: "string", enum: values });

const archetype = choices("HAIR_ON_FIRE_POWER_USER", "PRAGMATIC_URBAN_MAINSTREAM", "SKEPTICAL_INCUMBENT_LOYALIST", "PRICE_SENSITIVE_FREE_RIDER", "B2B_SUPPLY_SIDE_PARTNER");
const action = choices("ADOPT_AND_EVANGELIZE", "ADOPT_PASSIVELY", "POST_FRICTION_COMPLAINT", "INFLUENCED_TO_CHURN", "BOUNCE_IMMEDIATELY", "CONVERT_TO_PAID");
const baselineLifecycle = choices("PAYING_CHAMPION", "FREE_ACTIVE_DATA_CONTRIBUTOR", "CHURNED_PERMANENTLY");
const lifecycle = choices("PAYING_CHAMPION", "FREE_ACTIVE_DATA_CONTRIBUTOR", "SAVED_BY_GODS_EYE_PIVOT", "CHURNED_PERMANENTLY");

const personaProperties = {
  id: int, name: str, age: int, locationCity: str, occupation: str, monthlyDisposableBudgetLocal: str,
  archetype, socialInfluenceRole: choices("VOCAL_KOL", "ACTIVE_COMMENTER", "SILENT_LURKER"),
  specificIdentityContext: str, incumbentToolsUsed: list(str),
  round1Day1Action: action, round1ReactionNote: str,
  round2Day14ActionRawIdea: action, round2SocialContagionNote: str,
  round3Day30Action: action, round3Day30ReactionNote: str,
  episodicMemoryLog: { type: "array", items: str, minItems: 3, maxItems: 3 },
  favoriteFeature: str, mostHatedFeature: str,
  willingnessToPayMonthlyUsdDay14: num, willingnessToPayMonthlyUsdDay30: num,
  finalLifecycleStatus: baselineLifecycle,
};
export const PERSONA_SCHEMA = obj(personaProperties);
export const swarmSchema = (size = 20) => obj({ personas: { type: "array", items: PERSONA_SCHEMA, minItems: size, maxItems: size } });
export const SWARM_SCHEMA = swarmSchema(20);

const node = obj({ id: str, label: str, nodeType: choices("FEATURE_CURRENT", "FEATURE_PLANNED", "INCUMBENT_HABIT", "FRICTION_POINT", "DATA_ASSET", "SUPPLY_PARTNER"), effortOrFrictionScore: num, standaloneValueScore: num, notes: str });
const edge = obj({ source: str, target: str, relationship: choices("REQUIRES_MANUAL_EFFORT", "COMPETES_WITH_INCUMBENT", "CAPTURES_DATA_FOR", "MONETIZES_VIA", "CAUSES_CHURN_IN"), weight: num });
const thread = obj({
  threadId: str, round: { type: "integer", enum: [1, 2, 3] }, channel: choices("SHORT_FORM_TIKTOK_X", "COMMUNITY_REDDIT_FB_GROUP"),
  authorPersonaId: int, authorName: str, authorArchetype: archetype, postTitleOrHook: str, postBody: str,
  upvotes: int, replyCount: int, sentiment: choices("VIRAL_PRAISE", "SKEPTICAL_CRITIQUE", "CHURN_CASCADE_TRIGGER"),
  triggeredByFeature: str, influencedPersonaIds: list(int),
});
export const ONTOLOGY_SCHEMA = obj({ knowledgeGraph: obj({ nodes: list(node), edges: list(edge) }), socialThreads: { type: "array", items: thread, minItems: 6, maxItems: 6 } });

const triage = obj({ featureName: str, verdict: choices("CORE_WEDGE_KEEP", "TRIM_SCOPE", "KILL_MANUAL_UI", "REPURPOSE", "PHASE_1_AI_BUILD", "PHASE_2_ODM_OR_MARKETPLACE"), humanEffortRating: choices("ZERO_PASSIVE", "ONE_TIME_SETUP", "HIGH_DAILY_MANUAL"), predicted14DayRetentionPercent: num, strategicRationale: str, executionFix: str, dataFlywheelRole: choices("INGESTION_WEDGE", "GROUND_TRUTH_LABELER", "MONETIZATION_ENGINE", "DEAD_WEIGHT") });
const flywheel = obj({ stageNumber: { type: "integer", enum: [1, 2, 3, 4] }, stageTitle: str, mechanismDescription: str, structuredDataCaptured: list(str), outputToNextStage: str });
const month = obj({ month: choices("MONTH_1", "MONTH_2", "MONTH_3"), focusTitle: str, concreteDeliverables: list(str) });
const metric = obj({ segmentName: str, valuation2026: str, cagrPercent: str, projectedValuation: str, keyTakeawayForPitch: str });
const vc = obj({ firmName: str, tier: choices("LOCAL_REGIONAL_SEA_PH", "GLOBAL_SPECIALIST"), stageAndCheckSize: str, notableComparablePortfolio: str, whyTheyFitAndPitchAngle: str });

export const VENTURE_SCHEMA = obj({
  executiveDiagnosis: str, overallViabilityScoreRaw: num, overallViabilityScorePivoted: num,
  recommendedGodsEyePivotSummary: str, featureTriageMatrix: list(triage),
  fourStageDataFlywheel: { type: "array", items: flywheel, minItems: 4, maxItems: 4 },
  ninetyDayActionPlan: { type: "array", items: month, minItems: 3, maxItems: 3 },
  marketResearch: obj({ metrics: list(metric), regionalCompetitors: list(str), globalBenchmarks: list(str), unfairLocalEdge: str }),
  vcPipeline: list(vc),
});

const deltaFields = obj({
  id: int, round3Day30Action: action, round3Day30ReactionNote: str,
  willingnessToPayMonthlyUsdDay30: num, finalLifecycleStatus: lifecycle, episodicMemoryEntry: str,
});
export const deltaSchema = (size = 20) => obj({ deltas: { type: "array", items: deltaFields, minItems: size, maxItems: size } });
export const DELTA_SCHEMA = deltaSchema(20);

export const DISCOVERY_SCHEMA = obj({
  startupName: str, oneLinePitch: str, targetCustomer: str, targetGeography: str,
  businessModel: str, proposedPricing: str, currentTraction: str, unfairAdvantages: str,
});
export const GUIDE_JSON_SCHEMA = obj({ reply: str });
