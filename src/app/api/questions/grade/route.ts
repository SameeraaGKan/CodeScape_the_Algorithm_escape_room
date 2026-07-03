import { NextRequest, NextResponse } from "next/server";
import { db, gameSessions, puzzleAttempts } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ALL_MCQ_BY_ID } from "@/lib/puzzles/loader";
import { mcqGradeSchema } from "@/lib/security/schemas";
import { withRateLimit, mcqGradeLimiter } from "@/lib/security/ratelimit";
import { createSupabaseServerClient } from "@/lib/db/supabase.server";

// Grades MCQ/GMAT answers server-side. The correct answer never reaches the
// client until this endpoint confirms a real submission against it — see the
// stripped `answer`/`explanation` fields in GET /api/questions.
export async function POST(request: NextRequest) {
  return withRateLimit(request, mcqGradeLimiter, async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = mcqGradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { roomCode, answers } = parsed.data;

    const [session] = await db
      .select({ id: gameSessions.id })
      .from(gameSessions)
      .where(eq(gameSessions.roomCode, roomCode.toUpperCase()));

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const results: Array<{
      questionId: string;
      isCorrect: boolean;
      correctIndex: number;
      explanation: string;
    }> = [];

    for (const { questionId, selectedIndex } of answers) {
      const question = ALL_MCQ_BY_ID[questionId];
      if (!question) continue;

      const isCorrect = selectedIndex !== null && selectedIndex === question.answer;

      await db.insert(puzzleAttempts).values({
        sessionId: session.id,
        puzzleId: questionId,
        submittedAnswer: { selectedIndex },
        isCorrect,
        attemptNumber: 1,
      });

      results.push({
        questionId,
        isCorrect,
        correctIndex: question.answer,
        explanation: question.explanation,
      });
    }

    return NextResponse.json({ results });
  });
}
