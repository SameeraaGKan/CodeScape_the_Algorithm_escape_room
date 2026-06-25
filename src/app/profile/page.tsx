"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { getSupabaseBrowser } from "@/lib/db/supabase";
import type { UserResponse } from "@supabase/supabase-js";
import { BackButton } from "@/components/ui/BackButton";
import {
  User2, Mail, Calendar, Trophy, Gamepad2, Map, Save, Loader2,
  ChevronDown, ChevronUp, BookOpen,
} from "lucide-react";

const AVATAR_COLORS = [
  { value: "#05b9b6", label: "Cyan" },
  { value: "#ff00cc", label: "Magenta" },
  { value: "#0066ff", label: "Blue" },
  { value: "#00ff88", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#a855f7", label: "Purple" },
];

type ProfileStats = {
  gamesCreated: number;
  gamesCompleted: number;
  pathsTried: number;
  paths: string[];
  memberSince: string;
  email: string;
  displayName: string;
  avatarColor: string;
  error?: string;
};

type WrongAnswerRecord = {
  questionId: string;
  sectionIdx: number;
  passage?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  userAnswer: number | null;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
};

type SectionScoreRecord = {
  label: string;
  score: number;
  correct: number;
  total: number;
};

type GmatResultRecord = {
  id: string;
  pathId: string;
  testNum: number | null;
  totalScore: number;
  sectionScores: SectionScoreRecord[];
  wrongAnswers: WrongAnswerRecord[];
  completedAt: string;
};

function pathLabel(id: string): string {
  return id.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function gmatTestLabel(result: GmatResultRecord): string {
  if (result.pathId === "gmat_full_test") return "Full Adaptive Test";
  if (result.testNum) return `Practice Test ${result.testNum}`;
  return pathLabel(result.pathId);
}

function gmatScoreColor(score: number): string {
  if (score >= 705) return "#ff00cc";
  if (score >= 655) return "#0066ff";
  if (score >= 605) return "#05b9b6";
  if (score >= 555) return "#f59e0b";
  return "#94a3b8";
}

export default function ProfilePage() {
  const router = useRouter();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarColor, setAvatarColor] = useState("#05b9b6");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gmatHistory, setGmatHistory] = useState<GmatResultRecord[]>([]);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    sb.auth.getUser().then(({ data: { user } }: UserResponse) => {
      if (!user) { router.push("/register"); return; }
    });

    Promise.all([
      fetch("/api/profile").then(r => r.json()),
      fetch("/api/gmat-results").then(r => r.json()).catch(() => ({ results: [] })),
    ]).then(([profileData, gmatData]: [ProfileStats, { results?: GmatResultRecord[] }]) => {
      if (profileData.error) { router.push("/register"); return; }
      setStats(profileData);
      setDisplayName(profileData.displayName ?? "");
      setAvatarColor(profileData.avatarColor || "#05b9b6");
      setGmatHistory(gmatData.results ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  async function handleSave() {
    setSaving(true);
    const sb = getSupabaseBrowser();
    await sb.auth.updateUser({
      data: { display_name: displayName.trim(), avatar_color: avatarColor },
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const initial = (displayName || stats?.email || "?")[0].toUpperCase();
  const memberSince = stats?.memberSince
    ? new Date(stats.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[var(--neon-cyan)] animate-spin" />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 pt-24 pb-16 max-w-3xl mx-auto">
        <div className="space-y-8 animate-slide-up">
          {/* Header */}
          <div>
            <BackButton className="mb-4" />
            <div className="inline-flex items-center gap-2 text-xs text-[var(--neon-cyan)] tracking-widest mb-3">
              <User2 className="w-3.5 h-3.5" />
              PLAYER PROFILE
            </div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-black text-foreground">
              YOUR{" "}
              <span className="text-[var(--neon-cyan)] glow-cyan">PROFILE</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Customize your identity and track your progress
            </p>
          </div>

          {/* Avatar + Identity */}
          <div className="p-6 rounded border border-[var(--dark-border)] bg-[var(--dark-card)] flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4 shrink-0">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center font-[family-name:var(--font-orbitron)] text-3xl font-black text-black select-none"
                style={{
                  background: avatarColor,
                  boxShadow: `0 0 28px ${avatarColor}55, 0 0 8px ${avatarColor}88`,
                }}
              >
                {initial}
              </div>
              <div className="flex gap-2">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setAvatarColor(c.value)}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: c.value,
                      outline: avatarColor === c.value ? "2px solid white" : "2px solid transparent",
                      outlineOffset: "2px",
                    }}
                    aria-label={c.label}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground tracking-widest">AVATAR COLOR</span>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-[10px] text-muted-foreground tracking-widest block mb-1.5">
                  DISPLAY NAME
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Enter your display name…"
                  maxLength={32}
                  className="w-full bg-background border border-[var(--dark-border)] rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--neon-cyan)] transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{stats?.email}</span>
              </div>
              {memberSince && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 shrink-0 text-muted-foreground" />
                  Member since {memberSince}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: <Gamepad2 className="w-5 h-5" />,
                label: "GAMES CREATED",
                value: stats?.gamesCreated ?? 0,
                color: "#05b9b6",
              },
              {
                icon: <Trophy className="w-5 h-5" />,
                label: "COMPLETED",
                value: stats?.gamesCompleted ?? 0,
                color: "#00ff88",
              },
              {
                icon: <Map className="w-5 h-5" />,
                label: "PATHS EXPLORED",
                value: stats?.pathsTried ?? 0,
                color: "#ff00cc",
              },
            ].map(({ icon, label, value, color }) => (
              <div
                key={label}
                className="p-4 rounded border border-[var(--dark-border)] bg-[var(--dark-card)] text-center"
              >
                <div style={{ color }} className="flex justify-center mb-2">
                  {icon}
                </div>
                <div
                  className="font-[family-name:var(--font-orbitron)] text-2xl font-black mb-1"
                  style={{ color }}
                >
                  {value}
                </div>
                <div className="text-[10px] text-muted-foreground tracking-widest">{label}</div>
              </div>
            ))}
          </div>

          {/* Paths explored */}
          {stats?.paths && stats.paths.length > 0 && (
            <div className="p-5 rounded border border-[var(--dark-border)] bg-[var(--dark-card)]">
              <div className="text-[10px] text-muted-foreground tracking-widest mb-3">
                PATHS EXPLORED
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.paths.map(p => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded text-xs border border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/5"
                  >
                    {pathLabel(p)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* GMAT Test History */}
          {gmatHistory.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground tracking-widest">
                <BookOpen className="w-3.5 h-3.5" />
                GMAT TEST HISTORY
              </div>
              {gmatHistory.map((result) => {
                const color = gmatScoreColor(result.totalScore);
                const isExpanded = expandedResult === result.id;
                const wrongCount = result.wrongAnswers.length;
                const date = new Date(result.completedAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                });
                return (
                  <div
                    key={result.id}
                    className="rounded border border-[var(--dark-border)] bg-[var(--dark-card)] overflow-hidden"
                  >
                    {/* Header row */}
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground tracking-widest mb-0.5">{date}</div>
                        <div className="font-semibold text-foreground text-sm truncate">
                          {gmatTestLabel(result)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {wrongCount} wrong · {result.sectionScores.length} sections
                        </div>
                      </div>
                      <div className="shrink-0 text-center">
                        <div
                          className="font-[family-name:var(--font-orbitron)] text-2xl font-black tabular-nums"
                          style={{ color }}
                        >
                          {result.totalScore}
                        </div>
                        <div className="text-[10px] text-muted-foreground">/ 805</div>
                      </div>
                      <button
                        onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--dark-border)] text-xs text-muted-foreground hover:border-[var(--neon-cyan)] hover:text-[var(--neon-cyan)] transition-all"
                      >
                        Review {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Section scores */}
                    {result.sectionScores.length > 0 && (
                      <div className="px-4 pb-3 flex gap-3">
                        {result.sectionScores.map((s, i) => (
                          <div key={i} className="flex-1 p-2 rounded border border-[var(--dark-border)] text-center">
                            <div className="text-[10px] text-muted-foreground tracking-widest truncate mb-0.5">
                              {s.label.split(" ")[0]}
                            </div>
                            <div className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-[var(--neon-cyan)]">
                              {s.score}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{s.correct}/{s.total}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expanded wrong-answer review */}
                    {isExpanded && (
                      <div className="border-t border-[var(--dark-border)] p-4 space-y-4 bg-background/40">
                        <div className="text-xs text-muted-foreground tracking-widest">
                          WRONG ANSWERS ({wrongCount}) — REVIEW &amp; EXPLANATIONS
                        </div>
                        {wrongCount === 0 ? (
                          <p className="text-sm text-emerald-400">Perfect test! No wrong answers.</p>
                        ) : (
                          result.wrongAnswers.map((w, j) => (
                            <div key={j} className="space-y-2 pb-4 border-b border-[var(--dark-border)] last:border-0 last:pb-0">
                              <div className="text-[10px] text-muted-foreground tracking-widest">
                                {["Quantitative", "Verbal", "Data Insights"][w.sectionIdx] ?? "Section"} · {w.difficulty}
                              </div>
                              {w.passage && (
                                <div className="p-3 rounded bg-[var(--neon-cyan)]/5 border border-[var(--neon-cyan)]/15">
                                  <div className="text-[10px] text-[var(--neon-cyan)] tracking-widest mb-1">PASSAGE</div>
                                  <p className="text-xs text-foreground/80 leading-relaxed line-clamp-4">{w.passage}</p>
                                </div>
                              )}
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{w.question}</p>
                              <div className="grid gap-1.5">
                                {w.options.map((opt, oi) => {
                                  const isCorrect = w.correctAnswer === oi;
                                  const isYours = w.userAnswer === oi;
                                  return (
                                    <div
                                      key={oi}
                                      className={`flex items-start gap-2 p-2 rounded text-xs
                                        ${isCorrect ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" :
                                         isYours ? "bg-red-500/10 border border-red-500/30 text-red-400" :
                                         "border border-transparent text-muted-foreground"}`}
                                    >
                                      <span className="font-bold shrink-0">{String.fromCharCode(65 + oi)}.</span>
                                      <span>{opt}</span>
                                      {isCorrect && <span className="ml-auto shrink-0 font-bold">✓ Correct</span>}
                                      {isYours && !isCorrect && <span className="ml-auto shrink-0 font-bold">✗ Your answer</span>}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="p-3 rounded border border-[var(--dark-border)] bg-card">
                                <div className="text-[10px] text-[var(--neon-cyan)] tracking-widest mb-1">EXPLANATION</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{w.explanation}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex items-center gap-2 px-6 py-2.5 rounded border border-[var(--neon-cyan)] text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10 transition-all box-glow-cyan text-sm font-semibold tracking-wider disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              "✓ SAVED"
            ) : (
              <>
                <Save className="w-4 h-4" />
                SAVE PROFILE
              </>
            )}
          </button>
        </div>
      </main>
    </>
  );
}
