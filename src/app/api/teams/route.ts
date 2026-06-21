import { NextRequest, NextResponse } from "next/server";
import { db, teams } from "@/lib/db";
import { eq, or } from "drizzle-orm";
import { createTeamSchema, joinTeamSchema } from "@/lib/security/schemas";
import { withRateLimit, teamCreateLimiter } from "@/lib/security/ratelimit";
import { getUserFromRequest } from "@/lib/db/supabase.server";
import { AGENT_CONFIGS } from "@/lib/ai/personalities";
import type { AgentPersonality } from "@/types";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function generateUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateInviteCode();
    const [existing] = await db.select({ id: teams.id }).from(teams).where(eq(teams.inviteCode, code));
    if (!existing) return code;
  }
  // Fallback: longer code to reduce collision chance
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// POST /api/teams — create a new team
export async function POST(request: NextRequest) {
  try {
  return await withRateLimit(request, teamCreateLimiter, async () => {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { teamName, maxSize, creatorName, slotConfigs, selectedPath, gameTrack } = parsed.data;
    const inviteCode = await generateUniqueInviteCode();

    const baseSlots = Array.from({ length: maxSize }, (_, i) => ({
      slotIndex: i,
      type: "human" as "human" | "agent",
      displayName: i === 0 ? creatorName : `Player ${i + 1}`,
      userId: i === 0 ? user.id : undefined,
      joinedAt: i === 0 ? new Date().toISOString() : undefined,
      agentPersonality: undefined as AgentPersonality | undefined,
    }));

    // Apply creator-configured slot overrides (AI agents)
    const initialSlots = slotConfigs
      ? baseSlots.map((slot) => {
          const cfg = slotConfigs.find((c) => c.slotIndex === slot.slotIndex);
          if (!cfg) return slot;
          const agentName =
            cfg.type === "agent" && cfg.agentPersonality
              ? AGENT_CONFIGS[cfg.agentPersonality].name
              : slot.displayName;
          return {
            ...slot,
            type: cfg.type as "human" | "agent",
            agentPersonality: cfg.agentPersonality,
            displayName: agentName,
          };
        })
      : baseSlots;

    const [team] = await db
      .insert(teams)
      .values({
        teamName,
        inviteCode,
        maxSize,
        slots: initialSlots,
        createdBy: user.email ?? user.id,
        selectedPath: selectedPath ?? "cs_algorithms",
        gameTrack: gameTrack ?? "team",
        status: "forming",
      })
      .returning();

    return NextResponse.json({ team }, { status: 201 });
  });
  } catch (err) {
    const e = err as Record<string, unknown>;
    const cause = e?.cause as Record<string, unknown> | undefined;
    // Drizzle wraps the real postgres error in err.cause
    const rootMsg = String(cause?.message ?? e?.message ?? err);
    const code = String(cause?.code ?? e?.code ?? "");
    const detail = String(cause?.detail ?? "");
    const msg = [rootMsg, code && `[pg:${code}]`, detail].filter(Boolean).join(" ");
    console.error("[POST /api/teams] cause:", cause, "top:", e?.message);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/teams?invite=CODE or ?id=TEAMID
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const inviteCode = searchParams.get("invite");
  const teamId = searchParams.get("id");

  if (!inviteCode && !teamId) {
    return NextResponse.json(
      { error: "Missing invite code or team id" },
      { status: 400 }
    );
  }

  const [team] = await db
    .select()
    .from(teams)
    .where(
      inviteCode
        ? eq(teams.inviteCode, inviteCode.toUpperCase())
        : eq(teams.id, teamId!)
    );

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ team });
}

// PATCH /api/teams — join an open human slot via invite code
export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = joinTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { inviteCode, displayName } = parsed.data;

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.inviteCode, inviteCode.toUpperCase()));

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (team.status !== "forming") {
    return NextResponse.json(
      { error: "Team is no longer accepting members" },
      { status: 409 }
    );
  }

  const slots = team.slots as Array<{
    slotIndex: number;
    type: string;
    userId?: string;
    displayName: string;
    joinedAt?: string;
  }>;

  // Check if user already joined
  if (slots.some((s) => s.userId === user.id)) {
    return NextResponse.json({ team });
  }

  // Find first open human slot (slot 0 is creator)
  const openSlot = slots.find(
    (s) => s.type === "human" && !s.userId && s.slotIndex > 0
  );

  if (!openSlot) {
    return NextResponse.json(
      { error: "No open slots available" },
      { status: 409 }
    );
  }

  const updatedSlots = slots.map((s) =>
    s.slotIndex === openSlot.slotIndex
      ? { ...s, userId: user.id, displayName, joinedAt: new Date().toISOString() }
      : s
  ) as typeof slots;

  const [updatedTeam] = await db
    .update(teams)
    .set({ slots: updatedSlots as never, updatedAt: new Date() })
    .where(eq(teams.id, team.id))
    .returning();

  return NextResponse.json({ team: updatedTeam });
}
