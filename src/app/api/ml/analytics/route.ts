import { NextResponse } from "next/server";
import { db, puzzleAttempts, playerSkills, gameSessions } from "@/lib/db";
import { sql, desc } from "drizzle-orm";
import { createSupabaseServerClient } from "@/lib/db/supabase.server";

const ADMIN_EMAIL = "sameeraagk883@gmail.com";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [puzzleStats, skillDist, recentSessions] = await Promise.all([
    // Average attempts and hint usage per puzzle
    db
      .select({
        puzzleId: puzzleAttempts.puzzleId,
        avgAttempts: sql<number>`avg(${puzzleAttempts.attemptNumber})`,
        avgHints: sql<number>`avg(${puzzleAttempts.hintsUsed})`,
        totalAttempts: sql<number>`count(*)`,
        correctCount: sql<number>`sum(case when ${puzzleAttempts.isCorrect} then 1 else 0 end)`,
      })
      .from(puzzleAttempts)
      .groupBy(puzzleAttempts.puzzleId),

    // Theta distribution by category
    db
      .select({
        category: playerSkills.category,
        avgTheta: sql<number>`avg(${playerSkills.theta})`,
        playerCount: sql<number>`count(*)`,
      })
      .from(playerSkills)
      .groupBy(playerSkills.category),

    // Recent session count
    db
      .select({
        status: gameSessions.status,
        count: sql<number>`count(*)`,
      })
      .from(gameSessions)
      .groupBy(gameSessions.status),
  ]);

  return NextResponse.json({
    puzzleStats,
    skillDistribution: skillDist,
    sessionStats: recentSessions,
  });
}
