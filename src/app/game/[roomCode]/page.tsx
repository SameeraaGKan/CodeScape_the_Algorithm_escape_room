"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CipherPuzzle } from "@/components/puzzle/CipherPuzzle";
import { CodeFillPuzzle } from "@/components/puzzle/CodeFillPuzzle";
import { RecursionTrace } from "@/components/puzzle/RecursionTrace";
import { AlgorithmMaze } from "@/components/puzzle/AlgorithmMaze";
import { MCQPuzzle } from "@/components/puzzle/MCQPuzzle";
import { AgentChatPanel } from "@/components/agent/AgentChatPanel";
import { TeamChatPanel } from "@/components/team/TeamChatPanel";
import { AGENT_CONFIGS } from "@/lib/ai/personalities";
import { PATHS } from "@/lib/puzzles/paths";
import { getSupabaseBrowser } from "@/lib/db/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AgentPersonality, Puzzle, MCQQuestion } from "@/types";
import {
  Clock, Trophy, CheckCircle, XCircle, Loader2,
  MessageSquare, Layout, Cpu, Users,
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

// Race mode scoring: speed-based + correctness bonus
function racePoints(difficulty: "easy" | "medium" | "hard", timeRemaining: number, timeLimit: number, isCorrect: boolean): number {
  const base = difficulty === "easy" ? 50 : difficulty === "medium" ? 100 : 150;
  const speedScore = Math.floor(base * (timeRemaining / timeLimit));
  return isCorrect ? speedScore + base : Math.floor(speedScore * 0.25);
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
  const [wrongAnswerCount, setWrongAnswerCount] = useState(0);
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
  const [teamAgents, setTeamAgents] = useState<AgentPersonality[]>([]);
  const [peerGreetings, setPeerGreetings] = useState<Partial<Record<AgentPersonality, string>>>({});
  const peerExchangedRef = useRef(false);

  // Multiplayer sync
  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const mcqQuestionsRef = useRef<MCQQuestion[]>([]);
  const advancedToRef = useRef(-1); // guards against double-advance from same index
  const mcqScoreRef = useRef(0);
  const mcqIndexRef = useRef(0);
  const mcqAnsweredRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  const currentDisplayNameRef = useRef<string>("");

  // Human teammate chat
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentDisplayName, setCurrentDisplayName] = useState<string>("");
  const [humanTeammates, setHumanTeammates] = useState<{ userId: string; displayName: string }[]>([]);
  const [rightPanelTab, setRightPanelTab] = useState<"agents" | "teamchat">("agents");
  const [teammateStatus, setTeammateStatus] = useState<Record<string, boolean>>({}); // userId → answered (for status card UI)
  const [isMultiplayerSession, setIsMultiplayerSession] = useState(false); // true when room has >1 human slot
  const [totalHumanSlots, setTotalHumanSlots] = useState(1); // total human players in this room
  const [playersAnsweredCurrentQ, setPlayersAnsweredCurrentQ] = useState(0); // how many players (incl. me) have answered

  // Race mode
  const [isRaceMode, setIsRaceMode] = useState(false);
  const [raceLeaderboard, setRaceLeaderboard] = useState<Record<string, { displayName: string; score: number }>>({});
  const mcqScoreForRaceRef = useRef(0); // own cumulative race score, kept in sync for broadcast

  function handleOpeningComplete(fromPersonality: AgentPersonality, message: string) {
    if (peerExchangedRef.current || teamAgents.length < 2) return;
    peerExchangedRef.current = true;
    const fromCfg = AGENT_CONFIGS[fromPersonality];
    const context = `${fromCfg.emoji} ${fromCfg.name}: "${message.trim().slice(0, 120)}"`;
    teamAgents
      .filter(p => p !== fromPersonality)
      .forEach((toPersonality, i) => {
        setTimeout(() => {
          setPeerGreetings(prev => ({ ...prev, [toPersonality]: context }));
        }, 2000 + i * 1500);
      });
  }

  async function loadRoom(code: string) {
    try {
      const { data: { user, session } } = await getSupabaseBrowser().auth.getSession();
      setCurrentUserId(user?.id ?? null);

      const res = await fetch(`/api/rooms?code=${code}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load game room.");
        setLoading(false);
        return;
      }

      setSession(data.session);
      if (Array.isArray(data.agentPersonalities) && data.agentPersonalities.length > 0) {
        setTeamAgents(data.agentPersonalities as AgentPersonality[]);
      }

      if (Array.isArray(data.humanSlots)) {
        const slotCount = data.humanSlots.length;
        setTotalHumanSlots(slotCount);
        if (slotCount > 1) setIsMultiplayerSession(true);
        if (user) {
          const me = data.humanSlots.find((s: { userId: string }) => s.userId === user.id);
          if (me) setCurrentDisplayName(me.displayName);
          const others = data.humanSlots.filter(
            (s: { userId: string }) => s.userId !== user.id
          );
          setHumanTeammates(others);
          if (others.length > 0) setRightPanelTab("teamchat");
        }
      }

      if (data.gameTrack === "race") setIsRaceMode(true);

      if (data.isMcqMode) {
        setIsMcqMode(true);
        setSelectedPathId(data.selectedPath);
        const qRes = await fetch(`/api/questions?path=${data.selectedPath}&seed=${code}`);
        const qData = await qRes.json();
        const questions: MCQQuestion[] = qData.questions ?? [];
        setMcqQuestions(questions);
        mcqQuestionsRef.current = questions;
        advancedToRef.current = -1;
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

  // Keep refs in sync with state for stable broadcast callbacks
  useEffect(() => { mcqScoreRef.current = mcqScore; }, [mcqScore]);
  useEffect(() => { mcqScoreForRaceRef.current = mcqScore; }, [mcqScore]);
  useEffect(() => { mcqIndexRef.current = mcqIndex; }, [mcqIndex]);
  useEffect(() => { mcqAnsweredRef.current = mcqAnswered; }, [mcqAnswered]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);
  useEffect(() => { currentDisplayNameRef.current = currentDisplayName; }, [currentDisplayName]);

  // Broadcast player_answered whenever this player answers
  useEffect(() => {
    if (!mcqAnswered || !isMcqMode || !isMultiplayerSession) return;
    void roomChannelRef.current?.send({
      type: "broadcast",
      event: "player_answered",
      payload: {
        userId: currentUserIdRef.current ?? "",
        displayName: currentDisplayNameRef.current,
        questionIndex: mcqIndexRef.current,
        raceScore: mcqScoreForRaceRef.current,
      },
    });
  }, [mcqAnswered, isMcqMode, isMultiplayerSession]);

  // Broadcast player_answered when timer runs out without answering (so teammates' status cards update)
  useEffect(() => {
    if (!mcqTimedOut || mcqAnswered || !isMcqMode || !isMultiplayerSession) return;
    void roomChannelRef.current?.send({
      type: "broadcast",
      event: "player_answered",
      payload: {
        userId: currentUserIdRef.current ?? "",
        displayName: currentDisplayNameRef.current,
        questionIndex: mcqIndexRef.current,
      },
    });
  }, [mcqTimedOut, mcqAnswered, isMcqMode, isMultiplayerSession]);

  // Room-state broadcast channel — syncs question advances across players
  useEffect(() => {
    if (!session) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel(`room-state:${roomCode}`);
    channel
      .on(
        "broadcast",
        { event: "question_advance" },
        ({ payload }: { payload: { toIndex: number } }) => {
          const { toIndex } = payload;
          if (advancedToRef.current >= toIndex) return; // already there
          advancedToRef.current = toIndex;
          setTeammateStatus({});
          setRaceLeaderboard({});
          setPlayersAnsweredCurrentQ(0);
          if (toIndex >= mcqQuestionsRef.current.length) {
            setMcqComplete(true);
            setTimeout(() => router.push(`/results/${roomCode}`), 1800);
          } else {
            const nextQ = mcqQuestionsRef.current[toIndex];
            setMcqIndex(toIndex);
            setMcqAnswered(false);
            setMcqTimedOut(false);
            setTimeRemaining(timeLimitFor(nextQ.difficulty));
            setWrongAnswerCount(0);
            setLastAttempt(undefined);
            setPeerGreetings({});
            peerExchangedRef.current = false;
          }
        }
      )
      .on(
        "broadcast",
        { event: "player_answered" },
        ({ payload }: { payload: { userId: string; displayName: string; questionIndex: number; raceScore?: number } }) => {
          if (payload.questionIndex !== mcqIndexRef.current) return;
          if (payload.userId === currentUserIdRef.current) return; // already counted locally
          setPlayersAnsweredCurrentQ(c => c + 1);
          if (payload.userId) {
            setTeammateStatus(prev => ({ ...prev, [payload.userId]: true }));
            if (payload.raceScore !== undefined) {
              setRaceLeaderboard(prev => ({
                ...prev,
                [payload.userId]: { displayName: payload.displayName, score: payload.raceScore! },
              }));
            }
          }
        }
      )
      .subscribe();
    roomChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, roomCode, router]);

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

  // MCQ timer — resets on new question; in multiplayer keeps running even after answering
  useEffect(() => {
    if (!isMcqMode || mcqQuestions.length === 0) return;
    clearInterval(timerRef.current!);
    timerRef.current = setInterval(() => {
      // Solo: stop countdown once the player has answered (Next button handles advance)
      if (!isMultiplayerSession && mcqAnsweredRef.current) {
        clearInterval(timerRef.current!);
        return;
      }
      setTimeRemaining(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          if (!mcqAnsweredRef.current) {
            setMcqAnswered(true);
            setPlayersAnsweredCurrentQ(c => c + 1); // count timeout as "answered"
          }
          setMcqTimedOut(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [isMcqMode, mcqIndex, mcqQuestions.length, isMultiplayerSession]);

  // Solo: auto-advance 3s after timeout
  useEffect(() => {
    if (!mcqTimedOut || isMultiplayerSession) return;
    const id = setTimeout(() => handleMcqNext(), 3000);
    return () => clearTimeout(id);
  }, [mcqTimedOut, isMultiplayerSession]);

  // Multiplayer: advance 1.5s after ALL players have answered
  useEffect(() => {
    if (!isMcqMode || !isMultiplayerSession) return;
    if (playersAnsweredCurrentQ < totalHumanSlots) return;
    const id = setTimeout(() => handleMcqNext(), 1500);
    return () => clearTimeout(id);
  }, [playersAnsweredCurrentQ, isMcqMode, isMultiplayerSession, totalHumanSlots]);

  // Multiplayer fallback: advance 2s after timer expires (in case not everyone answered)
  useEffect(() => {
    if (!mcqTimedOut || !isMultiplayerSession) return;
    const id = setTimeout(() => handleMcqNext(), 2000);
    return () => clearTimeout(id);
  }, [mcqTimedOut, isMultiplayerSession]);

  function handleMcqAnswer(isCorrect: boolean, selectedIndex: number) {
    if (!isMultiplayerSession) clearInterval(timerRef.current!);
    setMcqAnswered(true);
    setPlayersAnsweredCurrentQ(c => c + 1); // count myself as answered
    setMcqTimedOut(false);
    const q = mcqQuestions[mcqIndex];
    setLastAttempt(q.options[selectedIndex]);
    const limit = timeLimitFor(q.difficulty);

    if (isRaceMode) {
      const pts = racePoints(q.difficulty, timeRemaining, limit, isCorrect);
      const newScore = mcqScore + pts;
      mcqScoreForRaceRef.current = newScore;
      setMcqScore(newScore);
      if (isCorrect) setMcqCorrect(c => c + 1);
      else setWrongAnswerCount(c => c + 1);
      // Update own entry in leaderboard immediately
      if (currentUserId) {
        setRaceLeaderboard(prev => ({
          ...prev,
          [currentUserId]: { displayName: currentDisplayName, score: newScore },
        }));
      }
      setSession(s => s ? { ...s, totalScore: newScore } : s);
    } else {
      if (isCorrect) {
        const pts = mcqPoints(q.difficulty, timeRemaining, limit);
        const newScore = mcqScore + pts;
        setMcqScore(newScore);
        setMcqCorrect(c => c + 1);
        setSession(s => s ? { ...s, totalScore: newScore } : s);
      } else {
        setWrongAnswerCount(c => c + 1);
      }
    }
  }

  async function handleMcqNext() {
    const nextIdx = mcqIndexRef.current + 1;
    if (advancedToRef.current >= nextIdx) return; // teammate already triggered this advance
    advancedToRef.current = nextIdx;
    setTeammateStatus({});
    setRaceLeaderboard({});
    setPlayersAnsweredCurrentQ(0);

    // Broadcast to all teammates so they advance to the same question
    await roomChannelRef.current?.send({
      type: "broadcast",
      event: "question_advance",
      payload: { toIndex: nextIdx },
    });

    if (nextIdx >= mcqQuestions.length) {
      setMcqComplete(true);
      await fetch("/api/rooms/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, finalScore: mcqScoreRef.current }),
      });
      setTimeout(() => router.push(`/results/${roomCode}`), 1800);
    } else {
      const nextQ = mcqQuestions[nextIdx];
      setMcqIndex(nextIdx);
      setMcqAnswered(false);
      setMcqTimedOut(false);
      setTimeRemaining(timeLimitFor(nextQ.difficulty));
      setWrongAnswerCount(0);
      setLastAttempt(undefined);
      setPeerGreetings({});
      peerExchangedRef.current = false;
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
    if (!data.isCorrect) setWrongAnswerCount(c => c + 1);

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
        setWrongAnswerCount(0);
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

          {/* Agent selector (desktop) — only for all-human teams */}
          {teamAgents.length === 0 && (
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
          )}
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
            ) : humanTeammates.length > 0 ? (
              <><Users className="w-4 h-4" /> TEAM</>
            ) : (
              <><MessageSquare className="w-4 h-4" /> AGENT</>
            )}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <main className="pt-14 pb-16 md:pb-0 h-screen flex overflow-hidden">
        {/* Left sidebar — multiplayer MCQ only, desktop only */}
        {isMcqMode && isMultiplayerSession && humanTeammates.length > 0 && !mcqComplete && (
          <div className="hidden md:flex w-44 shrink-0 border-r border-[var(--dark-border)] flex-col p-4 gap-3 overflow-y-auto">
            {isRaceMode ? (
              <>
                <p className="text-[10px] text-muted-foreground tracking-widest">⚡ LEADERBOARD</p>
                <div className="flex flex-col gap-2.5">
                  {(() => {
                    // Build sorted list: own entry + teammates
                    const allEntries: { userId: string; displayName: string; score: number; isMe: boolean }[] = [
                      {
                        userId: currentUserId ?? "",
                        displayName: currentDisplayName || "You",
                        score: mcqScore,
                        isMe: true,
                      },
                      ...humanTeammates.map(t => ({
                        userId: t.userId,
                        displayName: t.displayName,
                        score: raceLeaderboard[t.userId]?.score ?? 0,
                        isMe: false,
                      })),
                    ].sort((a, b) => b.score - a.score);

                    return allEntries.map((entry, rank) => (
                      <div key={entry.userId} className={`flex items-center gap-2 ${entry.isMe ? "text-[var(--neon-green)]" : "text-muted-foreground"}`}>
                        <span className="text-[10px] w-4 shrink-0 font-bold">{rank + 1}</span>
                        <span className="text-xs truncate flex-1">{entry.isMe ? "You" : entry.displayName}</span>
                        <span className="text-xs font-bold tabular-nums shrink-0">{entry.score}</span>
                      </div>
                    ));
                  })()}
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] text-muted-foreground tracking-widest">TEAM STATUS</p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    {mcqAnswered || mcqTimedOut
                      ? <CheckCircle className="w-3.5 h-3.5 shrink-0 text-[var(--neon-green)]" />
                      : <span className="block w-3.5 h-3.5 shrink-0 rounded-full border-2 border-[var(--neon-cyan)] animate-pulse" />
                    }
                    <span className={`text-xs truncate ${mcqAnswered || mcqTimedOut ? "text-[var(--neon-green)]" : "text-foreground"}`}>
                      You
                    </span>
                  </div>
                  {humanTeammates.map(t => (
                    <div key={t.userId} className="flex items-center gap-2">
                      {teammateStatus[t.userId]
                        ? <CheckCircle className="w-3.5 h-3.5 shrink-0 text-[var(--neon-green)]" />
                        : <span className="block w-3.5 h-3.5 shrink-0 rounded-full border-2 border-muted-foreground/40 animate-pulse" />
                      }
                      <span className={`text-xs truncate ${teammateStatus[t.userId] ? "text-[var(--neon-green)]" : "text-muted-foreground"}`}>
                        {t.displayName}
                      </span>
                    </div>
                  ))}
                </div>
                {(mcqAnswered || mcqTimedOut) && (
                  <p className="text-[10px] text-muted-foreground/60 tracking-wide leading-relaxed">
                    waiting for timer · help your teammates!
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Left: puzzle / MCQ panel */}
        <div
          className={`flex-1 overflow-y-auto p-4 md:p-6 ${activeTab !== "puzzle" ? "hidden md:block" : ""}`}
        >
          <div className="max-w-2xl mx-auto space-y-6">

            {/* ── MCQ MODE ─────────────────────────────────────────────── */}
            {isMcqMode && (
              <>
                {mcqComplete ? (
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
                  onNext={isMultiplayerSession ? undefined : handleMcqNext}
                  timedOut={mcqTimedOut}
                />
              )}
              </>
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

        {/* Right: team chat or agent panel */}
        <div
          className={`md:w-80 lg:w-96 border-l border-[var(--dark-border)] flex flex-col ${
            activeTab !== "chat" ? "hidden md:flex" : "flex-1 md:flex-none"
          }`}
        >
          {/* Tab toggle — shown when team has both humans and agents, or just to switch views */}
          {humanTeammates.length > 0 && (
            <div className="flex border-b border-[var(--dark-border)] shrink-0">
              <button
                onClick={() => setRightPanelTab("teamchat")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-semibold tracking-widest transition-colors ${
                  rightPanelTab === "teamchat"
                    ? "text-[var(--neon-cyan)] border-b-2 border-[var(--neon-cyan)] -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="w-3 h-3" /> TEAM
              </button>
              <button
                onClick={() => setRightPanelTab("agents")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-semibold tracking-widest transition-colors ${
                  rightPanelTab === "agents"
                    ? "text-[var(--neon-cyan)] border-b-2 border-[var(--neon-cyan)] -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Cpu className="w-3 h-3" /> AGENT
              </button>
            </div>
          )}

          {/* Team chat */}
          {rightPanelTab === "teamchat" && humanTeammates.length > 0 && session && currentUserId ? (
            <TeamChatPanel
              roomCode={roomCode}
              currentUserId={currentUserId}
              currentDisplayName={currentDisplayName}
            />
          ) : (
            <>
              {/* Mobile agent selector — only for all-human teams */}
              {teamAgents.length === 0 && (
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
              )}

              {session && teamAgents.length > 0 ? (
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  {teamAgents.map((p, i) => (
                    <div
                      key={p}
                      className={`flex-1 min-h-0 flex flex-col${i > 0 ? " border-t border-[var(--dark-border)]" : ""}`}
                    >
                      <AgentChatPanel
                        sessionId={session.id}
                        puzzleId={isMcqMode ? (currentMcqQ?.id ?? "mcq") : (puzzle?.id ?? "unknown")}
                        personality={p}
                        playerAttempt={lastAttempt}
                        timeRemainingSeconds={timeRemaining}
                        wrongAnswerCount={wrongAnswerCount}
                        onMessageReceived={() => setHintsUsed(h => h + 1)}
                        onOpeningComplete={(msg) => handleOpeningComplete(p, msg)}
                        peerGreeting={peerGreetings[p] ?? null}
                      />
                    </div>
                  ))}
                </div>
              ) : session ? (
                <AgentChatPanel
                  sessionId={session.id}
                  puzzleId={isMcqMode ? (currentMcqQ?.id ?? "mcq") : (puzzle?.id ?? "unknown")}
                  personality={selectedAgent}
                  playerAttempt={lastAttempt}
                  timeRemainingSeconds={timeRemaining}
                  wrongAnswerCount={wrongAnswerCount}
                  onMessageReceived={() => setHintsUsed(h => h + 1)}
                />
              ) : null}
            </>
          )}
        </div>
      </main>
    </>
  );
}
