export const PAWS_INPUT = {
  startupName: "PawsMatch",
  websiteUrl: "https://pawsbook.pet",
  oneLinePitch: "A pet-care network that turns offline community events and health records into AI-guided veterinary support.",
  targetCustomer: "Pet owners in Metro Manila who already join offline pet events and still keep a paper veterinary booklet.",
  targetGeography: "Metro Manila, Philippines & Southeast Asia",
  currentTraction: "3,000+ organic users via offline QR pet events (founder-supplied, unverified).",
  currentFeatures: [
    { id: "social", name: "Pet Social Network", description: "Pet profiles, photo posts, and a general social feed.", isManualInputRequired: true },
    { id: "communities", name: "Communities", description: "Breed and neighborhood discussion groups.", isManualInputRequired: true },
    { id: "events", name: "QR Social Events", description: "Event discovery and QR check-ins for offline pet gatherings.", isManualInputRequired: false },
    { id: "search", name: "AI Search", description: "Natural-language search across pets, events, and care content.", isManualInputRequired: false },
    { id: "health-card", name: "Digital Health Card", description: "A shareable record built by scanning the physical vet booklet.", isManualInputRequired: false },
    { id: "health-analytics", name: "Manual Health Analytics", description: "Daily symptom and vital-sign entry with trend charts.", isManualInputRequired: true },
    { id: "activity", name: "Manual Activity Tracking", description: "Typed walk, food, and activity logs.", isManualInputRequired: true },
    { id: "breed", name: "Breed Health Insights", description: "Structured breed-level health patterns and benchmarks.", isManualInputRequired: false },
  ],
  plannedRoadmapFeatures: [
    { id: "wearable", name: "Simple Cheap Wearables", description: "Low-cost BLE activity tag with QR identity.", category: "HARDWARE_WEARABLE" },
    { id: "vision", name: "Computer Vision Home Triage", description: "Photo-based triage with clear escalation limits.", category: "AI_VISION" },
    { id: "consult", name: "AI Virtual Vet E-Consulta", description: "AI-assisted intake handed to a licensed veterinarian.", category: "TELEHEALTH" },
    { id: "sitters", name: "Temperament-Matched Sitter Marketplace", description: "Sitter routing based on verified pet temperament and service history.", category: "MARKETPLACE" },
  ],
  unfairAdvantages: "Direct veterinary clinic network connections and a zero-CAC offline event loop (founder-supplied).",
  businessModel: "Freemium B2C: pet owners use social, events and records for free; revenue comes from one-time paid vet e-consults (PHP 299) and BLE tags (PHP 599). Clinics and sitters are supply-side partners, not payers in the raw model.",
  proposedPricing: "Free social/events; PHP 299 one-time Vet E-Consult; PHP 599 one-time BLE Tag",
  seedMaterial: "Illustrative founder notes (not verified research): 12 of 15 observed event attendees still kept a paper vet booklet; three partner clinics agreed to a structured-intake pilot.",
};

