"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/db/supabase";
import type { UserResponse } from "@supabase/supabase-js";
import type { MCQQuestion } from "@/types";
import {
  Clock, Flag, ChevronLeft, ChevronRight, CheckCircle,
  AlertCircle, SkipForward, BookOpen, Loader2,
} from "lucide-react";

// ── GMAT Focus Edition constants ──────────────────────────────────────────────
const SECTIONS = [
  { pathId: "gmat_quant",          label: "Quantitative Reasoning", count: 21, timeSecs: 45 * 60 },
  { pathId: "gmat_verbal",         label: "Verbal Reasoning",       count: 23, timeSecs: 45 * 60 },
  { pathId: "gmat_data_insights",  label: "Data Insights",          count: 20, timeSecs: 45 * 60 },
] as const;

const BREAK_SECS = 10 * 60; // 10 minutes
const DIFFICULTY_WEIGHTS = { easy: 0.8, medium: 1.0, hard: 1.3 } as const;

// ── Types ────────────────────────────────────────────────────────────────────
type QEntry = { question: MCQQuestion; answer: number | null; flagged: boolean };

type Phase =
  | "loading"
  | "intro"
  | "section"
  | "review"
  | "break"
  | "results";

type SectionResult = { label: string; score: number; correct: number; total: number };

// ── Helpers ──────────────────────────────────────────────────────────────────
function adaptivePick(pool: MCQQuestion[], usedIds: Set<string>, skill: number): MCQQuestion | null {
  const target = skill > 0.6 ? "hard" : skill < -0.6 ? "easy" : "medium";
  const order: ("easy" | "medium" | "hard")[] =
    target === "hard"  ? ["hard",   "medium", "easy"]  :
    target === "easy"  ? ["easy",   "medium", "hard"]  :
                         ["medium", "hard",   "easy"];
  for (const d of order) {
    const cands = pool.filter(q => !usedIds.has(q.id) && q.difficulty === d);
    if (cands.length) return cands[Math.floor(Math.random() * cands.length)];
  }
  return null;
}

function sectionScore(entries: QEntry[]): number {
  let wCorrect = 0, wTotal = 0;
  for (const e of entries) {
    const w = DIFFICULTY_WEIGHTS[e.question.difficulty];
    wTotal += w;
    if (e.answer === e.question.answer) wCorrect += w;
  }
  return Math.round(60 + (wTotal > 0 ? wCorrect / wTotal : 0) * 30);
}

function totalScore(scores: number[]): number {
  // Official GMAT Focus Edition: 205–805, all values end in 5, equally weighted sections
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const raw = ((avg - 60) / 30) * 600 + 205;
  const rounded = Math.round((raw - 5) / 10) * 10 + 5;
  return Math.max(205, Math.min(805, rounded));
}

type GradeBand = { label: string; percentile: string; color: string; bg: string; border: string };

