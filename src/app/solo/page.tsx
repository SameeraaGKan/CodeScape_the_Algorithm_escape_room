"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { getSupabaseBrowser } from "@/lib/db/supabase";
import { PATHS, PATH_CATEGORIES } from "@/lib/puzzles/paths";
import { AGENT_CONFIGS } from "@/lib/ai/personalities";
import type { PathId, AgentPersonality } from "@/types";
import { ChevronRight, Terminal } from "lucide-react";

const AGENT_LIST = Object.entries(AGENT_CONFIGS) as [AgentPersonality, (typeof AGENT_CONFIGS)[AgentPersonality]][];

function SoloPageContent() {
  const router = useRouter();

  const [userId, setUserId]   = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [selectedPath, setSelectedPath] = useState<PathId | null>(null);
  const [pathConfirmed, setPathConfirmed] = useState(false);

  const [selectedAgent, setSelectedAgent] = useState<AgentPersonality | null>(null);

  const [starting, setStarting] = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await getSupabaseBrowser().auth.getUser();
      if (!data.user) { setAuthLoading(false); router.push("/register"); return; }
      setUserId(data.user.id);
      setUserName(data.user.email?.split("@")[0] ?? "Player");
      setIsAdmin(data.user.email === "sameeraagk883@gmail.com");
      setAuthLoading(false);
    })();
  }, [router]);

  async function startSolo() {
    if (!selectedPath || !userId) return;
    setStarting(true);
    setError("");

    const { data: { session } } = await getSupabaseBrowser().auth.getSession();

    const slotConfigs = selectedAgent
      ? [{ slotIndex: 1, type: "agent", agentPersonality: selectedAgent }]
      : [];

    const teamRes = await fetch("/api/teams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        teamName: `${userName}'s Solo Run`,
        maxSize: selectedAgent ? 2 : 1,
        creatorName: userName,
        selectedPath,
        gameTrack: "team",
        slotConfigs,
      }),
    });

    const teamData = await teamRes.json();
    if (!teamRes.ok) { setError(teamData.error ?? "Failed to create session."); setStarting(false); return; }

    const roomRes = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: teamData.team.id }),
    });

    const roomData = await roomRes.json();
    if (!roomRes.ok) { setError(roomData.error ?? "Failed to start game."); setStarting(false); return; }

    router.push(`/game/${roomData.roomCode}`);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-xs text-muted-foreground tracking-widest animate-pulse">LOADING...</span>
      </div>
    );
  }

  // ── Step 01: Pick path ───────────────────────────────────
  if (!pathConfirmed) {
    const selectedMeta = selectedPath ? PATHS.find(p => p.id === selectedPath) : null;

    return (
      <>
        <Navbar />

        <div className="fixed top-16 inset-x-0 z-40 border-b border-[var(--dark-border)] bg-background/95 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[var(--neon-cyan)] tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-pulse" />
              STEP 01 OF 02 · SOLO SESSION
            </div>
            <div className="flex items-center gap-3">
              {selectedMeta && (
                <span className="text-xs tracking-widest font-semibold text-[var(--neon-cyan)]">
                  {selectedMeta.icon} {selectedMeta.label}
                </span>
              )}
              <button
                onClick={() => { if (selectedPath) setPathConfirmed(true); }}
                disabled={!selectedPath}
                className="flex items-center gap-2 px-5 py-1.5 text-black font-bold text-xs tracking-widest rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/90 box-glow-cyan"
              >
                {selectedPath ? "CONFIRM PATH →" : "SELECT A PATH"}
              </button>
            </div>
          </div>
        </div>

        <main className="min-h-screen px-4 pt-32 pb-16 max-w-5xl mx-auto animate-slide-up">
          <div className="mb-10">
            <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-black text-foreground mb-2">
              SOLO <span className="text-[var(--neon-cyan)] glow-cyan">CHALLENGE</span>
            </h1>
            <p className="text-muted-foreground text-sm">No team needed. Pick a topic and dive in.</p>
          </div>

          <div className="space-y-10">
            {PATH_CATEGORIES.map((cat) => {
              const catPaths = PATHS.filter(
                p => p.category === cat.id && (p.category !== "gmat" || isAdmin)
              );
              if (catPaths.length === 0) return null;
              return (
                <div key={cat.id}>
                  <p className="text-xs tracking-widest mb-4 font-semibold" style={{ color: cat.color }}>
                    {cat.label}
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catPaths.map((path) => {
                      const isSelected = selectedPath === path.id;
                      const isGmatFull = path.id === "gmat_full_test";
                      return (
                        <button
                          key={path.id}
                          onClick={() => setSelectedPath(path.id)}
                          className={`text-left p-4 rounded border transition-all hover:scale-[1.01] ${
                            isGmatFull ? "sm:col-span-2 lg:col-span-3" : ""
                          } ${
                            isSelected
                              ? "border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10"
                              : "border-[var(--dark-border)] bg-card hover:border-[var(--neon-cyan)]/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-2xl">{path.icon}</span>
                            <span className="text-[10px] tracking-widest text-muted-foreground border border-[var(--dark-border)] rounded px-1.5 py-0.5">
                              {isGmatFull ? "3 Sections · 64Q" : `${path.questionCount}Q`}
                            </span>
                          </div>
                          <div className={`font-[family-name:var(--font-orbitron)] text-xs font-bold mb-1 ${isSelected ? "text-[var(--neon-cyan)]" : "text-foreground"}`}>
                            {path.label}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{path.description}</p>
                          <div className="mt-2 text-[10px] text-muted-foreground tracking-widest">{path.difficulty}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </>
    );
  }

  // ── Step 02: Pick AI companion (optional) ────────────────
  const selectedPathMeta = PATHS.find(p => p.id === selectedPath);

  return (
    <>
      <Navbar />

      <div className="fixed top-16 inset-x-0 z-40 border-b border-[var(--dark-border)] bg-background/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-[var(--neon-cyan)] tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-pulse" />
              STEP 02 OF 02 · SOLO SESSION
            </div>
            <button
              onClick={() => setPathConfirmed(false)}
              className="text-xs text-muted-foreground hover:text-[var(--neon-cyan)] transition-colors tracking-widest"
            >
              ← CHANGE PATH
            </button>
          </div>
          {selectedPathMeta && (
            <span className="text-xs tracking-widest font-semibold text-[var(--neon-cyan)]">
              {selectedPathMeta.icon} {selectedPathMeta.label}
            </span>
          )}
        </div>
      </div>

      <main className="min-h-screen px-4 pt-32 pb-16 max-w-2xl mx-auto animate-slide-up">
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-black text-foreground mb-2">
            BRING AN <span className="text-[var(--neon-cyan)] glow-cyan">AI AGENT?</span>
          </h1>
          <p className="text-muted-foreground text-sm">Totally optional — agents hint, react, and keep you company. Skip if you want to go it alone.</p>
        </div>

        <div className="space-y-6">
          {/* No agent option */}
          <button
            onClick={() => setSelectedAgent(null)}
            className={`w-full text-left p-4 rounded border transition-all flex items-center gap-4 ${
              selectedAgent === null
                ? "border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10"
                : "border-[var(--dark-border)] bg-card hover:border-[var(--neon-cyan)]/30"
            }`}
          >
            <span className="text-2xl">🧠</span>
            <div>
              <div className={`font-[family-name:var(--font-orbitron)] text-xs font-bold mb-0.5 ${selectedAgent === null ? "text-[var(--neon-cyan)]" : "text-foreground"}`}>
                JUST ME
              </div>
              <p className="text-xs text-muted-foreground">No hints, no hand-holding. Pure solo mode.</p>
            </div>
          </button>

          {/* Agent options */}
          <div className="grid sm:grid-cols-2 gap-3">
            {AGENT_LIST.map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setSelectedAgent(key)}
                className={`text-left p-4 rounded border transition-all ${
                  selectedAgent === key
                    ? "border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10"
                    : "border-[var(--dark-border)] bg-card hover:border-[var(--neon-cyan)]/30"
                }`}
              >
                <div className="text-2xl mb-2">{cfg.emoji}</div>
                <div className="font-[family-name:var(--font-orbitron)] text-xs font-bold mb-0.5" style={{ color: cfg.color }}>
                  {cfg.name}
                </div>
                <div className="text-[11px] text-muted-foreground italic mb-1">{cfg.tagline}</div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{cfg.description}</p>
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={startSolo}
            disabled={starting}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[var(--neon-cyan)] text-black font-bold text-sm tracking-widest rounded hover:bg-[var(--neon-cyan)]/90 transition-all box-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {starting ? (
              <span className="animate-pulse">INITIALIZING...</span>
            ) : (
              <>
                <Terminal className="w-4 h-4" />
                START SOLO SESSION
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>
    </>
  );
}

export default function SoloPage() {
  return (
    <Suspense>
      <SoloPageContent />
    </Suspense>
  );
}
