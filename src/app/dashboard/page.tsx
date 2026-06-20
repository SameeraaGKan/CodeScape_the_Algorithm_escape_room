"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { getSupabaseBrowser } from "@/lib/db/supabase";
import type { UserResponse } from "@supabase/supabase-js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import { BarChart2, Loader2, Users, Cpu, TrendingUp } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";

type PuzzleStat = {
  puzzleId: string;
  avgAttempts: number;
  avgHints: number;
  totalAttempts: number;
  correctCount: number;
};

type SkillDist = {
  category: string;
  avgTheta: number;
  playerCount: number;
};

type SessionStat = {
  status: string;
  count: number;
};

type Analytics = {
  puzzleStats: PuzzleStat[];
  skillDistribution: SkillDist[];
  sessionStats: SessionStat[];
};

const PUZZLE_LABELS: Record<string, string> = {
  caesar_cipher_01: "Caesar Cipher",
  bubble_sort_01: "Bubble Sort",
  binary_search_01: "Binary Search",
  factorial_trace_01: "Factorial Trace",
  bfs_maze_01: "BFS Maze",
  stack_brackets_01: "Stack Brackets",
};

const NEON_CYAN = "#05b9b6";
const NEON_MAGENTA = "#ff00cc";
const NEON_GREEN = "#00ff88";

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-[var(--dark-border)] rounded p-3 text-xs text-muted-foreground space-y-1">
      <p className="text-foreground font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getSupabaseBrowser().auth.getUser().then(({ data: { user } }: UserResponse) => {
      if (!user) router.push("/register");
    });
  }, [router]);

  useEffect(() => {
    fetch("/api/ml/analytics")
      .then((r) => r.json())
      .then((d) => {
        setAnalytics(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load analytics.");
        setLoading(false);
      });
  }, []);

  const totalSessions =
    analytics?.sessionStats.reduce((s, r) => s + Number(r.count), 0) ?? 0;
  const completedSessions =
    analytics?.sessionStats.find((s) => s.status === "completed")?.count ?? 0;

  // Format puzzle stats for chart
  const puzzleChartData =
    analytics?.puzzleStats.map((p) => ({
      name: PUZZLE_LABELS[p.puzzleId] ?? p.puzzleId,
      "Avg Attempts": parseFloat(String(p.avgAttempts || 0)).toFixed(1),
      "Avg Hints": parseFloat(String(p.avgHints || 0)).toFixed(1),
      "Success Rate": p.totalAttempts
        ? Math.round((Number(p.correctCount) / Number(p.totalAttempts)) * 100)
        : 0,
    })) ?? [];

  // Skill radar data
  const radarData =
    analytics?.skillDistribution.map((s) => ({
      subject: s.category.charAt(0).toUpperCase() + s.category.slice(1),
      theta: parseFloat(String(s.avgTheta || 0)).toFixed(2),
      players: s.playerCount,
    })) ?? [];

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-6 lg:px-12 pt-24 pb-20 max-w-screen-2xl mx-auto">
        <div className="space-y-14 animate-slide-up">
          {/* Header */}
          <div>
            <BackButton className="mb-4" />
            <div className="inline-flex items-center gap-2 text-xs text-[var(--neon-cyan)] tracking-widest mb-3">
              <BarChart2 className="w-3.5 h-3.5" />
              ANALYTICS DASHBOARD
            </div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-black text-foreground">
              PLAYER{" "}
              <span className="text-[var(--neon-cyan)] glow-cyan">
                PERFORMANCE
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Aggregated metrics across all CodeEscape sessions
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 text-[var(--neon-cyan)] animate-spin" />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {analytics && !loading && (
            <>
              {/* Summary stats */}
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  {
                    icon: <Users className="w-6 h-6" />,
                    label: "TOTAL SESSIONS",
                    value: totalSessions,
                    color: NEON_CYAN,
                  },
                  {
                    icon: <TrendingUp className="w-6 h-6" />,
                    label: "COMPLETED",
                    value: completedSessions,
                    color: NEON_GREEN,
                  },
                  {
                    icon: <Cpu className="w-6 h-6" />,
                    label: "PUZZLE CATEGORIES",
                    value: analytics.skillDistribution.length,
                    color: NEON_MAGENTA,
                  },
                ].map(({ icon, label, value, color }) => (
                  <div
                    key={label}
                    className="p-8 rounded border border-[var(--dark-border)] bg-[var(--dark-card)]"
                  >
                    <div style={{ color }} className="mb-4">
                      {icon}
                    </div>
                    <div
                      className="font-[family-name:var(--font-orbitron)] text-5xl font-black mb-2"
                      style={{ color }}
                    >
                      {value}
                    </div>
                    <div className="text-xs text-muted-foreground tracking-widest">
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Puzzle charts — 2 columns */}
              {puzzleChartData.length > 0 && (
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Difficulty chart */}
                  <div className="p-8 rounded border border-[var(--dark-border)] bg-[var(--dark-card)]">
                    <h2 className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-foreground mb-8">
                      AVG ATTEMPTS & HINTS
                    </h2>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={puzzleChartData} margin={{ top: 4, right: 8, left: -10, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a2a2a" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "#6b7280", fontSize: 10 }}
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Avg Attempts" fill={NEON_CYAN} fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="Avg Hints" fill={NEON_MAGENTA} fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Success rate chart */}
                  <div className="p-8 rounded border border-[var(--dark-border)] bg-[var(--dark-card)]">
                    <h2 className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-foreground mb-8">
                      SUCCESS RATE (%)
                    </h2>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={puzzleChartData} margin={{ top: 4, right: 8, left: -10, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a2a2a" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "#6b7280", fontSize: 10 }}
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Success Rate" fill={NEON_GREEN} fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Skill distribution */}
              {radarData.length > 0 && (
                <div className="p-8 rounded border border-[var(--dark-border)] bg-[var(--dark-card)]">
                  <h2 className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-foreground mb-8">
                    SKILL DISTRIBUTION (AVG θ BY CATEGORY)
                  </h2>
                  <div className="flex flex-col md:flex-row gap-10 items-center">
                    <ResponsiveContainer width="100%" height={380}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#1a2a2a" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: "#9ca3af", fontSize: 12 }}
                        />
                        <Radar
                          name="Avg θ"
                          dataKey="theta"
                          stroke={NEON_CYAN}
                          fill={NEON_CYAN}
                          fillOpacity={0.2}
                        />
                        <Tooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="space-y-4 shrink-0 min-w-[220px]">
                      {radarData.map((d) => (
                        <div key={d.subject} className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: NEON_CYAN }}
                          />
                          <span className="text-sm text-muted-foreground w-28">
                            {d.subject}
                          </span>
                          <span className="text-sm font-mono text-[var(--neon-cyan)]">
                            θ = {d.theta}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({d.players} players)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {analytics.puzzleStats.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <BarChart2 className="w-10 h-10 mx-auto mb-4 opacity-30" />
                  <p>No puzzle data yet. Play a game to see analytics.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
