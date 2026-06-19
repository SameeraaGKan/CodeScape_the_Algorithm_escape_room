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

const QUESTION_BANK: Record<Exclude<PathId, "cs_random">, MCQQuestion[]> = {
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

export function getQuestionsForPath(path: PathId, count?: number): MCQQuestion[] {
  let pool: MCQQuestion[];

  if (path === "cs_random") {
    pool = shuffle(ALL_CS_QUESTIONS).slice(0, count ?? 20);
  } else {
    pool = QUESTION_BANK[path];
    if (count) pool = shuffle(pool).slice(0, count);
  }

  return pool;
}

export function getAllPaths(): PathId[] {
  return [...Object.keys(QUESTION_BANK) as Exclude<PathId, "cs_random">[], "cs_random" as PathId];
}
