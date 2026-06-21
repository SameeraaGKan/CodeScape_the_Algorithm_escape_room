import { NextRequest, NextResponse } from "next/server";
import { db, gameSessions, teams } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createSupabaseServerClient } from "@/lib/db/supabase.server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { roomCode, finalScore } = body as { roomCode?: string; finalScore?: number };

  if (!roomCode || typeof finalScore !== "number") {
    return NextResponse.json({ error: "Missing roomCode or finalScore" }, { status: 400 });
  }

  const [session] = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.roomCode, roomCode.toUpperCase()));

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Idempotency: if already completed, don't overwrite with a different player's score
  if (session.status === "completed") {
    return NextResponse.json({ success: true });
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
}
