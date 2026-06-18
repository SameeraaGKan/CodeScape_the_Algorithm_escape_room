"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { CipherPuzzle } from "@/components/puzzle/CipherPuzzle";
import { CodeFillPuzzle } from "@/components/puzzle/CodeFillPuzzle";
import { RecursionTrace } from "@/components/puzzle/RecursionTrace";
import { AlgorithmMaze } from "@/components/puzzle/AlgorithmMaze";
import { AgentChatPanel } from "@/components/agent/AgentChatPanel";
import { AGENT_CONFIGS } from "@/lib/ai/personalities";
import type { AgentPersonality, Puzzle } from "@/types";
import {
  Clock,
  Trophy,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  Layout,
  Cpu,
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

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastAttempt, setLastAttempt] = useState<string | undefined>();

  // UI state
  const [activeTab, setActiveTab] = useState<"puzzle" | "chat">("puzzle");
  const [selectedAgent, setSelectedAgent] = useState<AgentPersonality>("supportive");

  // Load game state
  async function loadRoom(code: string) {
    const res = await fetch(`/api/rooms?code=${code}`);
    const data = await res.json();
    if (!res.ok) {
      setLoadError(data.error ?? "Could not load game room.");
      setLoading(false);
      return;
    }

    setSession(data.session);
    setTotalPuzzles(data.totalPuzzles);

    if (data.currentPuzzleId) {
      const pRes = await fetch(`/api/puzzles?id=${data.currentPuzzleId}`);
      const pData = await pRes.json();
      if (pData.puzzle) {
        setPuzzle(pData.puzzle);
        setTimeRemaining(pData.puzzle.timeLimitSeconds);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRoom(roomCode);
  }, [roomCode]);

  // Countdown timer
  useEffect(() => {
    if (!puzzle || submitting || submitResult?.isCorrect) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current!);
  }, [puzzle?.id, submitting, submitResult]);

  async function handleSubmit(answer: unknown) {
    if (!session || !puzzle || submitting) return;

    const timeTaken = puzzle.timeLimitSeconds - timeRemaining;
    setSubmitting(true);
    setSubmitResult(null);

    // Track the attempt as a string for agent context
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
    setAttemptCount((c) => c + 1);

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
      // Advance to next puzzle
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
        setSession((s) =>
          s ? { ...s, currentPuzzleIndex: s.currentPuzzleIndex + 1, totalScore: s.totalScore + data.score } : s
        );
      }, 1800);
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const timerPct = puzzle ? (timeRemaining / puzzle.timeLimitSeconds) * 100 : 100;
  const timerColor =
    timerPct > 50
      ? "var(--neon-cyan)"
      : timerPct > 25
      ? "#f59e0b"
      : "#dc2626";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[var(--neon-cyan)] animate-spin" />
      </div>
    );
  }

  if (loadError || !session || !puzzle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <XCircle className="w-8 h-8 text-red-500" />
        <p>{loadError || "No puzzle loaded."}</p>
      </div>
    );
  }

  const difficultyColor =
    puzzle.difficulty === "easy"
      ? "#00ff88"
      : puzzle.difficulty === "medium"
      ? "var(--neon-cyan)"
      : "var(--neon-magenta)";

  return (
    <>
      {/* Game header */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-[var(--dark-border)] bg-black/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Puzzle info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-1.5 py-0.5 rounded border shrink-0"
                style={{ color: difficultyColor, borderColor: `${difficultyColor}50`, background: `${difficultyColor}15` }}
              >
                {puzzle.difficulty.toUpperCase()}
              </span>
              <h2 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-white truncate">
                {puzzle.title}
              </h2>
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              Stage {puzzle.stage} · Puzzle {session.currentPuzzleIndex + 1}/{totalPuzzles}
            </div>
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
            <span className="text-sm text-white font-semibold tabular-nums">
              {session.totalScore}
            </span>
          </div>

          {/* Agent selector */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Cpu className="w-3.5 h-3.5 text-gray-600" />
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value as AgentPersonality)}
              className="bg-black border border-[var(--dark-border)] text-gray-400 text-xs rounded px-2 py-1 focus:outline-none focus:border-gray-600"
            >
              {AGENT_OPTIONS.map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.emoji} {cfg.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-0.5 bg-[var(--dark-border)]">
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
          />
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--dark-border)] bg-black flex">
        {(["puzzle", "chat"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold tracking-wider transition-colors ${
              activeTab === tab
                ? "text-[var(--neon-cyan)] border-t-2 border-[var(--neon-cyan)] -mt-0.5"
                : "text-gray-600"
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

      {/* Main content */}
      <main className="pt-14 pb-16 md:pb-0 h-screen flex overflow-hidden">
        {/* Puzzle panel */}
        <div
          className={`flex-1 overflow-y-auto p-4 md:p-6 ${
            activeTab !== "puzzle" ? "hidden md:block" : ""
          }`}
        >
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Puzzle description */}
            <div>
              <h1 className="font-[family-name:var(--font-orbitron)] text-xl font-black text-white mb-3">
                {puzzle.title}
              </h1>
              <p className="text-sm text-gray-400 leading-relaxed">
                {puzzle.description}
              </p>
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
                disabled={submitting || submitResult?.isCorrect}
                feedback={!submitResult?.isCorrect ? undefined : undefined}
              />
            )}
            {puzzle.type === "code_fill" && (
              <CodeFillPuzzle
                puzzle={puzzle}
                onSubmit={handleSubmit}
                disabled={submitting || submitResult?.isCorrect}
              />
            )}
            {puzzle.type === "recursion_trace" && (
              <RecursionTrace
                puzzle={puzzle}
                onSubmit={handleSubmit}
                disabled={submitting || submitResult?.isCorrect}
              />
            )}
            {puzzle.type === "maze" && (
              <AlgorithmMaze
                puzzle={puzzle}
                onSubmit={handleSubmit}
                disabled={submitting || submitResult?.isCorrect}
              />
            )}

            {/* Attempt info */}
            {attemptCount > 0 && !submitResult?.isCorrect && (
              <p className="text-xs text-gray-600 text-center">
                {puzzle.maxAttempts - attemptCount} attempt
                {puzzle.maxAttempts - attemptCount !== 1 ? "s" : ""} remaining
              </p>
            )}
          </div>
        </div>

        {/* Agent chat panel — desktop right sidebar */}
        <div
          className={`md:w-80 lg:w-96 border-l border-[var(--dark-border)] flex flex-col ${
            activeTab !== "chat" ? "hidden md:flex" : "flex-1 md:flex-none"
          }`}
        >
          {/* Mobile agent selector */}
          <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-[var(--dark-border)] bg-[var(--dark-card)]">
            <Cpu className="w-3.5 h-3.5 text-gray-600" />
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value as AgentPersonality)}
              className="bg-transparent text-gray-400 text-xs focus:outline-none flex-1"
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
              puzzleId={puzzle.id}
              personality={selectedAgent}
              playerAttempt={lastAttempt}
              timeRemainingSeconds={timeRemaining}
              onMessageReceived={() => setHintsUsed((h) => h + 1)}
            />
          )}
        </div>
      </main>
    </>
  );
}
