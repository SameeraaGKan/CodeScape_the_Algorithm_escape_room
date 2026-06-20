"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { BackButton } from "@/components/ui/BackButton";
import { getSupabaseBrowser } from "@/lib/db/supabase";
import { AGENT_CONFIGS } from "@/lib/ai/personalities";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AgentPersonality } from "@/types";
import {
  Users,
  Cpu,
  Copy,
  CheckCircle,
  Loader2,
  Play,
  Lock,
} from "lucide-react";

type SlotData = {
  slotIndex: number;
  type: "human" | "agent";
  userId?: string;
  displayName: string;
  agentPersonality?: AgentPersonality;
  joinedAt?: string;
};

type TeamData = {
  id: string;
  teamName: string;
  inviteCode: string;
  maxSize: number;
  slots: SlotData[];
  createdBy: string;
  status: string;
};

export default function LobbyPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const router = useRouter();

  const [team, setTeam] = useState<TeamData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [copied, setCopied] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load current user + team data
  useEffect(() => {
    async function init() {
      const { data } = await getSupabaseBrowser().auth.getUser();
      setCurrentUserId(data.user?.id ?? null);

      const res = await fetch(`/api/teams?id=${teamId}`);
      const json = await res.json();
      if (json.team) setTeam(json.team);
      setLoading(false);
    }
    init();
  }, [teamId]);

  // Supabase Realtime — slot fill updates + game-start redirect via broadcast
  useEffect(() => {
    if (!teamId) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`lobby:${teamId}`)
      // Primary: host broadcasts game_started when room is created
      .on(
        "broadcast",
        { event: "game_started" },
        ({ payload }: { payload: { roomCode: string; selectedPath?: string } }) => {
          if (payload.selectedPath === "gmat_full_test") {
            router.push(`/gmat-test/${payload.roomCode}`);
          } else {
            router.push(`/game/${payload.roomCode}`);
          }
        }
      )
      // Fallback: watch for team row status change (may not fire if RLS blocks it)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "teams", filter: `id=eq.${teamId}` },
        (payload: { new: TeamData }) => {
          setTeam(payload.new);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  async function startGame() {
    if (!team) return;
    setStarting(true);
    setStartError("");

    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: team.id }),
    });
    const data = await res.json();
    setStarting(false);

    if (!res.ok) {
      setStartError(data.error ?? "Failed to start game.");
      return;
    }

    // Broadcast game start so non-host players redirect immediately
    await channelRef.current?.send({
      type: "broadcast",
      event: "game_started",
      payload: { roomCode: data.roomCode, selectedPath: data.selectedPath },
    });

    // Navigate host
    if (data.selectedPath === "gmat_full_test") {
      router.push(`/gmat-test/${data.roomCode}`);
    } else {
      router.push(`/game/${data.roomCode}`);
    }
  }

  async function copyInviteLink() {
    if (!team) return;
    const link = `${window.location.origin}/register?invite=${team.inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[var(--neon-cyan)] animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Team not found.{" "}
        <Link href="/register" className="text-[var(--neon-cyan)] ml-2">
          Create one →
        </Link>
      </div>
    );
  }

  const isHost = team.slots[0]?.userId === currentUserId;
  const slots = team.slots as SlotData[];
  const filledHumanSlots = slots.filter((s) => s.type === "human" && s.userId);
  const openHumanSlots = slots.filter((s) => s.type === "human" && !s.userId);
  const agentSlots = slots.filter((s) => s.type === "agent");
  const allReady =
    openHumanSlots.length === 0 || agentSlots.length + filledHumanSlots.length >= 1;
  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/register?invite=${team.inviteCode}`;

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 pt-24 pb-16 max-w-2xl mx-auto">
        <div className="space-y-8 animate-slide-up">
          <BackButton className="mb-2" />
          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-2 text-xs text-[var(--neon-cyan)] tracking-widest mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-pulse" />
              LOBBY — WAITING FOR PLAYERS
            </div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-black text-foreground">
              {team.teamName}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              CODE:{" "}
              <span className="text-[var(--neon-cyan)] font-mono">
                {team.inviteCode}
              </span>
            </p>
          </div>

          {/* Invite link (if open human slots) */}
          {openHumanSlots.length > 0 && (
            <div className="p-4 rounded border border-[var(--dark-border)] bg-[var(--dark-card)]">
              <p className="text-xs text-muted-foreground tracking-widest mb-3">
                INVITE LINK — {openHumanSlots.length} OPEN SLOT
                {openHumanSlots.length !== 1 ? "S" : ""}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-[var(--neon-cyan)] truncate bg-card border border-[var(--dark-border)] px-3 py-2 rounded">
                  {inviteLink}
                </code>
                <button
                  onClick={copyInviteLink}
                  className="shrink-0 p-2 hover:bg-white/5 rounded transition-colors"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-[var(--neon-green)]" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Slot grid */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground tracking-widest">TEAM ROSTER</p>
            {slots.map((slot) => {
              const agentCfg =
                slot.type === "agent" && slot.agentPersonality
                  ? AGENT_CONFIGS[slot.agentPersonality]
                  : null;
              const isFilled = slot.type === "agent" || !!slot.userId;
              const isCurrentUser = slot.userId === currentUserId;

              return (
                <div
                  key={slot.slotIndex}
                  className={`flex items-center gap-4 p-4 rounded border transition-all ${
                    isFilled
                      ? slot.type === "agent"
                        ? "border-[var(--dark-border)] bg-card"
                        : "border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/5"
                      : "border-dashed border-[var(--dark-border)] bg-transparent opacity-60"
                  }`}
                >
                  <div className="font-[family-name:var(--font-orbitron)] text-xs text-muted-foreground w-6 shrink-0">
                    {String(slot.slotIndex + 1).padStart(2, "0")}
                  </div>

                  {agentCfg ? (
                    <>
                      <span className="text-xl">{agentCfg.emoji}</span>
                      <div className="flex-1">
                        <div
                          className="text-sm font-semibold"
                          style={{ color: agentCfg.color }}
                        >
                          {agentCfg.name}
                        </div>
                        <div className="text-xs text-muted-foreground italic">
                          {agentCfg.tagline}
                        </div>
                      </div>
                      <Cpu className="w-3 h-3 text-muted-foreground" />
                    </>
                  ) : slot.userId ? (
                    <>
                      <div className="w-7 h-7 rounded-full bg-[var(--neon-cyan)]/20 border border-[var(--neon-cyan)]/40 flex items-center justify-center text-xs text-[var(--neon-cyan)] font-bold">
                        {slot.displayName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-foreground">{slot.displayName}</div>
                        {isCurrentUser && (
                          <div className="text-xs text-[var(--neon-cyan)]">
                            {slot.slotIndex === 0 ? "HOST · YOU" : "YOU"}
                          </div>
                        )}
                      </div>
                      <CheckCircle className="w-4 h-4 text-[var(--neon-green)]" />
                    </>
                  ) : (
                    <>
                      <div className="w-7 h-7 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                        <Users className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1 text-sm text-muted-foreground">
                        Waiting for player…
                      </div>
                      <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Start game (host only) */}
          {isHost && (
            <div className="space-y-3">
              {startError && (
                <p className="text-red-400 text-sm">{startError}</p>
              )}
              {openHumanSlots.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  <Lock className="inline w-3 h-3 mr-1" />
                  {openHumanSlots.length} human slot
                  {openHumanSlots.length !== 1 ? "s" : ""} still open — you can
                  start anyway.
                </p>
              )}
              <button
                onClick={startGame}
                disabled={starting}
                className="w-full py-4 bg-[var(--neon-cyan)] text-black font-bold text-sm tracking-widest rounded hover:bg-[var(--neon-cyan)]/90 disabled:opacity-50 transition-all box-glow-cyan flex items-center justify-center gap-2"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    LAUNCHING…
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    START GAME
                  </>
                )}
              </button>
            </div>
          )}

          {!isHost && (
            <p className="text-center text-sm text-muted-foreground">
              Waiting for the host to start the game…
            </p>
          )}
        </div>
      </main>
    </>
  );
}
