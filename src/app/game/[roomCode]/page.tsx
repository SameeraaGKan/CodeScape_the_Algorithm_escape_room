"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CipherPuzzle } from "@/components/puzzle/CipherPuzzle";
import { CodeFillPuzzle } from "@/components/puzzle/CodeFillPuzzle";
import { RecursionTrace } from "@/components/puzzle/RecursionTrace";
import { AlgorithmMaze } from "@/components/puzzle/AlgorithmMaze";
import { MCQPuzzle } from "@/components/puzzle/MCQPuzzle";
import { AgentChatPanel } from "@/components/agent/AgentChatPanel";
import { AGENT_CONFIGS } from "@/lib/ai/personalities";
import { PATHS } from "@/lib/puzzles/paths";
import type { AgentPersonality, Puzzle, MCQQuestion } from "@/types";
import {
  Clock, Trophy, CheckCircle, XCircle, Loader2,
  MessageSquare, Layout, Cpu,
} from "lucide-react";

type GameSession = {
  id: string;
  teamId: string;
  roomCode: string;
  puzzleSetId: string;
  currentPuzzleIndex: number;
  totalScore: number;
  status: string;
};

type SubmitResult = {
  isCorrect: boolean;
  feedback?: string;
  score: number;
  nextPuzzleId: string | null;
  sessionComplete: boolean;
};

const AGENT_OPTIONS = Object.entries(AGENT_CONFIGS) as [
  AgentPersonality,
  (typeof AGENT_CONFIGS)[AgentPersonality]
][];

function timeLimitFor(difficulty: "easy" | "medium" | "hard"): number {
  return difficulty === "easy" ? 45 : difficulty === "medium" ? 75 : 120;
}

function mcqPoints(difficulty: "easy" | "medium" | "hard", timeRemaining: number, timeLimit: number): number {
  const base = difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : 30;
  return base + (timeRemaining > timeLimit * 0.5 ? 5 : 0);
}

