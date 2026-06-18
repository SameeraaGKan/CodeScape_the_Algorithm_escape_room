export type AgentPersonality = "supportive" | "spoon_feeder" | "supervisor" | "friendly";

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
  status: "forming" | "ready" | "in_game" | "completed";
  createdAt: string;
};

export type PuzzleType =
  | "code_fill"
  | "cipher"
  | "recursion_trace"
  | "maze";

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
