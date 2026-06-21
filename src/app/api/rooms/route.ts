import { NextRequest, NextResponse } from "next/server";
import { db, teams, gameSessions } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { createSupabaseServerClient } from "@/lib/db/supabase.server";
import { validateAnswer, calculateScore } from "@/lib/puzzles/validator";
import { PUZZLES, getPuzzleOrder } from "@/lib/puzzles/data/puzzles";
import { submitAnswerSchema } from "@/lib/security/schemas";
import { withRateLimit, puzzleSubmitLimiter } from "@/lib/security/ratelimit";
import { updateTheta, getCategoryForPuzzle } from "@/lib/ml/adaptive";
import { db as drizzle, playerSkills, puzzleAttempts } from "@/lib/db";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// POST /api/rooms — start a game session for a team
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const teamId = body?.teamId as string;
  if (!teamId) {
    return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
  }

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const roomCode = generateRoomCode();
  // Use team's selected path as puzzleSetId so the game knows which questions to load.
  // Falls back to "default_set" for teams created before path selection was added.
  const puzzleSetId = team.selectedPath ?? "default_set";

  const [session] = await db
    .insert(gameSessions)
    .values({
      teamId,
      roomCode,
      puzzleSetId,
      currentPuzzleIndex: 0,
      status: "active",
    })
    .returning();

  await db.update(teams).set({ status: "in_game" }).where(eq(teams.id, teamId));

  const isMcqMode = puzzleSetId !== "default_set";
  if (isMcqMode) {
    return NextResponse.json({ session, roomCode, isMcqMode: true, selectedPath: puzzleSetId }, { status: 201 });
  }

  const puzzleOrder = getPuzzleOrder("default_set");
  return NextResponse.json({ session, roomCode, puzzleOrder }, { status: 201 });
}

// GET /api/rooms?code=XXXXXX — get current game state
// GET /api/rooms?teamId=UUID — get active room code for a team (used by lobby redirect)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const teamId = searchParams.get("teamId");

  // Lobby redirect: find the most recent active session for a team
  if (teamId) {
    const [session] = await db
      .select()
      .from(gameSessions)
      .where(and(eq(gameSessions.teamId, teamId), eq(gameSessions.status, "active")))
      .orderBy(desc(gameSessions.startedAt))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: "No active session" }, { status: 404 });
    }
    return NextResponse.json({ roomCode: session.roomCode, selectedPath: session.puzzleSetId });
  }

  if (!code) {
    return NextResponse.json({ error: "Missing room code" }, { status: 400 });
  }

  const [session] = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.roomCode, code.toUpperCase()));

  if (!session) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const [team] = await db.select().from(teams).where(eq(teams.id, session.teamId));
  const slots = team?.slots ?? [];

  const agentPersonalities = slots
    .filter(s => s.type === "agent" && s.agentPersonality)
    .map(s => s.agentPersonality!);

  const humanSlots = slots
    .filter(s => s.type === "human" && s.userId)
    .map(s => ({ userId: s.userId!, displayName: s.displayName }));

  // MCQ mode: puzzleSetId is a path ID (not "default_set")
  const isMcqMode = session.puzzleSetId !== "default_set";
  if (isMcqMode) {
    return NextResponse.json({
      session,
      isMcqMode: true,
      selectedPath: session.puzzleSetId,
      gameTrack: team?.gameTrack ?? "team",
      agentPersonalities,
      humanSlots,
    });
  }

  const puzzleOrder = getPuzzleOrder(session.puzzleSetId);
  const currentPuzzleId = puzzleOrder[session.currentPuzzleIndex];

  return NextResponse.json({
    session,
    puzzleOrder,
    currentPuzzleId,
    totalPuzzles: puzzleOrder.length,
    agentPersonalities,
    humanSlots,
  });
}

// PATCH /api/rooms — submit answer
export async function PATCH(request: NextRequest) {
  return withRateLimit(request, puzzleSubmitLimiter, async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const roomCode = body?.roomCode as string;
    const parsed = submitAnswerSchema.safeParse(body);
    if (!parsed.success || !roomCode) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { puzzleId, answer, timeTakenSeconds, hintsUsed } = parsed.data;

    const [session] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.roomCode, roomCode.toUpperCase()));

    if (!session || session.status !== "active") {
      return NextResponse.json({ error: "Session not found or not active" }, { status: 404 });
    }

    const puzzle = PUZZLES[puzzleId];
    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    const { isCorrect, feedback } = validateAnswer(puzzleId, answer);
    const score = isCorrect
      ? calculateScore(puzzle.points, hintsUsed, timeTakenSeconds, puzzle.timeLimitSeconds)
      : 0;

    // Record attempt
    await db.insert(puzzleAttempts).values({
      sessionId: session.id,
      puzzleId,
      submittedAnswer: answer as Record<string, unknown>,
      isCorrect,
      hintsUsed,
      timeTakenSeconds,
      attemptNumber: 1,
    });

    // Update IRT skill if correct
    if (isCorrect) {
      const category = getCategoryForPuzzle(puzzleId);
      const [existing] = await db
        .select()
        .from(playerSkills)
        .where(
          and(
            eq(playerSkills.userId, user.id),
            eq(playerSkills.category, category)
          )
        );

      const currentTheta = existing?.theta ?? 0;
      const newTheta = updateTheta(
        currentTheta,
        puzzleId,
        isCorrect,
        hintsUsed,
        timeTakenSeconds,
        puzzle.timeLimitSeconds
      );

      if (existing) {
        await db
          .update(playerSkills)
          .set({ theta: newTheta, totalAttempts: (existing.totalAttempts ?? 0) + 1, updatedAt: new Date() })
          .where(eq(playerSkills.id, existing.id));
      } else {
        await db.insert(playerSkills).values({
          userId: user.id,
          category,
          theta: newTheta,
          totalAttempts: 1,
        });
      }
    }

    // Advance puzzle index if correct and not last puzzle
    let nextPuzzleId: string | null = null;
    let sessionComplete = false;

    if (isCorrect) {
      const puzzleOrder = getPuzzleOrder(session.puzzleSetId);
      const nextIndex = session.currentPuzzleIndex + 1;
      const newScore = session.totalScore + score;

      if (nextIndex >= puzzleOrder.length) {
        await db
          .update(gameSessions)
          .set({ status: "completed", totalScore: newScore, completedAt: new Date() })
          .where(eq(gameSessions.id, session.id));
        sessionComplete = true;
      } else {
        await db
          .update(gameSessions)
          .set({ currentPuzzleIndex: nextIndex, totalScore: newScore })
          .where(eq(gameSessions.id, session.id));
        nextPuzzleId = puzzleOrder[nextIndex];
      }
    }

    return NextResponse.json({
      isCorrect,
      feedback,
      score,
      nextPuzzleId,
      sessionComplete,
    });
  });
}
