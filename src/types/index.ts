export type AgentPersonality = "supportive" | "spoon_feeder" | "supervisor" | "friendly";

export type PathId =
  | "cs_algorithms"
  | "cs_theory"
  | "cs_discrete_math"
  | "cs_os_compilers"
  | "cs_networks"
  | "cs_cybersecurity"
  | "cs_ml_ai"
  | "cs_databases"
  | "cs_data_science"
  | "cs_software_engineering"
  | "cs_graphics"
  | "cs_hci"
  | "gmat_quant"
  | "gmat_verbal"
  | "gmat_data_insights"
  | "cs_random"
  | "gmat_full_test"
  | "gmat_test_1"
  | "gmat_test_2"
  | "gmat_test_3"
  | "gmat_test_4"
  | "gmat_test_5"
  | "gmat_test_6"
  | "gmat_test_7"
  | "gmat_test_8"
  | "gmat_test_9"
  | "gmat_test_10"
  | "gmat_quant_arithmetic"
  | "gmat_quant_algebra"
  | "gmat_quant_geometry"
  | "gmat_quant_word_problems"
  | "gmat_quant_number_theory"
  | "gmat_quant_statistics"
  | "gmat_quant_combinatorics"
  | "gmat_quant_coordinate_geo"
  | "gmat_quant_functions"
  | "gmat_quant_probability";

export type MCQQuestion = {
  id: string;
  path: PathId;
  passage?: string; // RC passage displayed above question text
  question: string;
  options: readonly [string, string, string, string] | readonly [string, string, string, string, string];
  answer: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
};

export type SlotType = "human" | "agent";

export type TeamSlot = {
  slotIndex: number;
  type: SlotType;
  userId?: string;
  agentPersonality?: AgentPersonality;
  displayName: string;
  joinedAt?: string;
};

export type Team = {
  id: string;
  teamName: string;
  inviteCode: string;
  maxSize: number;
  slots: TeamSlot[];
  createdBy: string;
  selectedPath?: PathId;
  status: "forming" | "ready" | "in_game" | "completed";
  createdAt: string;
};

export type PuzzleType =
  | "code_fill"
  | "cipher"
  | "recursion_trace"
  | "maze"
  | "mcq";

export type PuzzleCategory =
  | "sorting"
  | "cipher"
  | "recursion"
  | "maze"
  | "data_structures";

export type PuzzleTestCase = {
  input: unknown;
  expected: unknown;
};

export type PuzzleSetup = {
  language?: string;
  starterCode?: string;
  blankPlaceholder?: string;
  testCases?: PuzzleTestCase[];
  ciphertext?: string;
  shiftHint?: string;
  code?: string;
  callToTrace?: string;
  blanksInStack?: { frameId: number; field: string }[];
  grid?: number[][];
  start?: [number, number];
  end?: [number, number];
  algorithm?: string;
};

export type Puzzle = {
  id: string;
  type: PuzzleType;
  category: PuzzleCategory;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  stage: number;
  description: string;
  setup: PuzzleSetup;
  hints: string[];
  maxAttempts: number;
  timeLimitSeconds: number;
  points: number;
  agentContext: string;
};

export type GameSession = {
  id: string;
  teamId: string;
  roomCode: string;
  puzzleSetId: string;
  currentPuzzleIndex: number;
  totalScore: number;
  status: "active" | "completed" | "abandoned";
  startedAt: string;
  completedAt?: string;
};

export type AgentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentPersonality?: AgentPersonality;
  timestamp: number;
};

export type PlayerSkill = {
  userId: string;
  category: PuzzleCategory;
  theta: number;
  totalAttempts: number;
};

export type PuzzleResult = {
  puzzleId: string;
  title: string;
  isCorrect: boolean;
  hintsUsed: number;
  timeTakenSeconds: number;
  score: number;
};
