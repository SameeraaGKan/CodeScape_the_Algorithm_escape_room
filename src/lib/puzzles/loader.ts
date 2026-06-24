import type { MCQQuestion, PathId } from "@/types";
import { algorithmsQuestions } from "./data/cs/algorithms";
import { theoryQuestions } from "./data/cs/theory";
import { discreteMathQuestions } from "./data/cs/discrete-math";
import { osCompilersQuestions } from "./data/cs/os-compilers";
import { networksQuestions } from "./data/cs/networks";
import { cybersecurityQuestions } from "./data/cs/cybersecurity";
import { mlAiQuestions } from "./data/cs/ml-ai";
import { databasesQuestions } from "./data/cs/databases";
import { dataScienceQuestions } from "./data/cs/data-science";
import { softwareEngineeringQuestions } from "./data/cs/software-engineering";
import { graphicsQuestions } from "./data/cs/graphics";
import { hciQuestions } from "./data/cs/hci";
import { gmatQuantQuestions } from "./data/gmat/quant";
import { gmatVerbalQuestions } from "./data/gmat/verbal";
import { gmatDataInsightsQuestions } from "./data/gmat/data-insights";
import {
  gmatQuantArithmeticQuestions,
  gmatQuantAlgebraQuestions,
  gmatQuantGeometryQuestions,
  gmatQuantWordProblemsQuestions,
  gmatQuantNumberTheoryQuestions,
  gmatQuantStatisticsQuestions,
  gmatQuantCombinatoricsQuestions,
  gmatQuantCoordinateGeoQuestions,
  gmatQuantFunctionsQuestions,
  gmatQuantProbabilityQuestions,
  allGmatQuantTopicQuestions,
} from "./data/gmat/quant-topics";

// Flat lookup of every MCQ question by its id — used by the agent chat API
export const ALL_MCQ_BY_ID: Record<string, MCQQuestion> = {};

const ALL_CS_QUESTIONS: MCQQuestion[] = [
  ...algorithmsQuestions,
  ...theoryQuestions,
  ...discreteMathQuestions,
  ...osCompilersQuestions,
  ...networksQuestions,
  ...cybersecurityQuestions,
  ...mlAiQuestions,
  ...databasesQuestions,
  ...dataScienceQuestions,
  ...softwareEngineeringQuestions,
  ...graphicsQuestions,
  ...hciQuestions,
];

// Populate the lookup — includes all CS + GMAT questions
[
  ...ALL_CS_QUESTIONS,
  ...gmatQuantQuestions,
  ...gmatVerbalQuestions,
  ...gmatDataInsightsQuestions,
  ...allGmatQuantTopicQuestions,
].forEach(q => { ALL_MCQ_BY_ID[q.id] = q; });

type BankPathId = Exclude<PathId,
  | "cs_random" | "gmat_full_test"
  | "gmat_test_1" | "gmat_test_2" | "gmat_test_3" | "gmat_test_4" | "gmat_test_5"
  | "gmat_test_6" | "gmat_test_7" | "gmat_test_8" | "gmat_test_9" | "gmat_test_10"
>;

const QUESTION_BANK: Record<BankPathId, MCQQuestion[]> = {
  cs_algorithms: algorithmsQuestions,
  cs_theory: theoryQuestions,
  cs_discrete_math: discreteMathQuestions,
  cs_os_compilers: osCompilersQuestions,
  cs_networks: networksQuestions,
  cs_cybersecurity: cybersecurityQuestions,
  cs_ml_ai: mlAiQuestions,
  cs_databases: databasesQuestions,
  cs_data_science: dataScienceQuestions,
  cs_software_engineering: softwareEngineeringQuestions,
  cs_graphics: graphicsQuestions,
  cs_hci: hciQuestions,
  gmat_quant: gmatQuantQuestions,
  gmat_verbal: gmatVerbalQuestions,
  gmat_data_insights: gmatDataInsightsQuestions,
  gmat_quant_arithmetic: gmatQuantArithmeticQuestions,
  gmat_quant_algebra: gmatQuantAlgebraQuestions,
  gmat_quant_geometry: gmatQuantGeometryQuestions,
  gmat_quant_word_problems: gmatQuantWordProblemsQuestions,
  gmat_quant_number_theory: gmatQuantNumberTheoryQuestions,
  gmat_quant_statistics: gmatQuantStatisticsQuestions,
  gmat_quant_combinatorics: gmatQuantCombinatoricsQuestions,
  gmat_quant_coordinate_geo: gmatQuantCoordinateGeoQuestions,
  gmat_quant_functions: gmatQuantFunctionsQuestions,
  gmat_quant_probability: gmatQuantProbabilityQuestions,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function seededRandom(seed: string) {
  // FNV-1a hash for seed → xorshift32 PRNG
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (Math.imul(h, 16777619)) >>> 0;
  }
  return function () {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5;
    h = h >>> 0;
    return h / 0x100000000;
  };
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  const rng = seededRandom(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CS_PATH_IDS = new Set<PathId>([
  "cs_algorithms", "cs_theory", "cs_discrete_math", "cs_os_compilers",
  "cs_networks", "cs_cybersecurity", "cs_ml_ai", "cs_databases",
  "cs_data_science", "cs_software_engineering", "cs_graphics", "cs_hci",
]);

export function getQuestionsForPath(path: PathId, count?: number, seed?: string): MCQQuestion[] {
  const shuffleFn = seed
    ? (arr: MCQQuestion[]) => seededShuffle(arr, seed)
    : shuffle;

  if (path === "cs_random") {
    return shuffleFn(ALL_CS_QUESTIONS).slice(0, count ?? 20);
  }
  if (path === "gmat_full_test" || path.startsWith("gmat_test_")) {
    // Not used directly — GMAT test page loads sections individually by path
    return [];
  }

  const pool = QUESTION_BANK[path as BankPathId];

  // CS topics: always shuffle and serve 10 from the pool (pool may be 20+)
  if (CS_PATH_IDS.has(path)) {
    const n = count ?? 10;
    return shuffleFn(pool).slice(0, n);
  }

  // GMAT paths: serve all questions (or a subset if count specified)
  return count ? shuffleFn(pool).slice(0, count) : (seed ? shuffleFn(pool) : pool);
}

export function getAllPaths(): PathId[] {
  return [...Object.keys(QUESTION_BANK) as Exclude<PathId, "cs_random">[], "cs_random" as PathId];
}
