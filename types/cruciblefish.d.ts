export interface StartupValidationInput {
  startupName: string;
  websiteUrl?: string;
  oneLinePitch: string;
  targetCustomer: string;
  businessModel?: string;
  targetGeography?: string;
  currentTraction?: string;
  currentFeatures?: Array<{ id: string; name: string; description: string; isManualInputRequired: boolean }>;
  plannedRoadmapFeatures?: Array<{ id: string; name: string; description: string; category: "AI_VISION" | "HARDWARE_WEARABLE" | "TELEHEALTH" | "MARKETPLACE" | "OTHER" }>;
  unfairAdvantages?: string;
  proposedPricing?: string;
  seedMaterial?: string;
}
export type PersonaArchetype = "HAIR_ON_FIRE_POWER_USER" | "PRAGMATIC_URBAN_MAINSTREAM" | "SKEPTICAL_INCUMBENT_LOYALIST" | "PRICE_SENSITIVE_FREE_RIDER" | "B2B_SUPPLY_SIDE_PARTNER";
export type SocialInfluenceRole = "VOCAL_KOL" | "ACTIVE_COMMENTER" | "SILENT_LURKER";
export type RoundAction = "ADOPT_AND_EVANGELIZE" | "ADOPT_PASSIVELY" | "POST_FRICTION_COMPLAINT" | "INFLUENCED_TO_CHURN" | "BOUNCE_IMMEDIATELY" | "CONVERT_TO_PAID";
export type LifecycleStatus = "PAYING_CHAMPION" | "FREE_ACTIVE_DATA_CONTRIBUTOR" | "SAVED_BY_GODS_EYE_PIVOT" | "CHURNED_PERMANENTLY";
export interface KnowledgeGraphNode {
  id: string;
  label: string;
  nodeType: "FEATURE_CURRENT" | "FEATURE_PLANNED" | "INCUMBENT_HABIT" | "FRICTION_POINT" | "DATA_ASSET" | "SUPPLY_PARTNER";
  effortOrFrictionScore: number;
  standaloneValueScore: number;
  notes: string;
}
export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  relationship: "REQUIRES_MANUAL_EFFORT" | "COMPETES_WITH_INCUMBENT" | "CAPTURES_DATA_FOR" | "MONETIZES_VIA" | "CAUSES_CHURN_IN";
  weight: number;
}
export interface SimulatedSocialThread {
  threadId: string;
  round: 1 | 2 | 3;
  channel: "SHORT_FORM_TIKTOK_X" | "COMMUNITY_REDDIT_FB_GROUP";
  authorPersonaId: number;
  authorName: string;
  authorArchetype: PersonaArchetype;
  postTitleOrHook: string;
  postBody: string;
  upvotes: number;
  replyCount: number;
  sentiment: "VIRAL_PRAISE" | "SKEPTICAL_CRITIQUE" | "CHURN_CASCADE_TRIGGER";
  triggeredByFeature: string;
  influencedPersonaIds: number[];
}
export interface FeatureTriageItem {
  featureName: string;
  verdict: "CORE_WEDGE_KEEP" | "TRIM_SCOPE" | "KILL_MANUAL_UI" | "REPURPOSE" | "PHASE_1_AI_BUILD" | "PHASE_2_ODM_OR_MARKETPLACE";
  humanEffortRating: "ZERO_PASSIVE" | "ONE_TIME_SETUP" | "HIGH_DAILY_MANUAL";
  predicted14DayRetentionPercent: number;
  strategicRationale: string;
  executionFix: string;
  dataFlywheelRole: "INGESTION_WEDGE" | "GROUND_TRUTH_LABELER" | "MONETIZATION_ENGINE" | "DEAD_WEIGHT";
}
export interface DataFlywheelStage {
  stageNumber: 1 | 2 | 3 | 4;
  stageTitle: string;
  mechanismDescription: string;
  structuredDataCaptured: string[];
  outputToNextStage: string;
}
export interface MarketSegmentStat {
  segmentName: string;
  valuation2026: string;
  cagrPercent: string;
  projectedValuation: string;
  keyTakeawayForPitch: string;
}
export interface VCTargetMatch {
  firmName: string;
  tier: "LOCAL_REGIONAL_SEA_PH" | "GLOBAL_SPECIALIST";
  stageAndCheckSize: string;
  notableComparablePortfolio: string;
  whyTheyFitAndPitchAngle: string;
}
export interface VentureCriticOutput {
  executiveDiagnosis: string;
  overallViabilityScoreRaw: number;
  overallViabilityScorePivoted: number;
  recommendedGodsEyePivotSummary: string;
  featureTriageMatrix: FeatureTriageItem[];
  fourStageDataFlywheel: DataFlywheelStage[];
  ninetyDayActionPlan: Array<{ month: "MONTH_1" | "MONTH_2" | "MONTH_3"; focusTitle: string; concreteDeliverables: string[] }>;
  marketResearch: {
    metrics: MarketSegmentStat[];
    regionalCompetitors: string[];
    globalBenchmarks: string[];
    unfairLocalEdge: string;
  };
  vcPipeline: VCTargetMatch[];
}
export interface SimulatedCustomerPersona {
  id: number;
  name: string;
  age: number;
  locationCity: string;
  occupation: string;
  monthlyDisposableBudgetLocal: string;
  archetype: PersonaArchetype;
  socialInfluenceRole: SocialInfluenceRole;
  specificIdentityContext: string;
  incumbentToolsUsed: string[];
  round1Day1Action: RoundAction;
  round1ReactionNote: string;
  round2Day14ActionRawIdea: RoundAction;
  round2SocialContagionNote: string;
  round3Day30Action: RoundAction;
  round3Day30ReactionNote: string;
  round3Day30ActionAfterPivot?: RoundAction;
  round3PivotReactionNote?: string;
  episodicMemoryLog: [string, string, string];
  favoriteFeature: string;
  mostHatedFeature: string;
  willingnessToPayMonthlyUsdDay14: number;
  willingnessToPayMonthlyUsdDay30: number;
  willingnessToPayMonthlyUsdBeforePivot?: number;
  willingnessToPayMonthlyUsdAfterPivot?: number;
  baselineDay30?: { action: RoundAction; note: string; willingnessToPay: number; lifecycleStatus: LifecycleStatus; memory: string };
  finalLifecycleStatus: LifecycleStatus;
}
export interface SwarmTelemetry {
  customerCount: number;
  day1Adoption: number;
  day14Active: number;
  day30Active: number;
  retentionLift: number;
  day14Paying: number;
  day30Paying: number;
  day14MonthlyGmv: number;
  day30MonthlyGmv: number;
  /** Legacy metric aliases retained for runs saved by older versions. */
  rawPaying: number;
  pivotedPaying: number;
  rawMonthlyGmv: number;
  pivotedMonthlyGmv: number;
  topChurnTrigger: { feature: string; count: number };
  topViralHook: { feature: string; count: number };
  statusCounts: Record<LifecycleStatus, number>;
}
export interface CrucibleSimulationResult {
  id: string;
  demo: boolean;
  createdAt: string;
  input: StartupValidationInput;
  ontology: {
    knowledgeGraph: { nodes: KnowledgeGraphNode[]; edges: KnowledgeGraphEdge[] };
    socialThreads: SimulatedSocialThread[];
  };
  ventureCritic: VentureCriticOutput;
  personas: SimulatedCustomerPersona[];
  telemetry: SwarmTelemetry;
  baselineMode?: "unchanged";
  baselineTelemetry?: SwarmTelemetry;
  comparisonLabel?: string;
  activePivot?: string;
  pivotHistory: Array<{ pivot: string; at: string }>;
}
export interface GuideCharacter {
  name: string;
  role: string;
  personality: string;
}
export interface ProviderSettings {
  apiKey: string;
  model: string;
  fastModel: string;
  baseUrl: string;
  rememberKeys?: boolean;
}
