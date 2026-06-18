"use client";

import { Suspense } from "react";
import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { AGENT_CONFIGS } from "@/lib/ai/personalities";
import type { AgentPersonality } from "@/types";
import { getSupabaseBrowser } from "@/lib/db/supabase";
import type { User } from "@supabase/supabase-js";
import {
  Terminal,
  Users,
  Bot,
  Copy,
  CheckCircle,
  ChevronRight,
  X,
  Mail,
  UserPlus,
  Cpu,
} from "lucide-react";

type SlotConfig = {
  slotIndex: number;
  type: "human" | "agent";
  agentPersonality?: AgentPersonality;
};

const AGENT_LIST = Object.entries(AGENT_CONFIGS) as [AgentPersonality, (typeof AGENT_CONFIGS)[AgentPersonality]][];

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteParam = searchParams.get("invite");

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth state
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Join-via-invite state
  const [inviteTeam, setInviteTeam] = useState<{
    id: string;
    teamName: string;
    inviteCode: string;
    slots: SlotConfig[];
  } | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Create team state
  const [teamName, setTeamName] = useState("");
  const [maxSize, setMaxSize] = useState(4);
  const [slotConfigs, setSlotConfigs] = useState<SlotConfig[]>([]);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdTeam, setCreatedTeam] = useState<{
    id: string;
    inviteCode: string;
    teamName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Init auth listener
  useEffect(() => {
    getSupabaseBrowser().auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = getSupabaseBrowser().auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch invite team data if invite param present
  useEffect(() => {
    if (!inviteParam) return;
    fetch(`/api/teams?invite=${inviteParam}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.team) setInviteTeam(d.team);
      })
      .catch(() => {});
  }, [inviteParam]);

  // Reinit slot configs when maxSize changes
  useEffect(() => {
    setSlotConfigs(
      Array.from({ length: maxSize }, (_, i) => ({
        slotIndex: i,
        type: "human" as const,
        agentPersonality: undefined,
      }))
    );
  }, [maxSize]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    const { error } = await getSupabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/register${inviteParam ? `?invite=${inviteParam}` : ""}` },
    });
    setAuthSubmitting(false);
    if (error) setAuthError(error.message);
    else setMagicLinkSent(true);
  }

  function toggleSlotType(index: number) {
    if (index === 0) return;
    setSlotConfigs((prev) =>
      prev.map((s) =>
        s.slotIndex === index
          ? { ...s, type: s.type === "human" ? "agent" : "human", agentPersonality: undefined }
          : s
      )
    );
  }

  function pickPersonality(slotIndex: number, personality: AgentPersonality) {
    setSlotConfigs((prev) =>
      prev.map((s) =>
        s.slotIndex === slotIndex
          ? { ...s, type: "agent", agentPersonality: personality }
          : s
      )
    );
    setPickerSlot(null);
  }

  async function createTeam() {
    if (!teamName.trim() || teamName.trim().length < 2) {
      setCreateError("Team name must be at least 2 characters.");
      return;
    }
    setCreating(true);
    setCreateError("");

    const agentSlots = slotConfigs.filter((s) => s.slotIndex > 0);

    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamName: teamName.trim(),
        maxSize,
        creatorName: user?.email?.split("@")[0] ?? "Host",
        slotConfigs: agentSlots,
      }),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setCreateError(data.error ?? "Failed to create team. Try again.");
      return;
    }
    setCreatedTeam({
      id: data.team.id,
      inviteCode: data.team.inviteCode,
      teamName: data.team.teamName,
    });
  }

  async function joinTeam() {
    if (!joinName.trim()) { setJoinError("Enter your display name."); return; }
    if (!inviteTeam) return;
    setJoining(true);
    setJoinError("");

    const res = await fetch("/api/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: inviteTeam.inviteCode, displayName: joinName.trim() }),
    });
    const data = await res.json();
    setJoining(false);

    if (!res.ok) {
      setJoinError(data.error ?? "Could not join team.");
      return;
    }
    router.push(`/lobby/${data.team.id}`);
  }

  async function copyInviteLink() {
    const link = `${window.location.origin}/register?invite=${createdTeam!.inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Auth gate ────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 grid-bg">
          <div className="pointer-events-none absolute inset-0 scanline" />
          <div className="relative z-10 w-full max-w-md animate-slide-up">
            <div className="p-8 rounded border border-[var(--neon-cyan)]/30 bg-[var(--dark-card)]">
              <Terminal className="w-8 h-8 text-[var(--neon-cyan)] mb-4" />
              <h1 className="font-[family-name:var(--font-orbitron)] text-2xl font-black text-white mb-2">
                SIGN IN TO CONTINUE
              </h1>
              <p className="text-gray-500 text-sm mb-8">
                {inviteParam
                  ? "Sign in to join this team."
                  : "Sign in to create or join a CodeEscape team."}
              </p>

              {magicLinkSent ? (
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-[var(--neon-green)] mx-auto mb-4" />
                  <p className="text-white font-semibold mb-2">Check your email</p>
                  <p className="text-gray-500 text-sm">
                    We sent a magic link to <span className="text-[var(--neon-cyan)]">{email}</span>
                  </p>
                </div>
              ) : (
                <form onSubmit={sendMagicLink} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 tracking-widest block mb-2">
                      EMAIL
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-black border border-[var(--dark-border)] rounded text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[var(--neon-cyan)]/60 transition-colors"
                      />
                    </div>
                  </div>
                  {authError && (
                    <p className="text-red-400 text-xs">{authError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-3 bg-[var(--neon-cyan)] text-black font-bold text-sm tracking-widest rounded hover:bg-[var(--neon-cyan)]/90 disabled:opacity-50 transition-all box-glow-cyan"
                  >
                    {authSubmitting ? "SENDING…" : "SEND MAGIC LINK"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </main>
      </>
    );
  }

  // ── Join via invite ──────────────────────────────────────
  if (inviteParam && inviteTeam) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 grid-bg">
          <div className="pointer-events-none absolute inset-0 scanline" />
          <div className="relative z-10 w-full max-w-md animate-slide-up">
            <div className="p-8 rounded border border-[var(--neon-cyan)]/30 bg-[var(--dark-card)]">
              <UserPlus className="w-8 h-8 text-[var(--neon-cyan)] mb-4" />
              <div className="text-xs text-[var(--neon-cyan)] tracking-widest mb-2">
                JOINING TEAM
              </div>
              <h1 className="font-[family-name:var(--font-orbitron)] text-2xl font-black text-white mb-6">
                {inviteTeam.teamName}
              </h1>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 tracking-widest block mb-2">
                    YOUR DISPLAY NAME
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="Enter your in-game name"
                    className="w-full px-4 py-3 bg-black border border-[var(--dark-border)] rounded text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[var(--neon-cyan)]/60 transition-colors"
                  />
                </div>
                {joinError && <p className="text-red-400 text-xs">{joinError}</p>}
                <button
                  onClick={joinTeam}
                  disabled={joining}
                  className="w-full py-3 bg-[var(--neon-cyan)] text-black font-bold text-sm tracking-widest rounded hover:bg-[var(--neon-cyan)]/90 disabled:opacity-50 transition-all box-glow-cyan"
                >
                  {joining ? "JOINING…" : "JOIN TEAM →"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // ── Team created success ─────────────────────────────────
  if (createdTeam) {
    const humanSlotCount = slotConfigs.filter(
      (s) => s.slotIndex > 0 && s.type === "human"
    ).length;
    const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/register?invite=${createdTeam.inviteCode}`;

    return (
      <>
        <Navbar />
        <main className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 grid-bg">
          <div className="pointer-events-none absolute inset-0 scanline" />
          <div className="relative z-10 w-full max-w-lg animate-slide-up space-y-6">
            <div className="p-8 rounded border border-[var(--neon-cyan)]/40 bg-[var(--dark-card)]">
              <CheckCircle className="w-10 h-10 text-[var(--neon-cyan)] mb-4" />
              <div className="text-xs text-[var(--neon-cyan)] tracking-widest mb-2">
                TEAM INITIALIZED
              </div>
              <h1 className="font-[family-name:var(--font-orbitron)] text-2xl font-black text-white mb-6">
                {createdTeam.teamName}
              </h1>

              {humanSlotCount > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    Share this link with your teammates to fill the{" "}
                    <span className="text-white">{humanSlotCount}</span> open human slot
                    {humanSlotCount !== 1 ? "s" : ""}:
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-black rounded border border-[var(--dark-border)]">
                    <code className="flex-1 text-xs text-[var(--neon-cyan)] truncate">
                      {inviteLink}
                    </code>
                    <button
                      onClick={copyInviteLink}
                      className="shrink-0 p-2 hover:bg-white/5 rounded transition-colors"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-[var(--neon-green)]" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  All slots are filled with AI agents — you're ready to start.
                </p>
              )}
            </div>

            <Link
              href={`/lobby/${createdTeam.id}`}
              className="flex items-center justify-center gap-2 w-full py-4 bg-[var(--neon-cyan)] text-black font-bold text-sm tracking-widest rounded hover:bg-[var(--neon-cyan)]/90 transition-all box-glow-cyan"
            >
              <Terminal className="w-4 h-4" />
              ENTER LOBBY
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </main>
      </>
    );
  }

  // ── Main create-team form ────────────────────────────────
  return (
    <>
      <Navbar />
      {/* Agent picker overlay */}
      {pickerSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[var(--dark-card)] rounded border border-[var(--dark-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-gray-500 tracking-widest">SLOT {String(pickerSlot + 1).padStart(2, "0")}</p>
                <h2 className="font-[family-name:var(--font-orbitron)] text-lg font-bold text-white mt-1">
                  SELECT AI AGENT
                </h2>
              </div>
              <button
                onClick={() => setPickerSlot(null)}
                className="p-2 hover:bg-white/5 rounded transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {AGENT_LIST.map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => pickPersonality(pickerSlot, key)}
                  className="text-left p-4 rounded border border-[var(--dark-border)] bg-black hover:scale-[1.02] transition-all group"
                  style={{ "--hover-color": cfg.color } as React.CSSProperties}
                >
                  <div className="text-2xl mb-2">{cfg.emoji}</div>
                  <div
                    className="font-[family-name:var(--font-orbitron)] text-sm font-bold mb-1"
                    style={{ color: cfg.color }}
                  >
                    {cfg.name}
                  </div>
                  <div className="text-xs text-gray-500 italic mb-2">{cfg.tagline}</div>
                  <p className="text-xs text-gray-400 leading-relaxed">{cfg.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="min-h-screen px-4 pt-24 pb-16 max-w-2xl mx-auto">
        <div className="animate-slide-up space-y-10">
          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-2 text-xs text-[var(--neon-cyan)] tracking-widest mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-pulse" />
              TEAM INITIALIZATION
            </div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-black text-white">
              CREATE YOUR <span className="text-[var(--neon-cyan)] glow-cyan">TEAM</span>
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              Signed in as <span className="text-gray-300">{user.email}</span>
            </p>
          </div>

          {/* Team name */}
          <section className="space-y-4">
            <label className="text-xs text-gray-500 tracking-widest block">
              TEAM NAME
            </label>
            <input
              type="text"
              maxLength={50}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Null Pointer Exception"
              className="w-full px-4 py-3 bg-black border border-[var(--dark-border)] rounded text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[var(--neon-cyan)]/60 transition-colors"
            />
          </section>

          {/* Team size */}
          <section className="space-y-4">
            <label className="text-xs text-gray-500 tracking-widest block">
              TEAM SIZE — {maxSize} PLAYERS
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxSize(n)}
                  className={`flex-1 py-2 rounded border text-sm font-semibold transition-all ${
                    maxSize === n
                      ? "border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]"
                      : "border-[var(--dark-border)] text-gray-500 hover:border-gray-600"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </section>

          {/* Slot configurator */}
          <section className="space-y-3">
            <p className="text-xs text-gray-500 tracking-widest">
              CONFIGURE SLOTS
            </p>
            <div className="space-y-2">
              {slotConfigs.map((slot) => {
                const isHost = slot.slotIndex === 0;
                const agentCfg =
                  slot.type === "agent" && slot.agentPersonality
                    ? AGENT_CONFIGS[slot.agentPersonality]
                    : null;

                return (
                  <div
                    key={slot.slotIndex}
                    className={`flex items-center gap-4 p-4 rounded border transition-all ${
                      isHost
                        ? "border-[var(--neon-cyan)]/30 bg-[var(--neon-cyan)]/5"
                        : slot.type === "agent"
                        ? "border-[var(--dark-border)] bg-black"
                        : "border-[var(--dark-border)] bg-black"
                    }`}
                  >
                    <div className="font-[family-name:var(--font-orbitron)] text-xs text-gray-600 w-6 shrink-0">
                      {String(slot.slotIndex + 1).padStart(2, "0")}
                    </div>

                    {isHost ? (
                      <>
                        <div className="flex-1">
                          <div className="text-sm text-white font-semibold">
                            {user.email?.split("@")[0] ?? "You"}
                          </div>
                          <div className="text-xs text-[var(--neon-cyan)]">HOST</div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Users className="w-3 h-3" />
                          HUMAN
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          {agentCfg ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{agentCfg.emoji}</span>
                              <div>
                                <div
                                  className="text-sm font-semibold"
                                  style={{ color: agentCfg.color }}
                                >
                                  {agentCfg.name}
                                </div>
                                <div className="text-xs text-gray-600 italic">
                                  {agentCfg.tagline}
                                </div>
                              </div>
                            </div>
                          ) : slot.type === "human" ? (
                            <div className="text-sm text-gray-400">
                              Invite via link
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">
                              No agent selected
                            </div>
                          )}
                        </div>

                        {/* Toggle */}
                        <div className="flex items-center gap-2">
                          {slot.type === "agent" && (
                            <button
                              onClick={() => setPickerSlot(slot.slotIndex)}
                              className="text-xs px-2 py-1 rounded border border-[var(--dark-border)] text-gray-400 hover:text-white hover:border-gray-600 transition-all"
                            >
                              Change
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (slot.type === "human") {
                                toggleSlotType(slot.slotIndex);
                                setPickerSlot(slot.slotIndex);
                              } else {
                                toggleSlotType(slot.slotIndex);
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-all ${
                              slot.type === "agent"
                                ? "border-[var(--neon-magenta)]/50 text-[var(--neon-magenta)] bg-[var(--neon-magenta)]/10"
                                : "border-[var(--dark-border)] text-gray-400 hover:border-gray-600"
                            }`}
                          >
                            {slot.type === "agent" ? (
                              <>
                                <Cpu className="w-3 h-3" />
                                AI
                              </>
                            ) : (
                              <>
                                <Users className="w-3 h-3" />
                                HUMAN
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Toggle a slot to switch between inviting a human or adding an AI agent.
            </p>
          </section>

          {/* Create button */}
          {createError && (
            <p className="text-red-400 text-sm">{createError}</p>
          )}
          <button
            onClick={createTeam}
            disabled={creating || !teamName.trim()}
            className="w-full py-4 bg-[var(--neon-cyan)] text-black font-bold text-sm tracking-widest rounded hover:bg-[var(--neon-cyan)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all box-glow-cyan flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                INITIALIZING…
              </>
            ) : (
              <>
                <Terminal className="w-4 h-4" />
                CREATE TEAM
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
