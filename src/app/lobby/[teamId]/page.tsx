"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { getSupabaseBrowser } from "@/lib/db/supabase";
import { AGENT_CONFIGS } from "@/lib/ai/personalities";
import type { AgentPersonality } from "@/types";
import {
  Terminal,
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

  // Supabase Realtime — update team when slots fill
  useEffect(() => {
    if (!teamId) return;
    const channel = getSupabaseBrowser()
      .channel(`lobby:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "teams",
          filter: `id=eq.${teamId}`,
        },
        (payload: { new: TeamData }) => {
          setTeam(payload.new);
        }
      )
      .subscribe();

    return () => {
      getSupabaseBrowser().removeChannel(channel);
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
    // GMAT full test gets its own dedicated page
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
      <div className="min-h-screen flex items-center justify-center text-gray-500">
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
          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-2 text-xs text-[var(--neon-cyan)] tracking-widest mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-pulse" />
              LOBBY — WAITING FOR PLAYERS
            </div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-black text-white">
              {team.teamName}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              CODE:{" "}
              <span className="text-[var(--neon-cyan)] font-mono">
                {team.inviteCode}
              </span>
            </p>
          </div>

          {/* Invite link (if open human slots) */}
          {openHumanSlots.length > 0 && (
            <div className="p-4 rounded border border-[var(--dark-border)] bg-[var(--dark-card)]">
              <p className="text-xs text-gray-500 tracking-widest mb-3">
                INVITE LINK — {openHumanSlots.length} OPEN SLOT
                {openHumanSlots.length !== 1 ? "S" : ""}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-[var(--neon-cyan)] truncate bg-black px-3 py-2 rounded">
                  {inviteLink}
                </code>
                <button
                  onClick={copyInviteLink}
                  className="shrink-0 p-2 hover:bg-white/5 rounded transition-colors"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-[var(--neon-green)]" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Slot grid */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 tracking-widest">TEAM ROSTER</p>
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
                        ? "border-[var(--dark-border)] bg-black"
                        : "border-[var(--neon-cyan)]/20 bg-[var(--neon-cyan)]/5"
                      : "border-dashed border-[var(--dark-border)] bg-transparent opacity-60"
                  }`}
                >
                  <div className="font-[family-name:var(--font-orbitron)] text-xs text-gray-600 w-6 shrink-0">
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
                        <div className="text-xs text-gray-600 italic">
                          {agentCfg.tagline}
                        </div>
                      </div>
                      <Cpu className="w-3 h-3 text-gray-600" />
                    </>
                  ) : slot.userId ? (
                    <>
                      <div className="w-7 h-7 rounded-full bg-[var(--neon-cyan)]/20 border border-[var(--neon-cyan)]/40 flex items-center justify-center text-xs text-[var(--neon-cyan)] font-bold">
                        {slot.displayName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-white">{slot.displayName}</div>
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
                      <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center">
                        <Users className="w-3 h-3 text-gray-700" />
                      </div>
                      <div className="flex-1 text-sm text-gray-600">
                        Waiting for player…
                      </div>
                      <Loader2 className="w-3 h-3 text-gray-700 animate-spin" />
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
                <p className="text-xs text-gray-600">
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
            <p className="text-center text-sm text-gray-600">
              Waiting for the host to start the game…
            </p>
          )}
        </div>
      </main>
    </>
  );
}
