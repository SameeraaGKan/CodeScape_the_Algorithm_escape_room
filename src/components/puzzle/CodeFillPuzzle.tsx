"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Puzzle } from "@/types";
import { ChevronRight } from "lucide-react";

// CodeMirror is browser-only
const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

type Props = {
  puzzle: Puzzle;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  feedback?: string;
};

export function CodeFillPuzzle({ puzzle, onSubmit, disabled, feedback }: Props) {
  const [answer, setAnswer] = useState("");
  const { starterCode, blankPlaceholder, language } = puzzle.setup;

  // Split code around the blank for display
  const blank = blankPlaceholder ?? "___BLANK___";
  const parts = (starterCode ?? "").split(blank);

  async function loadExtension() {
    if (language === "python") {
      const { python } = await import("@codemirror/lang-python");
      return [python()];
    }
    const { javascript } = await import("@codemirror/lang-javascript");
    return [javascript()];
  }

  return (
    <div className="space-y-6">
      {/* Code display with blank highlighted */}
      <div className="rounded border border-[var(--dark-border)] overflow-hidden">
        <div className="px-4 py-2 bg-[var(--dark-card)] border-b border-[var(--dark-border)] flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-gray-600 font-mono ml-2">
            {language ?? "python"}
          </span>
        </div>
        <pre className="p-4 text-sm font-mono text-gray-300 bg-black overflow-x-auto leading-relaxed whitespace-pre-wrap">
          {parts[0]}
          <span className="bg-[var(--neon-cyan)]/20 border border-[var(--neon-cyan)]/50 text-[var(--neon-cyan)] px-1 rounded">
            {answer || blank}
          </span>
          {parts[1]}
        </pre>
      </div>

      {/* Fill-in input */}
      <div className="space-y-3">
        <label className="text-xs text-gray-500 tracking-widest block">
          FILL IN THE BLANK
        </label>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !disabled && answer.trim() && onSubmit(answer.trim())}
          disabled={disabled}
          placeholder={`Replace ${blank}`}
          className="w-full px-4 py-3 bg-black border border-[var(--dark-border)] rounded text-[var(--neon-cyan)] font-mono placeholder-gray-700 text-sm focus:outline-none focus:border-[var(--neon-cyan)]/60 transition-colors disabled:opacity-50"
          spellCheck={false}
        />
      </div>

      {feedback && (
        <p className="text-sm text-gray-400 px-1">{feedback}</p>
      )}

      <button
        onClick={() => onSubmit(answer.trim())}
        disabled={disabled || !answer.trim()}
        className="w-full py-3 bg-[var(--neon-cyan)] text-black font-bold text-sm tracking-widest rounded hover:bg-[var(--neon-cyan)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all box-glow-cyan flex items-center justify-center gap-2"
      >
        SUBMIT CODE
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
