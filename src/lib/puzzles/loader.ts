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

const QUESTION_BANK: Record<Exclude<PathId, "cs_random" | "gmat_full_test">, MCQQuestion[]> = {
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
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CS_PATH_IDS = new Set<PathId>([
  "cs_algorithms", "cs_theory", "cs_discrete_math", "cs_os_compilers",
  "cs_networks", "cs_cybersecurity", "cs_ml_ai", "cs_databases",
  "cs_data_science", "cs_software_engineering", "cs_graphics", "cs_hci",
]);

export function getQuestionsForPath(path: PathId, count?: number): MCQQuestion[] {
  if (path === "cs_random") {
    return shuffle(ALL_CS_QUESTIONS).slice(0, count ?? 20);
  }
  if (path === "gmat_full_test") {
    // Not used directly — GMAT test page loads sections individually
    return [];
  }

  const pool = QUESTION_BANK[path];

  // CS topics: always shuffle and serve 10 from the pool (pool may be 20+)
  if (CS_PATH_IDS.has(path)) {
    const n = count ?? 10;
    return shuffle(pool).slice(0, n);
  }

  // GMAT paths: serve all questions (or a subset if count specified)
  return count ? shuffle(pool).slice(0, count) : pool;
}

export function getAllPaths(): PathId[] {
  return [...Object.keys(QUESTION_BANK) as Exclude<PathId, "cs_random">[], "cs_random" as PathId];
}
