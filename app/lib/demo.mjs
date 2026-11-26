import { PAWS_INPUT, DEMO_VENTURE, DEMO_ONTOLOGY } from "./demo-data.mjs";

const FIRST = ["Paolo", "Cheska", "Miguel", "Andrea", "Luis", "Beatriz", "Gabriel", "Rafael", "Sofia", "Diego", "Carla", "Nicole", "Marco", "Bianca", "Jasmine", "Adrian", "Katrina", "Enzo", "Patricia", "Joaquin"];
const LAST = ["Santos", "Cruz", "Ramos", "Garcia", "Lim"];
const CITIES = ["BGC, Taguig", "Ortigas, Pasig", "Quezon City", "Makati", "Marikina", "Cebu City", "Mandaluyong", "Alabang, Muntinlupa", "Pasay", "Davao City"];
const PETS = ["two senior French Bulldogs with skin allergies", "a rescue Aspin with separation anxiety", "a senior Persian cat with kidney concerns", "an energetic Shih Tzu puppy", "a diabetic Miniature Poodle", "three rescue cats and a crowded medication schedule", "a young Golden Retriever in obedience training", "an anxious Dachshund with recurring back issues", "a Persian cat due for vaccinations", "a senior Labrador with mobility problems"];
const DAY1_BOUNCE = new Set([6, 18, 27, 39, 46, 58, 63, 74, 82, 87, 93, 96, 98, 100]);
const DAY14_ACTIVE = new Set([1,2,3,4,5,6,7,8,9,10,11,12,16,21,29,36,44,52,55,67,73,85,92,97]);
const RAW_PAYING = new Set([1,3,5,8,16,44,67,92]);
const DAY30_CHURN = new Set([6,14,18,24,27,34,39,43,46,47,56,58,63,65,74,76,81,82,87,89,91,93,94,95,96,97,98,99,100]);
const ACTIVE_AFTER = Array.from({ length: 100 }, (_, i) => i + 1).filter((id) => !DAY30_CHURN.has(id));
const PAYING_AFTER = new Set(ACTIVE_AFTER.filter((id) => id % 3 !== 0).slice(0, 31));

function archetypeFor(id) {
  if (id <= 15) return "HAIR_ON_FIRE_POWER_USER";
  if (id <= 50) return "PRAGMATIC_URBAN_MAINSTREAM";
  if (id <= 70) return "SKEPTICAL_INCUMBENT_LOYALIST";
  if (id <= 90) return "PRICE_SENSITIVE_FREE_RIDER";
  return "B2B_SUPPLY_SIDE_PARTNER";
}

