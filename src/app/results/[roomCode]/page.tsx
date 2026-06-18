"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import {
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  Lightbulb,
  ChevronRight,
  Loader2,
  BarChart2,
} from "lucide-react";

type PuzzleAttempt = {
  puzzleId: string;
  isCorrect: boolean;
  hintsUsed: number;
  timeTakenSeconds: number;
  attemptNumber: number;
};

type SessionData = {
  id: string;
  roomCode: string;
  totalScore: number;
  status: string;
  startedAt: string;
  completedAt?: string;
};

const PUZZLE_TITLES: Record<string, string> = {
  caesar_cipher_01: "The Encrypted Handshake",
  bubble_sort_01: "Corrupted Sort Loop",
  binary_search_01: "The Missing Mid",
  factorial_trace_01: "The Recursive Descent",
  bfs_maze_01: "Algorithm Maze: BFS Escape",
  stack_brackets_01: "The Stack Guardian",
};

export default function ResultsPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = use(params);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/rooms?code=${roomCode}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.session) setSession(d.session);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [roomCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[var(--neon-cyan)] animate-spin" />
      </div>
    );
  }

  const elapsedSeconds = session?.startedAt && session?.completedAt
    ? Math.round(
        (new Date(session.completedAt).getTime() -
          new Date(session.startedAt).getTime()) /
          1000
      )
    : null;

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const complete = session?.status === "completed";

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 pt-24 pb-16 max-w-2xl mx-auto">
        <div className="space-y-10 animate-slide-up">
          {/* Header */}
          <div className="text-center">
            {complete ? (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/40 mb-6">
                  <Trophy className="w-10 h-10 text-[var(--neon-cyan)]" />
                </div>
                <div className="text-xs text-[var(--neon-cyan)] tracking-widest mb-2">
                  ESCAPE SUCCESSFUL
                </div>
                <h1 className="font-[family-name:var(--font-orbitron)] text-4xl font-black text-white">
                  MISSION{" "}
                  <span className="text-[var(--neon-cyan)] glow-cyan">
                    COMPLETE
                  </span>
                </h1>
              </>
            ) : (
              <>
                <div className="text-xs text-gray-600 tracking-widest mb-2">
                  SESSION ENDED
                </div>
                <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-black text-white">
                  RESULTS
                </h1>
              </>
            )}
          </div>

          {/* Stats */}
          {session && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded border border-[var(--dark-border)] bg-[var(--dark-card)] text-center">
                <div className="font-[family-name:var(--font-orbitron)] text-3xl font-black text-[var(--neon-cyan)] glow-cyan mb-1">
                  {session.totalScore.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 tracking-widest">
                  TOTAL SCORE
                </div>
              </div>
              {elapsedSeconds !== null && (
                <div className="p-6 rounded border border-[var(--dark-border)] bg-[var(--dark-card)] text-center">
                  <div className="font-[family-name:var(--font-orbitron)] text-3xl font-black text-white mb-1">
                    {formatDuration(elapsedSeconds)}
                  </div>
                  <div className="text-xs text-gray-500 tracking-widest">
                    TOTAL TIME
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Room code */}
          <div className="p-4 rounded border border-[var(--dark-border)] bg-[var(--dark-card)]">
            <div className="text-xs text-gray-600 tracking-widest mb-1">
              ROOM CODE
            </div>
            <div className="font-[family-name:var(--font-orbitron)] text-2xl font-black text-[var(--neon-cyan)] tracking-widest">
              {roomCode}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-2 py-4 border border-[var(--dark-border)] text-gray-400 hover:border-[var(--neon-cyan)]/40 hover:text-[var(--neon-cyan)] rounded text-sm tracking-widest transition-all"
            >
              <BarChart2 className="w-4 h-4" />
              VIEW ANALYTICS
            </Link>
            <Link
              href="/register"
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-[var(--neon-cyan)] text-black font-bold rounded text-sm tracking-widest hover:bg-[var(--neon-cyan)]/90 transition-all box-glow-cyan"
            >
              PLAY AGAIN
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
