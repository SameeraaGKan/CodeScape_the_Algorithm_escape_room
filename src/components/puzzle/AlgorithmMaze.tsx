"use client";

import { useState } from "react";
import type { Puzzle } from "@/types";
import { ChevronRight, RotateCcw } from "lucide-react";

type Props = {
  puzzle: Puzzle;
  onSubmit: (answer: [number, number][]) => void;
  disabled?: boolean;
  feedback?: string;
};

export function AlgorithmMaze({ puzzle, onSubmit, disabled, feedback }: Props) {
  const { grid, start, end } = puzzle.setup;
  const rows = grid?.length ?? 5;
  const cols = grid?.[0]?.length ?? 5;
  const [sr, sc] = start ?? [0, 0];
  const [er, ec] = end ?? [rows - 1, cols - 1];

  const [path, setPath] = useState<[number, number][]>([[sr, sc]]);

  function isWall(r: number, c: number) {
    return grid?.[r]?.[c] === 1;
  }

  function isInPath(r: number, c: number) {
    return path.some(([pr, pc]) => pr === r && pc === c);
  }

  function isStart(r: number, c: number) {
    return r === sr && c === sc;
  }

  function isEnd(r: number, c: number) {
    return r === er && c === ec;
  }

  function handleCellClick(r: number, c: number) {
    if (disabled || isWall(r, c) || isStart(r, c)) return;

    const idx = path.findIndex(([pr, pc]) => pr === r && pc === c);
    if (idx !== -1) {
      // Remove this cell and everything after it
      setPath((prev) => prev.slice(0, idx));
    } else {
      setPath((prev) => [...prev, [r, c]]);
    }
  }

  function reset() {
    setPath([[sr, sc]]);
  }

  const pathReachesEnd = path.length > 1 && isInPath(er, ec);

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        {[
          { color: "bg-[var(--neon-cyan)]/20 border-[var(--neon-cyan)]", label: "START" },
          { color: "bg-[var(--neon-magenta)]/20 border-[var(--neon-magenta)]", label: "END" },
          { color: "bg-gray-800 border-gray-700", label: "WALL" },
          { color: "bg-[var(--neon-cyan)]/30 border-[var(--neon-cyan)]/50", label: "PATH" },
          { color: "bg-black border-[var(--dark-border)]", label: "OPEN" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-4 h-4 rounded border ${color}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div
        className="grid gap-1 max-w-xs mx-auto"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const wall = isWall(r, c);
            const inPath = isInPath(r, c);
            const start_ = isStart(r, c);
            const end_ = isEnd(r, c);
            const pathIdx = path.findIndex(([pr, pc]) => pr === r && pc === c);

            let className =
              "aspect-square flex items-center justify-center text-xs font-bold rounded transition-all ";

            if (wall) {
              className += "bg-gray-800 border border-gray-700 cursor-not-allowed";
            } else if (start_) {
              className += "bg-[var(--neon-cyan)]/20 border border-[var(--neon-cyan)] text-[var(--neon-cyan)] cursor-default";
            } else if (end_) {
              className += `${inPath ? "bg-[var(--neon-magenta)]/40" : "bg-[var(--neon-magenta)]/20"} border border-[var(--neon-magenta)] text-[var(--neon-magenta)] cursor-pointer`;
            } else if (inPath) {
              className += "bg-[var(--neon-cyan)]/25 border border-[var(--neon-cyan)]/50 text-[var(--neon-cyan)]/70 cursor-pointer hover:bg-[var(--neon-cyan)]/35";
            } else {
              className += "bg-black border border-[var(--dark-border)] cursor-pointer hover:border-[var(--neon-cyan)]/40 hover:bg-[var(--neon-cyan)]/5 text-gray-800";
            }

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                disabled={wall || start_ || disabled}
                className={className}
                title={`[${r},${c}]`}
              >
                {start_ ? "S" : end_ ? "E" : inPath ? String(pathIdx) : ""}
              </button>
            );
          })
        )}
      </div>

      {/* Path info */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>
          Path length: {path.length} cell{path.length !== 1 ? "s" : ""}
          {pathReachesEnd ? " · ✓ Reaches END" : ""}
        </span>
        <button
          onClick={reset}
          disabled={disabled}
          className="flex items-center gap-1 hover:text-gray-400 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {feedback && (
        <p className="text-sm text-gray-400 px-1">{feedback}</p>
      )}

      <button
        onClick={() => onSubmit(path)}
        disabled={disabled || path.length < 2 || !pathReachesEnd}
        className="w-full py-3 bg-[var(--neon-cyan)] text-black font-bold text-sm tracking-widest rounded hover:bg-[var(--neon-cyan)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all box-glow-cyan flex items-center justify-center gap-2"
      >
        SUBMIT PATH
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
