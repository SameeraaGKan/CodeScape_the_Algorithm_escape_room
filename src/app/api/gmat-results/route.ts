import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase.server";
import { db, gmatTestResults, gameSessions, puzzleAttempts } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import { gmatResultSchema } from "@/lib/security/schemas";
import { withRateLimit, resultsSubmitLimiter } from "@/lib/security/ratelimit";

// A result with zero recorded attempts never actually played the test —
// require verified server-side grading evidence before trusting the score.
const MIN_VERIFIED_ATTEMPTS = 1;

export async function POST(request: NextRequest) {
  return withRateLimit(request, resultsSubmitLimiter, async () => {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const body = await request.json();
      const parsed = gmatResultSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }
      const { roomCode, pathId, testNum, totalScore, sectionScores, wrongAnswers } = parsed.data;

      const [session] = await db
        .select({ id: gameSessions.id })
        .from(gameSessions)
        .where(eq(gameSessions.roomCode, roomCode.toUpperCase()));

      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

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

      await db.insert(gmatTestResults).values({
        userId: user.id,
        sessionId: session.id,
        pathId,
        testNum: testNum ?? null,
        totalScore,
        sectionScores: sectionScores as never,
        wrongAnswers: wrongAnswers as never,
      });

      return NextResponse.json({ success: true }, { status: 201 });
    } catch (err) {
      console.error("[POST /api/gmat-results]", err);
      return NextResponse.json({ error: "Failed to save result" }, { status: 500 });
    }
  });
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const results = await db
      .select()
      .from(gmatTestResults)
      .where(eq(gmatTestResults.userId, user.id))
      .orderBy(desc(gmatTestResults.completedAt))
      .limit(50);

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[GET /api/gmat-results]", err);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}
