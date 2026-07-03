import { NextRequest, NextResponse } from "next/server";
import { PUZZLES, getPuzzleOrder } from "@/lib/puzzles/data/puzzles";
import { getUserFromRequest } from "@/lib/db/supabase.server";
import { withRateLimit, puzzlesReadLimiter } from "@/lib/security/ratelimit";
import type { Puzzle } from "@/types";

// Strip answer keys from puzzle before sending to client
function sanitizePuzzle(puzzle: Puzzle): Omit<Puzzle, "agentContext"> {
  const { agentContext: _, ...safe } = puzzle;
  return safe;
}

export async function GET(request: NextRequest) {
  return withRateLimit(request, puzzlesReadLimiter, async () => {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const puzzleId = searchParams.get("id");
    const setId = searchParams.get("set");

    if (puzzleId) {
      const puzzle = PUZZLES[puzzleId];
      if (!puzzle) {
        return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
      }
      return NextResponse.json({ puzzle: sanitizePuzzle(puzzle) });
    }

    if (setId !== null) {
      const order = getPuzzleOrder(setId || "default_set");
      const puzzles = order
        .map((id) => PUZZLES[id])
        .filter(Boolean)
        .map(sanitizePuzzle);
      return NextResponse.json({ puzzles, order });
    }

    return NextResponse.json({ error: "Provide ?id= or ?set=" }, { status: 400 });
  });
}
