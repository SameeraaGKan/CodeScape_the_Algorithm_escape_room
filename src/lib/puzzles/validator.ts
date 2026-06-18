import { PUZZLES } from "./data/puzzles";

type ValidationResult = {
  isCorrect: boolean;
  feedback?: string;
};

// Cipher: normalize and compare
function validateCipher(answer: unknown, puzzleId: string): ValidationResult {
  const normalized =
    typeof answer === "string" ? answer.trim().toUpperCase() : "";

  const ANSWERS: Record<string, string[]> = {
    caesar_cipher_01: ["HELLO WORLD"],
  };

  const valid = ANSWERS[puzzleId] ?? [];
  return {
    isCorrect: valid.includes(normalized),
    feedback: valid.includes(normalized)
      ? "Correct! The cipher is broken."
      : `"${normalized}" is not the decrypted message. Check your shift.`,
  };
}

// Code fill: compare the filled-in expression (trimmed, case-insensitive)
function validateCodeFill(answer: unknown, puzzleId: string): ValidationResult {
  const normalized =
    typeof answer === "string"
      ? answer.trim().replace(/\s+/g, " ").toLowerCase()
      : "";

  const ANSWERS: Record<string, string[]> = {
    bubble_sort_01: ["arr[j] > arr[j + 1]", "arr[j]>arr[j+1]"],
    binary_search_01: [
      "left + (right - left) // 2",
      "left+(right-left)//2",
      "(left + right) // 2",
      "(left+right)//2",
    ],
    stack_brackets_01: [
      "not stack or stack[-1] != pairs[char]",
      "not stack or stack[-1]!=pairs[char]",
      "len(stack) == 0 or stack[-1] != pairs[char]",
    ],
  };

  const valid = (ANSWERS[puzzleId] ?? []).map((a) =>
    a.replace(/\s+/g, " ").toLowerCase()
  );

  return {
    isCorrect: valid.includes(normalized),
    feedback: valid.includes(normalized)
      ? "Correct! System unlocked."
      : "Not quite. Check your logic and try again.",
  };
}

// Recursion trace: compare each blank field
function validateRecursionTrace(
  answer: unknown,
  puzzleId: string
): ValidationResult {
  const ANSWERS: Record<string, Record<string, string>> = {
    factorial_trace_01: { frame0: "1", frame2: "2", frame4: "24" },
  };

  if (typeof answer !== "object" || answer === null) {
    return { isCorrect: false, feedback: "Invalid answer format." };
  }

  const expected = ANSWERS[puzzleId] ?? {};
  const submitted = answer as Record<string, string>;

  for (const [key, val] of Object.entries(expected)) {
    if (submitted[key]?.trim() !== val) {
      return {
        isCorrect: false,
        feedback: `Frame ${key.replace("frame", "")} is incorrect. Retrace the calls.`,
      };
    }
  }

  return { isCorrect: true, feedback: "All frames correct! Recursion restored." };
}

// Maze: verify path is connected, avoids walls, starts and ends correctly
function validateMaze(answer: unknown, puzzleId: string): ValidationResult {
  const puzzle = PUZZLES[puzzleId];
  if (!puzzle || puzzle.type !== "maze" || !puzzle.setup.grid) {
    return { isCorrect: false };
  }

  const grid = puzzle.setup.grid;
  const [startR, startC] = puzzle.setup.start!;
  const [endR, endC] = puzzle.setup.end!;

  if (!Array.isArray(answer) || answer.length < 2) {
    return { isCorrect: false, feedback: "Path must have at least 2 points." };
  }

  const path = answer as [number, number][];
  const [pr, pc] = path[0];
  const [lr, lc] = path[path.length - 1];

  if (pr !== startR || pc !== startC) {
    return { isCorrect: false, feedback: "Path must start at the START cell." };
  }
  if (lr !== endR || lc !== endC) {
    return { isCorrect: false, feedback: "Path must end at the END cell." };
  }

  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) {
      return { isCorrect: false, feedback: `Cell [${r},${c}] is out of bounds.` };
    }
    if (grid[r][c] === 1) {
      return { isCorrect: false, feedback: `Cell [${r},${c}] is a wall.` };
    }
    if (i > 0) {
      const [pr2, pc2] = path[i - 1];
      const dr = Math.abs(r - pr2);
      const dc = Math.abs(c - pc2);
      if (dr + dc !== 1) {
        return {
          isCorrect: false,
          feedback: `Step from [${pr2},${pc2}] to [${r},${c}] is not adjacent.`,
        };
      }
    }
  }

  return { isCorrect: true, feedback: "Path valid! You escaped the maze." };
}

export function validateAnswer(
  puzzleId: string,
  answer: unknown
): ValidationResult {
  const puzzle = PUZZLES[puzzleId];
  if (!puzzle) return { isCorrect: false, feedback: "Unknown puzzle." };

  switch (puzzle.type) {
    case "cipher":
      return validateCipher(answer, puzzleId);
    case "code_fill":
      return validateCodeFill(answer, puzzleId);
    case "recursion_trace":
      return validateRecursionTrace(answer, puzzleId);
    case "maze":
      return validateMaze(answer, puzzleId);
    default:
      return { isCorrect: false, feedback: "Unknown puzzle type." };
  }
}

export function calculateScore(
  basePoints: number,
  hintsUsed: number,
  timeTakenSeconds: number,
  timeLimitSeconds: number
): number {
  const hintPenalty = hintsUsed * 15;
  const timePenalty = Math.floor((timeTakenSeconds / timeLimitSeconds) * 30);
  return Math.max(0, basePoints - hintPenalty - timePenalty);
}
