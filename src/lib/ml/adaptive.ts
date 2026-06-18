/**
 * Item Response Theory (IRT) — 1-Parameter Logistic Model
 *
 * P(correct) = 1 / (1 + exp(-(θ - b)))
 * θ = player ability (starts at 0, updated after each attempt)
 * b = puzzle difficulty parameter
 *
 * After each attempt, θ is updated using the ELO-style update:
 * θ_new = θ + learningRate * (actual - P(correct))
 */

import type { PuzzleCategory } from "@/types";

const DIFFICULTY_PARAMS: Record<string, number> = {
  caesar_cipher_01: -1.0,   // easy
  bubble_sort_01: -0.5,     // easy-medium
  binary_search_01: 0.5,    // medium
  stack_brackets_01: 0.5,   // medium
  factorial_trace_01: 1.0,  // medium-hard
  bfs_maze_01: 2.0,         // hard
};

const CATEGORY_MAP: Record<string, PuzzleCategory> = {
  caesar_cipher_01: "cipher",
  bubble_sort_01: "sorting",
  binary_search_01: "sorting",
  stack_brackets_01: "data_structures",
  factorial_trace_01: "recursion",
  bfs_maze_01: "maze",
};

const LEARNING_RATE = 0.3;

export function getProbability(theta: number, difficulty: number): number {
  return 1 / (1 + Math.exp(-(theta - difficulty)));
}

export function updateTheta(
  currentTheta: number,
  puzzleId: string,
  isCorrect: boolean,
  hintsUsed: number,
  timeTakenSeconds: number,
  timeLimitSeconds: number
): number {
  const b = DIFFICULTY_PARAMS[puzzleId] ?? 0;
  const pCorrect = getProbability(currentTheta, b);
  const actual = isCorrect ? 1 : 0;

  // Penalize heavy hint usage and slow completion even on correct answers
  const hintPenalty = isCorrect ? hintsUsed * 0.05 : 0;
  const timePenalty = isCorrect
    ? Math.max(0, (timeTakenSeconds / timeLimitSeconds - 0.5) * 0.1)
    : 0;

  const delta = LEARNING_RATE * (actual - pCorrect) - hintPenalty - timePenalty;
  const newTheta = currentTheta + delta;

  // Clamp theta to a reasonable range [-3, 3]
  return Math.max(-3, Math.min(3, newTheta));
}

export function selectNextPuzzle(
  theta: number,
  category: PuzzleCategory,
  completedPuzzleIds: string[]
): string | null {
  const candidates = Object.entries(DIFFICULTY_PARAMS)
    .filter(
      ([id]) =>
        CATEGORY_MAP[id] === category && !completedPuzzleIds.includes(id)
    )
    .map(([id, b]) => ({
      id,
      // Select puzzle closest to player's ability (maximum information)
      info: Math.abs(theta - b),
    }))
    .sort((a, b) => a.info - b.info);

  return candidates[0]?.id ?? null;
}

export function getDifficultyParam(puzzleId: string): number {
  return DIFFICULTY_PARAMS[puzzleId] ?? 0;
}

export function getCategoryForPuzzle(puzzleId: string): PuzzleCategory {
  return CATEGORY_MAP[puzzleId] ?? "sorting";
}