export function createDemoPersona(id) {
  const archetype = archetypeFor(id);
  const name = id === 55 ? "Jasmine Aquino" : `${FIRST[(id - 1) % FIRST.length]} ${LAST[Math.floor((id - 1) / 20)]}`;
  const city = CITIES[(id * 7) % CITIES.length];
  const isB2b = archetype === "B2B_SUPPLY_SIDE_PARTNER";
  const occupation = isB2b ? ["Veterinary clinic owner", "Licensed veterinarian", "Professional pet sitter", "Pet event organizer", "Clinic reception manager"][id % 5] : ["Product designer", "Call center team lead", "Freelance photographer", "Bank analyst", "Restaurant supervisor", "Software engineer", "Online seller", "Nurse", "Teacher", "Operations manager"][id % 10];
  const bouncedDay1 = DAY1_BOUNCE.has(id);
  const activeDay14 = DAY14_ACTIVE.has(id);
  const churnedFinal = DAY30_CHURN.has(id);
  const payingFinal = PAYING_AFTER.has(id);
  const rawPaid = RAW_PAYING.has(id);
  const context = isB2b ? `${occupation} serving ${18 + (id % 6) * 7} pet owners weekly in ${city}; care quality and front-desk time determine whether a new tool survives` : `${occupation.toLowerCase()} in ${city}, caring for ${PETS[(id - 1) % PETS.length]}; weekdays are compressed and clinic spending must solve a visible problem`;
  const favorite = ["QR Social Events", "Digital Health Card", "OCR health-record capture", "Partner Vet E-Consulta"][id % 4];
  const hated = id % 5 === 0 ? "Pet Social Network" : id % 3 === 0 ? "Manual Activity Tracking" : "Manual Health Analytics";
  const day1Action = bouncedDay1 ? "BOUNCE_IMMEDIATELY" : id % 4 === 0 ? "ADOPT_AND_EVANGELIZE" : "ADOPT_PASSIVELY";
  const day2Action = rawPaid ? "CONVERT_TO_PAID" : activeDay14 ? "ADOPT_PASSIVELY" : bouncedDay1 ? "BOUNCE_IMMEDIATELY" : id % 3 === 0 ? "POST_FRICTION_COMPLAINT" : "INFLUENCED_TO_CHURN";
  const day3Action = payingFinal ? "CONVERT_TO_PAID" : churnedFinal ? "INFLUENCED_TO_CHURN" : "ADOPT_PASSIVELY";
  const status = churnedFinal ? "CHURNED_PERMANENTLY" : payingFinal ? "PAYING_CHAMPION" : "FREE_ACTIVE_DATA_CONTRIBUTOR";
  const day1Note = bouncedDay1 ? "Another general pet feed did not earn a new habit." : "The event check-in and booklet scan delivered value before any setup marathon.";
  const day2Note = activeDay14 ? "I kept the health record but ignored the routine logging prompts." : "The repeated typing and critique thread made this feel like unpaid admin work.";
  const day3Note = churnedFinal ? "The idea as described still does not fit my habit or budget." : payingFinal ? "The current product's utility gives me a reason to pay." : "I continue using the event and health-record utility without a new product change.";
  return {
    id, name, age: isB2b ? 31 + (id % 22) : 23 + (id % 24), locationCity: city, occupation,
    monthlyDisposableBudgetLocal: isB2b ? `PHP ${12000 + (id % 5) * 5000} operating tools budget` : `PHP ${1500 + (id % 8) * 750} discretionary budget`,
    archetype, socialInfluenceRole: id % 9 === 0 ? "VOCAL_KOL" : id % 3 === 0 ? "ACTIVE_COMMENTER" : "SILENT_LURKER",
    specificIdentityContext: context,
    incumbentToolsUsed: isB2b ? ["Clinic spreadsheet", "Viber", "Paper appointment book"] : ["Facebook Breed Group", "Instagram", "Paper Vet Booklet", id % 2 ? "Viber clinic chat" : "Google Sheets"],
    round1Day1Action: day1Action, round1ReactionNote: day1Note,
    round2Day14ActionRawIdea: day2Action, round2SocialContagionNote: day2Note,
    round3Day30Action: day3Action, round3Day30ReactionNote: day3Note,
    episodicMemoryLog: [`Day 1: ${day1Note}`, `Day 14: ${day2Note}`, `Day 30: ${day3Note}`],
    favoriteFeature: favorite, mostHatedFeature: hated,
    willingnessToPayMonthlyUsdDay14: rawPaid ? 5 : activeDay14 ? 2 : 0,
    willingnessToPayMonthlyUsdDay30: payingFinal ? 6 : 0,
    finalLifecycleStatus: status,
  };
}

import { computeTelemetry } from "./telemetry.mjs";

export function createDemoSimulation() {
  const personas = Array.from({ length: 100 }, (_, index) => createDemoPersona(index + 1));
  const telemetry = computeTelemetry(personas);
  return {
    id: "demo-pawsmatch",
    demo: true,
    createdAt: "2026-11-18T09:00:00.000Z",
    input: structuredClone(PAWS_INPUT),
    ontology: structuredClone(DEMO_ONTOLOGY),
    ventureCritic: structuredClone(DEMO_VENTURE),
    personas,
    telemetry,
    pivotHistory: [],
    baselineMode: "unchanged",
    baselineTelemetry: telemetry,
  };
}