const triage = (featureName, verdict, humanEffortRating, predicted14DayRetentionPercent, strategicRationale, executionFix, dataFlywheelRole) => ({ featureName, verdict, humanEffortRating, predicted14DayRetentionPercent, strategicRationale, executionFix, dataFlywheelRole });
export const DEMO_FEATURES = [
  triage("Pet Social Network", "TRIM_SCOPE", "HIGH_DAILY_MANUAL", 18, "A generic feed competes with established habits and starts empty.", "Keep utility alerts, event memories, and structured pet profiles; remove the general posting feed.", "DEAD_WEIGHT"),
  triage("Communities", "TRIM_SCOPE", "HIGH_DAILY_MANUAL", 31, "Breed groups already live inside incumbent social platforms.", "Support event cohorts and lost-pet alerts instead of another destination forum.", "INGESTION_WEDGE"),
  triage("QR Social Events", "CORE_WEDGE_KEEP", "ZERO_PASSIVE", 86, "Offline check-ins create immediate utility and a low-CAC identity graph.", "Make check-in unlock the health-card scan and a useful event follow-up.", "INGESTION_WEDGE"),
  triage("AI Search", "TRIM_SCOPE", "ZERO_PASSIVE", 43, "Search is useful only after structured records and partner inventory exist.", "Constrain search to records, events, and bookable care rather than generic chat.", "INGESTION_WEDGE"),
  triage("Digital Health Card", "CORE_WEDGE_KEEP", "ONE_TIME_SETUP", 82, "A portable record solves a real handoff problem without daily typing.", "Use OCR plus owner confirmation and preserve document provenance.", "GROUND_TRUTH_LABELER"),
  triage("Manual Health Analytics", "KILL_MANUAL_UI", "HIGH_DAILY_MANUAL", 9, "Daily symptom typing is a Day-14 churn trigger.", "Replace routine entry with document scans, event data, and opt-in passive signals.", "DEAD_WEIGHT"),
  triage("Manual Activity Tracking", "KILL_MANUAL_UI", "HIGH_DAILY_MANUAL", 7, "Typed walks duplicate effort with no instant reward.", "Use phone motion or an opt-in low-cost BLE tag after the software loop works.", "DEAD_WEIGHT"),
  triage("Breed Health Insights", "PHASE_1_AI_BUILD", "ZERO_PASSIVE", 64, "Benchmarks become defensible when linked to verified outcomes.", "Show cohort context only after enough consented, clinically labeled records exist.", "GROUND_TRUTH_LABELER"),
  triage("Simple Cheap Wearables", "PHASE_2_ODM_OR_MARKETPLACE", "ONE_TIME_SETUP", 58, "Passive activity is useful but custom hardware is not the first wedge.", "Pilot a white-label BLE/IMU tag after retention is proven; avoid custom PCB work.", "INGESTION_WEDGE"),
  triage("Computer Vision Home Triage", "PHASE_1_AI_BUILD", "ZERO_PASSIVE", 69, "Photo triage can reduce uncertainty when escalation is explicit.", "Return uncertainty and route concerning cases to licensed partners; never overstate diagnosis.", "GROUND_TRUTH_LABELER"),
  triage("AI Virtual Vet E-Consulta", "PHASE_1_AI_BUILD", "ZERO_PASSIVE", 76, "Verified consultations close the outcome loop and create a clear payment moment.", "Use AI for intake and SOAP drafting while a licensed vet owns the decision.", "MONETIZATION_ENGINE"),
  triage("Temperament-Matched Sitter Marketplace", "PHASE_2_ODM_OR_MARKETPLACE", "ONE_TIME_SETUP", 52, "Marketplace liquidity and trust are a second operational company.", "Pilot with a small managed partner cohort after pet identity and history are reliable.", "MONETIZATION_ENGINE"),
];

export const DEMO_FLYWHEEL = [
  { stageNumber: 1, stageTitle: "Earn the record", mechanismDescription: "QR event check-in leads into a ten-second vet-booklet OCR scan with owner confirmation.", structuredDataCaptured: ["Pet identity", "Vaccine dates", "Clinic provenance", "Event attendance"], outputToNextStage: "A portable, permissioned health baseline." },
  { stageNumber: 2, stageTitle: "Capture a concern", mechanismDescription: "A photo or passive activity change starts structured triage without routine manual logging.", structuredDataCaptured: ["Images", "Symptom answers", "Activity deviations"], outputToNextStage: "A triage packet with uncertainty and context." },
  { stageNumber: 3, stageTitle: "Verify the outcome", mechanismDescription: "A licensed partner vet reviews the packet and confirms or corrects the assessment.", structuredDataCaptured: ["SOAP assessment", "Diagnosis", "Treatment outcome"], outputToNextStage: "Clinically labeled ground truth and a paid consultation." },
  { stageNumber: 4, stageTitle: "Route the next action", mechanismDescription: "Verified needs trigger medication reminders, follow-ups, or a managed service referral.", structuredDataCaptured: ["Adherence", "Service fit", "Repeat outcomes"], outputToNextStage: "Useful retention and carefully scoped commerce." },
];

