"use client";

import { useState } from "react";
import type { Puzzle } from "@/types";
import { ChevronRight } from "lucide-react";

type Props = {
  puzzle: Puzzle;
  onSubmit: (answer: Record<string, string>) => void;
  disabled?: boolean;
  feedback?: string;
};

// The validator expects { frame0: "1", frame2: "2", frame4: "24" }
// blanksInStack: [{ frameId: 0, field: "returnValue" }, ...]

export function RecursionTrace({ puzzle, onSubmit, disabled, feedback }: Props) {
  const { code, callToTrace, blanksInStack } = puzzle.setup;
  const blanks = blanksInStack ?? [];

  // State: blank answers keyed by "frame{id}"
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(blanks.map((b) => [`frame${b.frameId}`, ""]))
  );

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    onSubmit(answers);
  }

  const allFilled = Object.values(answers).every((v) => v.trim() !== "");

  // Build full call stack for display (for factorial(4) that's 5 frames)
  // We detect the max frameId from blanks
  const maxFrame = blanks.reduce((m, b) => Math.max(m, b.frameId), 0);
  const frameCount = maxFrame + 1;

  // Parse the function name from callToTrace (e.g., "factorial(4)")
  const callMatch = callToTrace?.match(/^(\w+)\((\d+)\)/);
  const funcName = callMatch?.[1] ?? "f";
  const topArg = parseInt(callMatch?.[2] ?? "0", 10);

  return (
    <div className="space-y-6">
      {/* Function code */}
      <div className="rounded border border-[var(--dark-border)] overflow-hidden">
        <div className="px-4 py-2 bg-[var(--dark-card)] border-b border-[var(--dark-border)]">
          <span className="text-xs text-gray-600 font-mono">python</span>
        </div>
        <pre className="p-4 text-sm font-mono text-gray-300 bg-black overflow-x-auto leading-relaxed whitespace-pre-wrap">
          {code}
        </pre>
      </div>

      {/* Call to trace */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--neon-cyan)]/10 rounded border border-[var(--neon-cyan)]/30">
        <span className="text-xs text-gray-500 tracking-widest">TRACE:</span>
        <code className="text-[var(--neon-cyan)] font-mono text-sm">{callToTrace}</code>
      </div>

      {/* Call stack visualization (top frame first) */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 tracking-widest">
          CALL STACK — FILL IN THE BLANKS
        </p>
        <div className="space-y-1.5">
          {Array.from({ length: frameCount }, (_, i) => {
            const frameId = maxFrame - i; // show top of stack first
            const n = topArg - (maxFrame - frameId);
            const blank = blanks.find((b) => b.frameId === frameId);
            const key = `frame${frameId}`;

            return (
              <div
                key={frameId}
                className={`flex items-center gap-4 p-3 rounded border text-sm font-mono transition-all ${
                  blank
                    ? "border-[var(--neon-cyan)]/40 bg-[var(--neon-cyan)]/5"
                    : "border-[var(--dark-border)] bg-black opacity-60"
                }`}
              >
                <span className="text-gray-600 text-xs w-16 shrink-0">
                  frame {frameId}
                </span>
                <span className="text-gray-400 flex-1">
                  {funcName}({n}) →{" "}
                  <span className="text-gray-600">returns</span>
                </span>
                {blank ? (
                  <input
                    type="text"
                    value={answers[key] ?? ""}
                    onChange={(e) => setAnswer(key, e.target.value)}
                    disabled={disabled}
                    placeholder="?"
                    className="w-20 px-2 py-1 bg-black border border-[var(--neon-cyan)]/40 rounded text-[var(--neon-cyan)] text-center text-sm focus:outline-none focus:border-[var(--neon-cyan)] transition-colors disabled:opacity-50"
                  />
                ) : (
                  <span className="text-gray-700 w-20 text-center">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {feedback && (
        <p className="text-sm text-gray-400 px-1">{feedback}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={disabled || !allFilled}
        className="w-full py-3 bg-[var(--neon-cyan)] text-black font-bold text-sm tracking-widest rounded hover:bg-[var(--neon-cyan)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all box-glow-cyan flex items-center justify-center gap-2"
      >
        SUBMIT TRACE
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
