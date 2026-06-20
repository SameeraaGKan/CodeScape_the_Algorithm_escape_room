"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { getSupabaseBrowser } from "@/lib/db/supabase";
import type { UserResponse } from "@supabase/supabase-js";
import { BackButton } from "@/components/ui/BackButton";
import {
  User2, Mail, Calendar, Trophy, Gamepad2, Map, Save, Loader2,
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

function pathLabel(id: string): string {
  return id.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export default function ProfilePage() {
  const router = useRouter();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarColor, setAvatarColor] = useState("#05b9b6");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    sb.auth.getUser().then(({ data: { user } }: UserResponse) => {
      if (!user) { router.push("/register"); return; }
    });

    fetch("/api/profile")
      .then(r => r.json())
      .then((data: ProfileStats) => {
        if (data.error) { router.push("/register"); return; }
        setStats(data);
        setDisplayName(data.displayName ?? "");
        setAvatarColor(data.avatarColor || "#05b9b6");
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