export const DEMO_VENTURE = {
  executiveDiagnosis: "PawsMatch has a credible acquisition wedge in offline events and portable health records, but the raw roadmap behaves like four startups at once. The immediate work is to remove routine typing and connect one verified care outcome before expanding into hardware or marketplace operations.",
  overallViabilityScoreRaw: 48,
  overallViabilityScorePivoted: 82,
  recommendedGodsEyePivotSummary: "Replace the generic feed and daily manual logs with QR event check-in plus OCR health-record capture. Route photo triage into a licensed vet e-consult, then use verified outcomes to power follow-ups and carefully scoped service referrals.",
  featureTriageMatrix: DEMO_FEATURES,
  fourStageDataFlywheel: DEMO_FLYWHEEL,
  ninetyDayActionPlan: [
    { month: "MONTH_1", focusTitle: "Prove the record wedge", concreteDeliverables: ["Instrument QR check-in to OCR completion", "Interview 15 event attendees", "Remove daily logging from the core navigation"] },
    { month: "MONTH_2", focusTitle: "Close one care loop", concreteDeliverables: ["Pilot structured intake with three partner clinics", "Measure vet confirmation and correction rates", "Publish escalation and consent rules"] },
    { month: "MONTH_3", focusTitle: "Test repeat value", concreteDeliverables: ["Launch record-based follow-ups", "Test one paid e-consult package", "Defer hardware until repeat usage meets the agreed threshold"] },
  ],
  marketResearch: {
    metrics: [
      { segmentName: "Philippines urban companion-pet care", valuation2026: "Illustrative model estimate: $420M", cagrPercent: "Illustrative: 8.2%", projectedValuation: "Illustrative 2030: $575M", keyTakeawayForPitch: "Build a bottom-up clinic-and-owner count before using this in a deck." },
      { segmentName: "Southeast Asia digital pet services", valuation2026: "Illustrative model estimate: $1.8B", cagrPercent: "Illustrative: 11.4%", projectedValuation: "Illustrative 2030: $2.8B", keyTakeawayForPitch: "Segment by serviceable cities and clinic supply rather than claiming the whole region." },
      { segmentName: "Global pet health technology", valuation2026: "Illustrative model estimate: $4.6B", cagrPercent: "Illustrative: 13.1%", projectedValuation: "Illustrative 2030: $7.5B", keyTakeawayForPitch: "Use only as a category benchmark; local willingness to pay remains the constraint." },
    ],
    regionalCompetitors: ["Facebook pet groups", "Independent clinic Viber chats", "General telehealth marketplaces"],
    globalBenchmarks: ["Modern Animal", "Airvet", "Whistle", "PetDesk"],
    unfairLocalEdge: "The founder-supplied clinic and offline event network can lower trust and acquisition friction if conversion is measured.",
  },
  vcPipeline: [
    { firmName: "Foxmont Capital Partners", tier: "LOCAL_REGIONAL_SEA_PH", stageAndCheckSize: "Illustrative fit: pre-seed to seed; verify current mandate", notableComparablePortfolio: "Philippines consumer and marketplace companies", whyTheyFitAndPitchAngle: "Lead with measured local network effects and clinic supply, not the global pet-tech TAM." },
    { firmName: "Kaya Founders", tier: "LOCAL_REGIONAL_SEA_PH", stageAndCheckSize: "Illustrative fit: early stage; verify current mandate", notableComparablePortfolio: "Regional early-stage technology companies", whyTheyFitAndPitchAngle: "Show founder-led distribution and the first repeatable paid care loop." },
    { firmName: "Leap Venture Studio", tier: "GLOBAL_SPECIALIST", stageAndCheckSize: "Illustrative fit: pet-care specialist; verify program timing", notableComparablePortfolio: "Companion-animal health and services", whyTheyFitAndPitchAngle: "Bring verified clinical outcomes and a credible partner expansion plan." },
    { firmName: "SOSV / HAX", tier: "GLOBAL_SPECIALIST", stageAndCheckSize: "Illustrative fit: only after a hardware milestone", notableComparablePortfolio: "Connected devices and health hardware", whyTheyFitAndPitchAngle: "Approach after the ODM pilot has retention, unit economics, and no custom-R&D trap." },
  ],
};

