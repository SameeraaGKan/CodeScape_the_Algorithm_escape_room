"use client";

import { useState } from "react";
import type { Puzzle } from "@/types";
import { Eye, ChevronRight } from "lucide-react";

type Props = {
  puzzle: Puzzle;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  feedback?: string;
};

export function CipherPuzzle({ puzzle, onSubmit, disabled, feedback }: Props) {
  const [answer, setAnswer] = useState("");
  const { ciphertext, shiftHint } = puzzle.setup;

  return (
    <div className="space-y-6">
      {/* Ciphertext display */}
      <div className="p-6 rounded border border-[var(--dark-border)] bg-[var(--dark-card)] text-center">
        <div className="text-xs text-muted-foreground tracking-widest mb-3">
          INTERCEPTED TRANSMISSION
        </div>
        <div className="font-[family-name:var(--font-orbitron)] text-3xl md:text-4xl font-black text-[var(--neon-cyan)] glow-cyan tracking-widest">
          {ciphertext}
        </div>
      </div>

      {/* Hint */}
      {shiftHint && (
        <div className="flex items-start gap-3 p-4 rounded border border-[var(--dark-border)] bg-[var(--dark-card)]">
          <Eye className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">{shiftHint}</p>
        </div>
      )}

      {/* Answer input */}
      <div className="space-y-3">
        <label className="text-xs text-muted-foreground tracking-widest block">
          DECODED MESSAGE
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && !disabled && answer.trim() && onSubmit(answer.trim())}
          disabled={disabled}
          placeholder="TYPE THE DECODED MESSAGE…"
          className="w-full px-4 py-3 bg-background border border-[var(--dark-border)] rounded text-foreground font-mono placeholder-muted-foreground text-sm focus:outline-none focus:border-[var(--neon-cyan)]/60 transition-colors uppercase tracking-widest disabled:opacity-50"
        />
      </div>

      {feedback && (
        <p className="text-sm text-muted-foreground px-1">{feedback}</p>
      )}

      <button
        onClick={() => onSubmit(answer.trim())}
        disabled={disabled || !answer.trim()}
        className="w-full py-3 bg-[var(--neon-cyan)] text-black font-bold text-sm tracking-widest rounded hover:bg-[var(--neon-cyan)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all box-glow-cyan flex items-center justify-center gap-2"
      >
        SUBMIT DECODE
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
