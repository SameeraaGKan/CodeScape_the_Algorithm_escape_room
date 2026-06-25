import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase.server";
import { db, gmatTestResults, gameSessions } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { roomCode, pathId, testNum, totalScore, sectionScores, wrongAnswers } = body as {
      roomCode: string;
      pathId: string;
      testNum: number | null;
      totalScore: number;
      sectionScores: unknown;
      wrongAnswers: unknown;
    };

    if (!roomCode || !pathId || typeof totalScore !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [session] = await db
      .select({ id: gameSessions.id })
      .from(gameSessions)
      .where(eq(gameSessions.roomCode, roomCode.toUpperCase()));

    await db.insert(gmatTestResults).values({
      userId: user.id,
      sessionId: session?.id ?? null,
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