export default function GamePage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<GameSession | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [totalPuzzles, setTotalPuzzles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Legacy puzzle submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastAttempt, setLastAttempt] = useState<string | undefined>();

  // MCQ mode state
  const [isMcqMode, setIsMcqMode] = useState(false);
  const [selectedPathId, setSelectedPathId] = useState("");
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [mcqIndex, setMcqIndex] = useState(0);
  const [mcqAnswered, setMcqAnswered] = useState(false);
  const [mcqTimedOut, setMcqTimedOut] = useState(false);
  const [mcqScore, setMcqScore] = useState(0);
  const [mcqCorrect, setMcqCorrect] = useState(0);
  const [mcqComplete, setMcqComplete] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<"puzzle" | "chat">("puzzle");
  const [selectedAgent, setSelectedAgent] = useState<AgentPersonality>("supportive");

  async function loadRoom(code: string) {
    try {
      const res = await fetch(`/api/rooms?code=${code}`);
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load game room.");
        setLoading(false);
        return;
      }

      setSession(data.session);

      if (data.isMcqMode) {
        setIsMcqMode(true);
        setSelectedPathId(data.selectedPath);
        const qRes = await fetch(`/api/questions?path=${data.selectedPath}`);
        const qData = await qRes.json();
        const questions: MCQQuestion[] = qData.questions ?? [];
        setMcqQuestions(questions);
        setTotalPuzzles(questions.length);
        if (questions.length > 0) {
          setTimeRemaining(timeLimitFor(questions[0].difficulty));
        }
      } else {
        setTotalPuzzles(data.totalPuzzles ?? 0);
        if (data.currentPuzzleId) {
          const pRes = await fetch(`/api/puzzles?id=${data.currentPuzzleId}`);
          const pData = await pRes.json();
          if (pData.puzzle) {
            setPuzzle(pData.puzzle);
            setTimeRemaining(pData.puzzle.timeLimitSeconds);
          }
        }
      }
    } catch {
      setLoadError("Network error loading room.");
    }
    setLoading(false);
  }

  useEffect(() => { loadRoom(roomCode); }, [roomCode]);

  // Legacy timer
  useEffect(() => {
    if (isMcqMode || !puzzle || submitting || submitResult?.isCorrect) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [isMcqMode, puzzle?.id, submitting, submitResult]);

  // MCQ timer — resets when question index changes
  useEffect(() => {
    if (!isMcqMode || mcqAnswered || mcqQuestions.length === 0) return;
    clearInterval(timerRef.current!);
    timerRef.current = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setMcqAnswered(true);
          setMcqTimedOut(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [isMcqMode, mcqIndex, mcqAnswered, mcqQuestions.length]);

  // Auto-advance after timeout
  useEffect(() => {
    if (!mcqTimedOut) return;
    const id = setTimeout(() => handleMcqNext(), 3000);
    return () => clearTimeout(id);
  }, [mcqTimedOut]);

  function handleMcqAnswer(isCorrect: boolean) {
    clearInterval(timerRef.current!);
    setMcqAnswered(true);
    setMcqTimedOut(false);
    if (isCorrect) {
      const q = mcqQuestions[mcqIndex];
      const limit = timeLimitFor(q.difficulty);
      const pts = mcqPoints(q.difficulty, timeRemaining, limit);
      const newScore = mcqScore + pts;
      setMcqScore(newScore);
      setMcqCorrect(c => c + 1);
      setSession(s => s ? { ...s, totalScore: newScore } : s);
    }
  }

  async function handleMcqNext() {
    const nextIdx = mcqIndex + 1;
    if (nextIdx >= mcqQuestions.length) {
      setMcqComplete(true);
      await fetch("/api/rooms/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, finalScore: mcqScore }),
      });
      setTimeout(() => router.push(`/results/${roomCode}`), 1800);
    } else {
      const nextQ = mcqQuestions[nextIdx];
      setMcqIndex(nextIdx);
      setMcqAnswered(false);
      setMcqTimedOut(false);
      setTimeRemaining(timeLimitFor(nextQ.difficulty));
    }
  }

  async function handleSubmit(answer: unknown) {
    if (!session || !puzzle || submitting) return;
    const timeTaken = puzzle.timeLimitSeconds - timeRemaining;
    setSubmitting(true);
    setSubmitResult(null);
    if (typeof answer === "string") setLastAttempt(answer);

    const res = await fetch("/api/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode: session.roomCode,
        puzzleId: puzzle.id,
        answer,
        timeTakenSeconds: timeTaken,
        hintsUsed,
      }),
    });

    const data = await res.json();
    setSubmitting(false);
    setAttemptCount(c => c + 1);

    const result: SubmitResult = {
      isCorrect: data.isCorrect,
      feedback: data.feedback,
      score: data.score,
      nextPuzzleId: data.nextPuzzleId,
      sessionComplete: data.sessionComplete,
    };
    setSubmitResult(result);

    if (data.sessionComplete) {
      setTimeout(() => router.push(`/results/${roomCode}`), 2000);
      return;
    }

    if (data.isCorrect && data.nextPuzzleId) {
      clearInterval(timerRef.current!);
      setTimeout(async () => {
        const pRes = await fetch(`/api/puzzles?id=${data.nextPuzzleId}`);
        const pData = await pRes.json();
        if (pData.puzzle) {
          setPuzzle(pData.puzzle);
          setTimeRemaining(pData.puzzle.timeLimitSeconds);
        }
        setSubmitResult(null);
        setAttemptCount(0);
        setHintsUsed(0);
        setLastAttempt(undefined);
        setSession(s =>
          s ? { ...s, currentPuzzleIndex: s.currentPuzzleIndex + 1, totalScore: s.totalScore + data.score } : s
        );
      }, 1800);
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const currentMcqQ = mcqQuestions[mcqIndex];
  const mcqTimeLimit = currentMcqQ ? timeLimitFor(currentMcqQ.difficulty) : 75;
  const timerBase = isMcqMode ? mcqTimeLimit : (puzzle?.timeLimitSeconds ?? 1);
  const timerPct = (timeRemaining / timerBase) * 100;
  const timerColor = timerPct > 50 ? "var(--neon-cyan)" : timerPct > 25 ? "#f59e0b" : "#dc2626";

  const pathMeta = isMcqMode ? PATHS.find(p => p.id === selectedPathId) : null;

  // Difficulty badge info — MCQ mode uses current question difficulty, legacy uses puzzle
  const difficultyStr = isMcqMode
    ? (currentMcqQ?.difficulty ?? "medium")
    : (puzzle?.difficulty ?? "medium");
  const difficultyColor =
    difficultyStr === "easy" ? "#00ff88" : difficultyStr === "medium" ? "var(--neon-cyan)" : "var(--neon-magenta)";

  // Header labels
  const headerTitle = isMcqMode
    ? `${pathMeta?.icon ?? "📚"} ${pathMeta?.label ?? selectedPathId}`
    : (puzzle?.title ?? "");
  const headerSub = isMcqMode
    ? `Question ${mcqIndex + 1} / ${mcqQuestions.length}`
    : `Stage ${puzzle?.stage} · Puzzle ${(session?.currentPuzzleIndex ?? 0) + 1} / ${totalPuzzles}`;

  const displayScore = session?.totalScore ?? 0;

  // ── Loading & error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[var(--neon-cyan)] animate-spin" />
      </div>
    );
  }

  if (loadError || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <XCircle className="w-8 h-8 text-red-500" />
        <p>{loadError || "No session found."}</p>
      </div>
    );
  }

  if (isMcqMode && mcqQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[var(--neon-cyan)] animate-spin" />
      </div>
    );
  }

  if (!isMcqMode && !puzzle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <XCircle className="w-8 h-8 text-red-500" />
        <p>No puzzle loaded.</p>
      </div>
    );
  }

  return (
    <>
      {/* Game header */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-[var(--dark-border)] bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Puzzle / question info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-1.5 py-0.5 rounded border shrink-0 uppercase"
                style={{ color: difficultyColor, borderColor: `${difficultyColor}50`, background: `${difficultyColor}15` }}
              >
                {difficultyStr}
              </span>
              <h2 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-foreground truncate">
                {headerTitle}
              </h2>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{headerSub}</div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2 shrink-0">
            <Clock className="w-3.5 h-3.5" style={{ color: timerColor }} />
            <span
              className="font-[family-name:var(--font-orbitron)] text-sm font-bold tabular-nums"
              style={{ color: timerColor }}
            >
              {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Trophy className="w-3.5 h-3.5 text-[var(--neon-cyan)]" />
            <span className="text-sm text-foreground font-semibold tabular-nums">{displayScore}</span>
          </div>

          {/* Agent selector (desktop) */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value as AgentPersonality)}
              className="bg-background border border-[var(--dark-border)] text-muted-foreground text-xs rounded px-2 py-1 focus:outline-none focus:border-[var(--dark-border)]"
            >
              {AGENT_OPTIONS.map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.emoji} {cfg.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timer progress bar */}
        <div className="h-0.5 bg-[var(--dark-border)]">
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
          />
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--dark-border)] bg-background flex">
        {(["puzzle", "chat"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold tracking-wider transition-colors ${
              activeTab === tab
                ? "text-[var(--neon-cyan)] border-t-2 border-[var(--neon-cyan)] -mt-0.5"
                : "text-muted-foreground"
            }`}
          >
            {tab === "puzzle" ? (
              <><Layout className="w-4 h-4" /> PUZZLE</>
            ) : (
              <><MessageSquare className="w-4 h-4" /> AGENT</>
            )}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <main className="pt-14 pb-16 md:pb-0 h-screen flex overflow-hidden">
        {/* Left: puzzle / MCQ panel */}
        <div
          className={`flex-1 overflow-y-auto p-4 md:p-6 ${activeTab !== "puzzle" ? "hidden md:block" : ""}`}
        >
          <div className="max-w-2xl mx-auto space-y-6">

            {/* ── MCQ MODE ─────────────────────────────────────────────── */}
            {isMcqMode && (
              mcqComplete ? (
                <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
                  <CheckCircle className="w-16 h-16 text-[var(--neon-cyan)]" />
                  <div>
                    <h2 className="font-[family-name:var(--font-orbitron)] text-2xl font-black text-foreground mb-2">
                      SESSION COMPLETE
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {mcqCorrect} / {mcqQuestions.length} correct · {mcqScore} pts
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground tracking-widest animate-pulse">
                    LOADING RESULTS...
                  </p>
                </div>
              ) : (
                <MCQPuzzle
                  key={mcqIndex}
                  question={currentMcqQ!}
                  questionNumber={mcqIndex + 1}
                  totalQuestions={mcqQuestions.length}
                  onAnswer={handleMcqAnswer}
                  onNext={handleMcqNext}
                  timedOut={mcqTimedOut}
                />
              )
            )}

            {/* ── LEGACY PUZZLE MODE ───────────────────────────────────── */}
            {!isMcqMode && puzzle && (
              <>
                <div>
                  <h1 className="font-[family-name:var(--font-orbitron)] text-xl font-black text-foreground mb-3">
                    {puzzle.title}
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">{puzzle.description}</p>
                </div>

                {/* Submission result banner */}
                {submitResult && (
                  <div
                    className={`flex items-center gap-3 p-4 rounded border ${
                      submitResult.isCorrect
                        ? "border-[var(--neon-green)]/40 bg-[var(--neon-green)]/10 text-[var(--neon-green)]"
                        : "border-red-500/40 bg-red-500/10 text-red-400"
                    }`}
                  >
                    {submitResult.isCorrect ? (
                      <CheckCircle className="w-5 h-5 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold text-sm">
                        {submitResult.isCorrect
                          ? `+${submitResult.score} pts — ${submitResult.feedback}`
                          : submitResult.feedback}
                      </div>
                      {!submitResult.isCorrect && (
                        <div className="text-xs opacity-70 mt-0.5">
                          Attempt {attemptCount} / {puzzle.maxAttempts}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Puzzle component */}
                {puzzle.type === "cipher" && (
                  <CipherPuzzle
                    puzzle={puzzle}
                    onSubmit={handleSubmit}
                    disabled={submitting || !!submitResult?.isCorrect}
                  />
                )}
                {puzzle.type === "code_fill" && (
                  <CodeFillPuzzle
                    puzzle={puzzle}
                    onSubmit={handleSubmit}
                    disabled={submitting || !!submitResult?.isCorrect}
                  />
                )}
                {puzzle.type === "recursion_trace" && (
                  <RecursionTrace
                    puzzle={puzzle}
                    onSubmit={handleSubmit}
                    disabled={submitting || !!submitResult?.isCorrect}
                  />
                )}
                {puzzle.type === "maze" && (
                  <AlgorithmMaze
                    puzzle={puzzle}
                    onSubmit={handleSubmit}
                    disabled={submitting || !!submitResult?.isCorrect}
                  />
                )}

                {attemptCount > 0 && !submitResult?.isCorrect && (
                  <p className="text-xs text-muted-foreground text-center">
                    {puzzle.maxAttempts - attemptCount} attempt
                    {puzzle.maxAttempts - attemptCount !== 1 ? "s" : ""} remaining
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: agent chat panel */}
        <div
          className={`md:w-80 lg:w-96 border-l border-[var(--dark-border)] flex flex-col ${
            activeTab !== "chat" ? "hidden md:flex" : "flex-1 md:flex-none"
          }`}
        >
          {/* Mobile agent selector */}
          <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-[var(--dark-border)] bg-card">
            <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value as AgentPersonality)}
              className="bg-transparent text-muted-foreground text-xs focus:outline-none flex-1"
            >
              {AGENT_OPTIONS.map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.emoji} {cfg.name}
                </option>
              ))}
            </select>
          </div>

          {session && (
            <AgentChatPanel
              sessionId={session.id}
              puzzleId={isMcqMode ? (currentMcqQ?.id ?? "mcq") : (puzzle?.id ?? "unknown")}
              personality={selectedAgent}
              playerAttempt={lastAttempt}
              timeRemainingSeconds={timeRemaining}
              onMessageReceived={() => setHintsUsed(h => h + 1)}
            />
          )}
        </div>
      </main>
    </>
  );
}
