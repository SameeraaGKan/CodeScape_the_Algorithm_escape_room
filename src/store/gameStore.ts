"use client";
import { create } from "zustand";
import type { GameSession, Puzzle, PuzzleResult } from "@/types";

type GameStore = {
  session: GameSession | null;
  currentPuzzle: Puzzle | null;
  puzzleOrder: string[];
  results: PuzzleResult[];
  hintsUsed: number;
  attemptCount: number;
  elapsedSeconds: number;

  setSession: (session: GameSession) => void;
  setCurrentPuzzle: (puzzle: Puzzle) => void;
  setPuzzleOrder: (ids: string[]) => void;
  addResult: (result: PuzzleResult) => void;
  incrementHints: () => void;
  incrementAttempt: () => void;
  resetPuzzleState: () => void;
  setElapsed: (s: number) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  session: null,
  currentPuzzle: null,
  puzzleOrder: [],
  results: [],
  hintsUsed: 0,
  attemptCount: 0,
  elapsedSeconds: 0,

  setSession: (session) => set({ session }),
  setCurrentPuzzle: (puzzle) => set({ currentPuzzle: puzzle }),
  setPuzzleOrder: (ids) => set({ puzzleOrder: ids }),
  addResult: (result) => set((s) => ({ results: [...s.results, result] })),
  incrementHints: () => set((s) => ({ hintsUsed: s.hintsUsed + 1 })),
  incrementAttempt: () => set((s) => ({ attemptCount: s.attemptCount + 1 })),
  resetPuzzleState: () => set({ hintsUsed: 0, attemptCount: 0, elapsedSeconds: 0 }),
  setElapsed: (elapsedSeconds) => set({ elapsedSeconds }),
}));
