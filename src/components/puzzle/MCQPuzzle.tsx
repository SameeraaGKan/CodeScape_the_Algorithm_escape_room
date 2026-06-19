"use client";
import { useState } from "react";
import { CheckCircle, XCircle, ChevronRight } from "lucide-react";
import type { MCQQuestion } from "@/types";

type Props = {
  question: MCQQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (isCorrect: boolean, selectedIndex: number) => void;
};

export function MCQPuzzle({ question, questionNumber, totalQuestions, onAnswer }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  function handleSelect(idx: number) {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    onAnswer(idx === question.answer, idx);
  }

  const isDS = question.options.length === 5;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-muted-foreground tracking-widest">
        <span>QUESTION {questionNumber} / {totalQuestions}</span>
        <span className="uppercase font-[family-name:var(--font-orbitron)] text-[var(--neon-cyan)]">
          {question.difficulty}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--neon-cyan)] transition-all duration-500"
          style={{ width: `${((questionNumber - 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question text */}
      <div className="p-6 rounded border border-[var(--dark-border)] bg-card">
        <p className="text-foreground leading-relaxed whitespace-pre-line text-sm md:text-base">
          {question.question}
        </p>
      </div>

      {/* Options */}
      <div className={`grid gap-3 ${isDS ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        {question.options.map((opt, idx) => {
          const isCorrect = idx === question.answer;
          const isSelected = idx === selected;
          const showResult = revealed;

          let borderClass = "border-[var(--dark-border)] hover:border-[var(--neon-cyan)]/50";
          let bgClass = "bg-card hover:bg-[var(--neon-cyan)]/5";
          let textClass = "text-foreground";

          if (showResult) {
            if (isCorrect) {
              borderClass = "border-[var(--neon-green)]";
              bgClass = "bg-[var(--neon-green)]/10";
              textClass = "text-foreground";
            } else if (isSelected && !isCorrect) {
              borderClass = "border-red-500";
              bgClass = "bg-red-500/10";
              textClass = "text-foreground";
            } else {
              borderClass = "border-[var(--dark-border)] opacity-50";
              bgClass = "bg-card";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={revealed}
              className={`flex items-start gap-3 p-4 rounded border text-left text-sm transition-all ${borderClass} ${bgClass} ${textClass} ${!revealed ? "cursor-pointer" : "cursor-default"}`}
            >
              {/* Option letter */}
              <span className="shrink-0 w-6 h-6 rounded border border-current flex items-center justify-center text-xs font-bold font-[family-name:var(--font-orbitron)]">
                {String.fromCharCode(65 + idx)}
              </span>

              <span className="flex-1 leading-relaxed">{opt}</span>

              {showResult && isCorrect && (
                <CheckCircle className="shrink-0 w-5 h-5 text-[var(--neon-green)] mt-0.5" />
              )}
              {showResult && isSelected && !isCorrect && (
                <XCircle className="shrink-0 w-5 h-5 text-red-500 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {revealed && (
        <div className="p-4 rounded border border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5 animate-slide-up">
          <p className="text-xs text-[var(--neon-cyan)] tracking-widest font-[family-name:var(--font-orbitron)] mb-2">
            EXPLANATION
          </p>
          <p className="text-sm text-foreground leading-relaxed">{question.explanation}</p>
        </div>
      )}

      {/* Next button appears after answering */}
      {revealed && questionNumber < totalQuestions && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setSelected(null);
              setRevealed(false);
            }}
            className="flex items-center gap-2 px-6 py-2 rounded border border-[var(--neon-cyan)] text-[var(--neon-cyan)] text-sm font-semibold hover:bg-[var(--neon-cyan)]/10 transition-all"
          >
            NEXT <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
