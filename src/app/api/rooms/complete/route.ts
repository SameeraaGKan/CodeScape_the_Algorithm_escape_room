import { NextRequest, NextResponse } from "next/server";
import { db, gameSessions, teams, puzzleAttempts } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { createSupabaseServerClient } from "@/lib/db/supabase.server";
import { completeRoomSchema } from "@/lib/security/schemas";
import { withRateLimit, resultsSubmitLimiter } from "@/lib/security/ratelimit";

// A completion with zero recorded attempts never actually played the game —
// require verified server-side grading evidence before trusting the score.
const MIN_VERIFIED_ATTEMPTS = 1;

export async function POST(request: NextRequest) {
  return withRateLimit(request, resultsSubmitLimiter, async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = completeRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { roomCode, finalScore } = parsed.data;

  const [session] = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.roomCode, roomCode.toUpperCase()));

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Verify the requesting user belongs to this game session's team
  const [team] = await db.select().from(teams).where(eq(teams.id, session.teamId));
  const slots = (team?.slots ?? []) as Array<{ userId?: string; type: string }>;
  const isMember = slots.some((s) => s.type === "human" && s.userId === user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Idempotency: if already completed, don't overwrite
  if (session.status === "completed") {
    return NextResponse.json({ success: true });
  }

  // Require real, server-verified gameplay for this session before trusting
  // the client-reported score — closes the "submit a score with zero play" hole.
  const [{ count: verifiedAttempts }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(puzzleAttempts)
    .where(eq(puzzleAttempts.sessionId, session.id));

  if (Number(verifiedAttempts) < MIN_VERIFIED_ATTEMPTS) {
    return NextResponse.json(
      { error: "No verified attempts recorded for this session" },
      { status: 400 }
    );
  }

  await db
    .update(gameSessions)
    .set({ status: "completed", totalScore: finalScore, completedAt: new Date() })
    .where(eq(gameSessions.id, session.id));

  await db
    .update(teams)
    .set({ status: "completed" })
    .where(eq(teams.id, session.teamId));

  return NextResponse.json({ success: true });
  });
}