// Percentile bands from official GMAC data (Aug 2024)
// 505 ≈ 28th · 555 ≈ 49th · 605 ≈ 72nd · 655 ≈ 91st · 705+ ≈ 98th+
function gradeFor(score: number): GradeBand {
  if (score >= 705) return { label: "Exceptional", percentile: "98th+ percentile", color: "#ff00cc", bg: "rgba(255,0,204,0.08)",  border: "rgba(255,0,204,0.4)"  };
  if (score >= 655) return { label: "Excellent",   percentile: "91st–97th percentile", color: "#0066ff", bg: "rgba(0,102,255,0.08)",  border: "rgba(0,102,255,0.4)"  };
  if (score >= 605) return { label: "Strong",      percentile: "72nd–90th percentile", color: "#05b9b6", bg: "rgba(5,185,182,0.08)",  border: "rgba(5,185,182,0.4)"  };
  if (score >= 555) return { label: "Competitive", percentile: "49th–71st percentile", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.4)" };
  if (score >= 505) return { label: "Average",     percentile: "28th–48th percentile", color: "#94a3b8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.3)" };
  if (score >= 455) return { label: "Below Avg",   percentile: "12th–27th percentile", color: "#f97316", bg: "rgba(249,115,22,0.06)",  border: "rgba(249,115,22,0.3)"  };
  return               { label: "Developing",  percentile: "Below 12th percentile",color: "#64748b", bg: "rgba(100,116,139,0.06)", border: "rgba(100,116,139,0.3)" };
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function GmatTestPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [loadError, setLoadError] = useState("");

  // Question pools (one per section)
  const [pools, setPools] = useState<[MCQQuestion[], MCQQuestion[], MCQQuestion[]]>([[], [], []]);

  // Current section
  const [sIdx, setSIdx] = useState(0);
  const [served, setServed] = useState<QEntry[]>([]);
  const [curQ, setCurQ] = useState(0);
  const [skillLevel, setSkillLevel] = useState(0);
  const sectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [secTimer, setSecTimer] = useState(45 * 60);

  // Break
  const breakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [breakTimer, setBreakTimer] = useState(BREAK_SECS);
  const [breakExpired, setBreakExpired] = useState(false);

  // Results
  const [results, setResults] = useState<SectionResult[]>([]);

  // Admin-only guard
  useEffect(() => {
    getSupabaseBrowser().auth.getUser().then(({ data: { user } }: UserResponse) => {
      if (!user || user.email !== "sameeraagk883@gmail.com") router.push("/");
    });
  }, [router]);

  // Init: load session + all 3 question pools
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/rooms?code=${roomCode}`);
        if (!res.ok) { setLoadError("Session not found."); setPhase("loading"); return; }

        const [qRes, vRes, dRes] = await Promise.all([
          fetch("/api/questions?path=gmat_quant"),
          fetch("/api/questions?path=gmat_verbal"),
          fetch("/api/questions?path=gmat_data_insights"),
        ]);
        const [qD, vD, dD] = await Promise.all([qRes.json(), vRes.json(), dRes.json()]);
        setPools([qD.questions ?? [], vD.questions ?? [], dD.questions ?? []]);
        setPhase("intro");
      } catch {
        setLoadError("Failed to load test.");
      }
    })();
  }, [roomCode]);

  // Section timer
  useEffect(() => {
    if (phase !== "section") { clearInterval(sectionTimerRef.current!); return; }
    clearInterval(sectionTimerRef.current!);
    sectionTimerRef.current = setInterval(() => {
      setSecTimer(t => {
        if (t <= 1) {
          clearInterval(sectionTimerRef.current!);
          setPhase("review"); // time expired → force review
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(sectionTimerRef.current!);
  }, [phase, sIdx]);

  // Break timer
  useEffect(() => {
    if (phase !== "break") { clearInterval(breakTimerRef.current!); return; }
    setBreakExpired(false);
    clearInterval(breakTimerRef.current!);
    breakTimerRef.current = setInterval(() => {
      setBreakTimer(t => {
        if (t <= 1) {
          clearInterval(breakTimerRef.current!);
          setBreakExpired(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(breakTimerRef.current!);
  }, [phase]);

  // ── Section management ──────────────────────────────────────────────────────
  function beginSection(idx: number) {
    clearInterval(sectionTimerRef.current!);
    setSIdx(idx);
    setSkillLevel(0);
    setSecTimer(SECTIONS[idx].timeSecs);

    const pool = pools[idx];
    const first = adaptivePick(pool, new Set(), 0);
    setServed(first ? [{ question: first, answer: null, flagged: false }] : []);
    setCurQ(0);
    setPhase("section");
  }

  function submitSection() {
    clearInterval(sectionTimerRef.current!);
    const sec = SECTIONS[sIdx];
    const score = sectionScore(served);
    const correct = served.filter(e => e.answer === e.question.answer).length;
    const result: SectionResult = { label: sec.label, score, correct, total: served.length };
    const newResults = [...results, result];
    setResults(newResults);

    if (sIdx < 2) {
      setBreakTimer(BREAK_SECS);
      setPhase("break");
    } else {
      finalizeTest(newResults);
    }
  }

  async function finalizeTest(finalResults: SectionResult[]) {
    const scores = finalResults.map(r => r.score);
    while (scores.length < 3) scores.push(60); // pad incomplete test
    const total = totalScore(scores);
    await fetch("/api/rooms/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, finalScore: total }),
    });
    setPhase("results");
  }

  // ── Question navigation ─────────────────────────────────────────────────────
  function handleAnswer(idx: number) {
    const updated = [...served];
    const old = updated[curQ].answer;
    updated[curQ] = { ...updated[curQ], answer: idx };
    setServed(updated);
    // Update skill based on correctness change
    const q = updated[curQ].question;
    const wasCorrect = old === q.answer;
    const isCorrect = idx === q.answer;
    if (!wasCorrect && isCorrect) setSkillLevel(s => Math.min(2, s + 0.3));
    if (wasCorrect && !isCorrect) setSkillLevel(s => Math.max(-2, s - 0.3));
    if (old === null && isCorrect) setSkillLevel(s => Math.min(2, s + 0.3));
    if (old === null && !isCorrect) setSkillLevel(s => Math.max(-2, s - 0.3));
  }

  function handleFlag() {
    const updated = [...served];
    updated[curQ] = { ...updated[curQ], flagged: !updated[curQ].flagged };
    setServed(updated);
  }

  function goNext() {
    if (curQ < served.length - 1) {
      setCurQ(c => c + 1);
      return;
    }
    const targetCount = SECTIONS[sIdx].count;
    if (served.length >= targetCount) {
      setPhase("review");
      return;
    }
    const usedIds = new Set(served.map(e => e.question.id));
    const next = adaptivePick(pools[sIdx], usedIds, skillLevel);
    if (!next) { setPhase("review"); return; }
    setServed(prev => [...prev, { question: next, answer: null, flagged: false }]);
    setCurQ(c => c + 1);
  }

  function goPrev() { if (curQ > 0) setCurQ(c => c - 1); }

  const timerPct = (secTimer / SECTIONS[Math.min(sIdx, 2)].timeSecs) * 100;
  const timerColor = timerPct > 50 ? "var(--neon-cyan)" : timerPct > 20 ? "#f59e0b" : "#dc2626";

  // ── Render phases ─────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        {loadError ? (
          <><AlertCircle className="w-8 h-8 text-red-500" /><p className="text-muted-foreground">{loadError}</p></>
        ) : (
          <><Loader2 className="w-8 h-8 text-[var(--neon-cyan)] animate-spin" /><p className="text-xs text-muted-foreground tracking-widest">LOADING TEST...</p></>
        )}
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-2">
            <div className="text-xs text-[var(--neon-cyan)] tracking-[0.3em] font-[family-name:var(--font-orbitron)]">GMAT FOCUS EDITION</div>
            <h1 className="text-3xl font-black font-[family-name:var(--font-orbitron)] text-foreground">FULL ADAPTIVE TEST</h1>
            <p className="text-sm text-muted-foreground">3 sections · 64 questions · 2h 15m total</p>
          </div>

          {/* Section overview */}
          <div className="space-y-3">
            {SECTIONS.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded border border-[var(--dark-border)] bg-card">
                <div>
                  <div className="text-sm font-semibold text-foreground">Section {i + 1}: {s.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.count} questions · Adaptive difficulty</div>
                </div>
                <div className="flex items-center gap-2 text-[var(--neon-cyan)] text-sm font-[family-name:var(--font-orbitron)]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>45:00</span>
                </div>
              </div>
            ))}
          </div>

          {/* Rules */}
          <div className="p-4 rounded border border-[var(--dark-border)] bg-card space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground text-sm">Rules</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Questions adapt to your performance — harder when you&apos;re doing well</li>
              <li>Navigate freely within each section using the question panel</li>
              <li>Flag questions for review before submitting a section</li>
              <li>Optional 10-minute break between sections</li>
              <li>No agent assistance — this is solo mode</li>
            </ul>
          </div>

          <button
            onClick={() => beginSection(0)}
            className="w-full py-4 bg-[var(--neon-cyan)] text-black font-black tracking-widest text-sm rounded hover:bg-[var(--neon-cyan)]/90 transition-all box-glow-cyan font-[family-name:var(--font-orbitron)]"
          >
            BEGIN TEST →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "section" || phase === "review") {
    const sec = SECTIONS[sIdx];
    const entry = served[curQ];
    const answeredCount = served.filter(e => e.answer !== null).length;
    const flaggedCount = served.filter(e => e.flagged).length;
    const isDS = entry?.question.options.length === 5;

    if (phase === "review") {
      return (
        <div className="min-h-screen bg-background flex flex-col">
          {/* Review header */}
          <div className="border-b border-[var(--dark-border)] bg-background/90 px-6 py-4">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground tracking-widest">SECTION {sIdx + 1} OF 3 — REVIEW</div>
                <h2 className="font-[family-name:var(--font-orbitron)] font-bold text-foreground">{sec.label}</h2>
              </div>
              <div className="text-sm text-muted-foreground">
                {answeredCount} / {served.length} answered · {flaggedCount} flagged
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Navigator grid */}
              <div className="p-4 rounded border border-[var(--dark-border)] bg-card">
                <p className="text-xs text-muted-foreground tracking-widest mb-3">QUESTION OVERVIEW — click to revisit</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: sec.count }, (_, i) => {
                    const e = served[i];
                    const hasAnswer = e?.answer !== null && e?.answer !== undefined;
                    const isFlagged = e?.flagged;
                    const isServed = i < served.length;
                    return (
                      <button
                        key={i}
                        onClick={() => { if (isServed) { setCurQ(i); setPhase("section"); } }}
                        title={`Q${i + 1}${isFlagged ? " (flagged)" : ""}${!hasAnswer && isServed ? " (unanswered)" : ""}`}
                        className={`w-10 h-10 rounded text-xs font-bold font-[family-name:var(--font-orbitron)] border transition-all
                          ${!isServed ? "border-[var(--dark-border)] text-muted-foreground/30 cursor-not-allowed" :
                          isFlagged ? "border-amber-400 bg-amber-400/10 text-amber-400" :
                          hasAnswer ? "border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]" :
                          "border-red-500/50 bg-red-500/10 text-red-400"}`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span><span className="inline-block w-3 h-3 rounded border border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 mr-1" />Answered</span>
                  <span><span className="inline-block w-3 h-3 rounded border border-amber-400 bg-amber-400/10 mr-1" />Flagged</span>
                  <span><span className="inline-block w-3 h-3 rounded border border-red-500/50 bg-red-500/10 mr-1" />Unanswered</span>
                </div>
              </div>

              {/* Unanswered warning */}
              {answeredCount < served.length && (
                <div className="flex items-center gap-2 p-3 rounded border border-amber-400/30 bg-amber-400/5 text-amber-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{served.length - answeredCount} question{served.length - answeredCount !== 1 ? "s" : ""} unanswered. You can go back and answer them.</span>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setCurQ(served.length - 1); setPhase("section"); }}
                  className="px-5 py-2 rounded border border-[var(--dark-border)] text-foreground text-sm hover:border-[var(--neon-cyan)] transition-all"
                >
                  ← Return to Questions
                </button>
                <button
                  onClick={submitSection}
                  className="px-6 py-2 rounded bg-[var(--neon-cyan)] text-black font-bold text-sm tracking-widest hover:bg-[var(--neon-cyan)]/90 transition-all font-[family-name:var(--font-orbitron)]"
                >
                  SUBMIT SECTION →
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Active section view
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Section header */}
        <header className="border-b border-[var(--dark-border)] bg-background/90 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground tracking-widest">SECTION {sIdx + 1} OF 3</div>
              <div className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-foreground truncate">{sec.label}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground tabular-nums">Q{curQ + 1}/{sec.count}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0" style={{ color: timerColor }}>
              <Clock className="w-3.5 h-3.5" />
              <span className="font-[family-name:var(--font-orbitron)] text-sm font-bold tabular-nums">{fmtTime(secTimer)}</span>
            </div>
          </div>
          <div className="h-0.5 bg-[var(--dark-border)]">
            <div className="h-full transition-all duration-1000" style={{ width: `${timerPct}%`, backgroundColor: timerColor }} />
          </div>
        </header>

        {/* Main layout: question + navigator */}
        <div className="flex flex-1 overflow-hidden max-w-5xl mx-auto w-full">
          {/* Question area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {entry && (
              <>
                {/* Difficulty badge */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded border uppercase tracking-wider font-[family-name:var(--font-orbitron)]
                    ${entry.question.difficulty === "easy" ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" :
                     entry.question.difficulty === "hard" ? "border-[var(--neon-magenta)]/40 text-[var(--neon-magenta)] bg-[var(--neon-magenta)]/10" :
                     "border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10"}`}
                  >
                    {entry.question.difficulty}
                  </span>
                  {entry.flagged && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <Flag className="w-3.5 h-3.5" fill="currentColor" /> Flagged
                    </span>
                  )}
                </div>

                {/* Question text */}
                <div className="p-5 rounded border border-[var(--dark-border)] bg-card">
                  <p className="text-foreground leading-relaxed whitespace-pre-line text-sm">{entry.question.question}</p>
                </div>

                {/* Options */}
                <div className={`grid gap-3 ${isDS ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                  {entry.question.options.map((opt, i) => {
                    const isSelected = entry.answer === i;
                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        className={`flex items-start gap-3 p-4 rounded border text-left text-sm transition-all cursor-pointer
                          ${isSelected
                            ? "border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 text-foreground"
                            : "border-[var(--dark-border)] bg-card text-foreground hover:border-[var(--neon-cyan)]/50 hover:bg-[var(--neon-cyan)]/5"
                          }`}
                      >
                        <span className={`shrink-0 w-6 h-6 rounded border flex items-center justify-center text-xs font-bold font-[family-name:var(--font-orbitron)]
                          ${isSelected ? "border-[var(--neon-cyan)] text-[var(--neon-cyan)]" : "border-current"}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1 leading-relaxed">{opt}</span>
                        {isSelected && <CheckCircle className="shrink-0 w-4 h-4 text-[var(--neon-cyan)] mt-0.5" />}
                      </button>
                    );
                  })}
                </div>

                {/* Action bar */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={goPrev}
                      disabled={curQ === 0}
                      className="flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--dark-border)] text-xs text-muted-foreground hover:border-[var(--neon-cyan)] hover:text-[var(--neon-cyan)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <button
                      onClick={handleFlag}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded border text-xs transition-all
                        ${entry.flagged ? "border-amber-400 text-amber-400 bg-amber-400/10" : "border-[var(--dark-border)] text-muted-foreground hover:border-amber-400 hover:text-amber-400"}`}
                    >
                      <Flag className="w-3.5 h-3.5" /> {entry.flagged ? "Unflag" : "Flag"}
                    </button>
                    <button
                      onClick={goNext}
                      className="flex items-center gap-1 px-3 py-1.5 rounded border border-[var(--dark-border)] text-xs text-muted-foreground hover:border-[var(--neon-cyan)] hover:text-foreground transition-all"
                    >
                      <SkipForward className="w-3.5 h-3.5" /> Skip
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPhase("review")}
                      className="px-4 py-1.5 rounded border border-[var(--dark-border)] text-xs text-muted-foreground hover:border-[var(--neon-cyan)] hover:text-[var(--neon-cyan)] transition-all"
                    >
                      Review
                    </button>
                    <button
                      onClick={goNext}
                      className="flex items-center gap-1 px-4 py-1.5 rounded bg-[var(--neon-cyan)] text-black text-xs font-bold hover:bg-[var(--neon-cyan)]/90 transition-all font-[family-name:var(--font-orbitron)]"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Navigator sidebar */}
          <div className="hidden md:flex flex-col w-52 border-l border-[var(--dark-border)] p-3 gap-3">
            <div className="text-[10px] text-muted-foreground tracking-widest">QUESTION PANEL</div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: sec.count }, (_, i) => {
                const e = served[i];
                const isCurrentQ = i === curQ;
                const isServed = i < served.length;
                const hasAns = e?.answer !== null && e?.answer !== undefined;
                const isFlagged = e?.flagged;
                return (
                  <button
                    key={i}
                    onClick={() => { if (isServed) setCurQ(i); }}
                    className={`w-8 h-8 rounded text-[10px] font-bold font-[family-name:var(--font-orbitron)] border transition-all
                      ${isCurrentQ ? "border-[var(--neon-cyan)] bg-[var(--neon-cyan)] text-black" :
                       !isServed ? "border-[var(--dark-border)] text-muted-foreground/30 cursor-not-allowed" :
                       isFlagged ? "border-amber-400 bg-amber-400/10 text-amber-400" :
                       hasAns ? "border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]" :
                       "border-[var(--dark-border)] text-muted-foreground"}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-auto space-y-1.5 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 inline-block" /> Answered</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-amber-400 bg-amber-400/10 inline-block" /> Flagged</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-[var(--dark-border)] inline-block" /> Not reached</div>
            </div>
            <button
              onClick={() => setPhase("review")}
              className="w-full py-2 rounded border border-[var(--dark-border)] text-[10px] text-muted-foreground hover:border-[var(--neon-cyan)] hover:text-[var(--neon-cyan)] transition-all tracking-widest font-[family-name:var(--font-orbitron)]"
            >
              END SECTION
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "break") {
    const nextSec = SECTIONS[sIdx + 1];
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full space-y-8 text-center">
          <div className="space-y-2">
            <CheckCircle className="w-16 h-16 text-[var(--neon-cyan)] mx-auto" />
            <div className="text-xs text-[var(--neon-cyan)] tracking-[0.3em] font-[family-name:var(--font-orbitron)]">SECTION {sIdx + 1} COMPLETE</div>
            <h2 className="text-2xl font-black font-[family-name:var(--font-orbitron)] text-foreground">OPTIONAL BREAK</h2>
            <p className="text-sm text-muted-foreground">Take up to 10 minutes before the next section.</p>
          </div>

          <div className={`inline-block px-8 py-4 rounded border-2 ${breakExpired ? "border-amber-400 text-amber-400" : "border-[var(--neon-cyan)] text-[var(--neon-cyan)]"}`}>
            <div className="text-4xl font-black font-[family-name:var(--font-orbitron)] tabular-nums">{fmtTime(breakTimer)}</div>
            <div className="text-xs tracking-widest mt-1">{breakExpired ? "BREAK EXPIRED" : "REMAINING"}</div>
          </div>

          <div className="p-4 rounded border border-[var(--dark-border)] bg-card text-left">
            <div className="text-xs text-muted-foreground tracking-widest mb-2">NEXT UP</div>
            <div className="font-semibold text-foreground">Section {sIdx + 2}: {nextSec.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{nextSec.count} questions · 45 minutes</div>
          </div>

          <button
            onClick={() => beginSection(sIdx + 1)}
            className="w-full py-4 bg-[var(--neon-cyan)] text-black font-black tracking-widest text-sm rounded hover:bg-[var(--neon-cyan)]/90 transition-all font-[family-name:var(--font-orbitron)]"
          >
            START NEXT SECTION →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "results") {
    const scores = results.map(r => r.score);
    const total = scores.length === 3 ? totalScore(scores) : null;
    const sectionSum = scores.reduce((a, b) => a + b, 0);
    const grade = total !== null ? gradeFor(total) : null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center space-y-2">
            <div className="text-xs text-[var(--neon-cyan)] tracking-[0.3em] font-[family-name:var(--font-orbitron)]">GMAT FOCUS EDITION</div>
            <h1 className="text-3xl font-black font-[family-name:var(--font-orbitron)] text-foreground">YOUR SCORES</h1>

            {total !== null && grade !== null && (
              <div
                className="mt-4 p-6 rounded border-2"
                style={{ background: grade.bg, borderColor: grade.border }}
              >
                {/* Total score */}
                <div className="text-xs text-muted-foreground tracking-widest mb-1">TOTAL SCORE</div>
                <div
                  className="text-7xl font-black font-[family-name:var(--font-orbitron)] tabular-nums leading-none"
                  style={{ color: grade.color }}
                >
                  {total}
                </div>
                <div className="text-xs text-muted-foreground mt-1">out of 805 &nbsp;·&nbsp; section sum {sectionSum} / {scores.length * 90}</div>

                {/* Grade band */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: grade.border }}>
                  <div>
                    <div className="text-[10px] text-muted-foreground tracking-widest mb-0.5">PERFORMANCE BAND</div>
                    <div
                      className="text-xl font-black font-[family-name:var(--font-orbitron)] tracking-wide"
                      style={{ color: grade.color }}
                    >
                      {grade.label.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground tracking-widest mb-0.5">PERCENTILE (GMAC 2024)</div>
                    <div className="text-sm font-semibold" style={{ color: grade.color }}>
                      {grade.percentile}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section breakdowns */}
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="p-4 rounded border border-[var(--dark-border)] bg-card flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground tracking-widest">SECTION {i + 1}</div>
                  <div className="font-semibold text-foreground text-sm">{r.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.correct} / {r.total} correct</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-[family-name:var(--font-orbitron)] text-[var(--neon-cyan)]">{r.score}</div>
                  <div className="text-[10px] text-muted-foreground">/ 90</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded border border-[var(--dark-border)] text-foreground text-sm hover:border-[var(--neon-cyan)] hover:text-[var(--neon-cyan)] transition-all tracking-widest font-[family-name:var(--font-orbitron)]"
          >
            RETURN HOME
          </button>
        </div>
      </div>
    );
  }

  return null;
}