export const DEMO_ONTOLOGY = {
  knowledgeGraph: {
    nodes: [
      ...PAWS_INPUT.currentFeatures.map((feature, index) => ({ id: feature.id, label: feature.name, nodeType: "FEATURE_CURRENT", effortOrFrictionScore: feature.isManualInputRequired ? 9 : index === 2 ? 1 : 3, standaloneValueScore: ["events", "health-card"].includes(feature.id) ? 9 : feature.isManualInputRequired ? 3 : 6, notes: feature.description })),
      ...PAWS_INPUT.plannedRoadmapFeatures.map((feature) => ({ id: feature.id, label: feature.name, nodeType: "FEATURE_PLANNED", effortOrFrictionScore: feature.id === "wearable" ? 3 : 2, standaloneValueScore: ["consult", "vision"].includes(feature.id) ? 9 : 7, notes: feature.description })),
      { id: "fb-groups", label: "Facebook breed groups", nodeType: "INCUMBENT_HABIT", effortOrFrictionScore: 1, standaloneValueScore: 8, notes: "Existing community and advice habit." },
      { id: "paper-booklet", label: "Paper vet booklet", nodeType: "INCUMBENT_HABIT", effortOrFrictionScore: 2, standaloneValueScore: 9, notes: "Trusted physical record carried to clinics." },
      { id: "clinic-chat", label: "Clinic Viber chat", nodeType: "SUPPLY_PARTNER", effortOrFrictionScore: 2, standaloneValueScore: 9, notes: "Direct, familiar route to a known vet." },
      { id: "logging-fatigue", label: "Daily logging fatigue", nodeType: "FRICTION_POINT", effortOrFrictionScore: 10, standaloneValueScore: 1, notes: "Repeated effort precedes a visible reward." },
    ],
    edges: [
      { source: "activity", target: "logging-fatigue", relationship: "REQUIRES_MANUAL_EFFORT", weight: 10 },
      { source: "health-analytics", target: "logging-fatigue", relationship: "CAUSES_CHURN_IN", weight: 9 },
      { source: "social", target: "fb-groups", relationship: "COMPETES_WITH_INCUMBENT", weight: 9 },
      { source: "health-card", target: "paper-booklet", relationship: "CAPTURES_DATA_FOR", weight: 8 },
      { source: "vision", target: "consult", relationship: "MONETIZES_VIA", weight: 8 },
    ],
  },
  socialThreads: [
    { threadId: "t1", round: 1, channel: "SHORT_FORM_TIKTOK_X", authorPersonaId: 3, authorName: "Miguel Santos", authorArchetype: "HAIR_ON_FIRE_POWER_USER", postTitleOrHook: "My dog's paper booklet is finally searchable", postBody: "Scanned it after the mall event and had a clean record before I reached the car.", upvotes: 184, replyCount: 27, sentiment: "VIRAL_PRAISE", triggeredByFeature: "Digital Health Card", influencedPersonaIds: [16, 21, 29, 36, 44] },
    { threadId: "t2", round: 1, channel: "COMMUNITY_REDDIT_FB_GROUP", authorPersonaId: 55, authorName: "Jasmine Aquino", authorArchetype: "SKEPTICAL_INCUMBENT_LOYALIST", postTitleOrHook: "Another pet feed? I already have three groups", postBody: "The QR event is useful, but I do not want to rebuild every friend and group here.", upvotes: 76, replyCount: 19, sentiment: "SKEPTICAL_CRITIQUE", triggeredByFeature: "Pet Social Network", influencedPersonaIds: [46, 58, 63, 74] },
    { threadId: "t3", round: 2, channel: "COMMUNITY_REDDIT_FB_GROUP", authorPersonaId: 42, authorName: "Cheska Ramos", authorArchetype: "PRAGMATIC_URBAN_MAINSTREAM", postTitleOrHook: "I wanted help, not another daily chore", postBody: "Two weeks of typing walks and symptoms and the app still cannot tell me when to call my vet.", upvotes: 231, replyCount: 48, sentiment: "CHURN_CASCADE_TRIGGER", triggeredByFeature: "Manual Health Analytics", influencedPersonaIds: [18, 24, 27, 34, 39, 43, 47, 56, 65, 76] },
    { threadId: "t4", round: 2, channel: "SHORT_FORM_TIKTOK_X", authorPersonaId: 8, authorName: "Rafael Santos", authorArchetype: "HAIR_ON_FIRE_POWER_USER", postTitleOrHook: "Keep the scanner, lose the diary", postBody: "The health card saved our clinic visit. The daily tracker is the part I abandoned.", upvotes: 149, replyCount: 22, sentiment: "VIRAL_PRAISE", triggeredByFeature: "Digital Health Card", influencedPersonaIds: [1, 3, 5, 16, 44] },
    { threadId: "t5", round: 3, channel: "SHORT_FORM_TIKTOK_X", authorPersonaId: 42, authorName: "Cheska Ramos", authorArchetype: "PRAGMATIC_URBAN_MAINSTREAM", postTitleOrHook: "I came back for the event record", postBody: "The existing scan and health record are useful. I still do not miss the blank social feed.", upvotes: 207, replyCount: 31, sentiment: "VIRAL_PRAISE", triggeredByFeature: "Digital Health Card", influencedPersonaIds: [21, 29, 36, 52, 55, 67] },
    { threadId: "t6", round: 3, channel: "COMMUNITY_REDDIT_FB_GROUP", authorPersonaId: 92, authorName: "Nicole Lim", authorArchetype: "B2B_SUPPLY_SIDE_PARTNER", postTitleOrHook: "A portable record helps before a consult", postBody: "A clear health record helps our team prepare. We still control the medical decision and the owner relationship.", upvotes: 93, replyCount: 14, sentiment: "VIRAL_PRAISE", triggeredByFeature: "Digital Health Card", influencedPersonaIds: [85, 92, 97] },
  ],
};
