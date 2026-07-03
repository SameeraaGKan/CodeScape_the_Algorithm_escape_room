import { NextRequest, NextResponse } from "next/server";
import { getQuestionsForPath } from "@/lib/puzzles/loader";
import { getUserFromRequest } from "@/lib/db/supabase.server";
import { withRateLimit, puzzlesReadLimiter } from "@/lib/security/ratelimit";
import type { PathId, ClientMCQQuestion } from "@/types";

// Never send the correct answer or explanation to the client up front — they're
// only revealed per-question via POST /api/questions/grade once a real answer
// is submitted for verification.
function sanitizeQuestion({ answer: _answer, explanation: _explanation, ...safe }: ReturnType<typeof getQuestionsForPath>[number]): ClientMCQQuestion {
  return safe;
}

const VALID_PATH_IDS = new Set<string>([
  "cs_algorithms", "cs_theory", "cs_discrete_math", "cs_os_compilers",
  "cs_networks", "cs_cybersecurity", "cs_ml_ai", "cs_databases",
  "cs_data_science", "cs_software_engineering", "cs_graphics", "cs_hci",
  "gmat_quant", "gmat_verbal", "gmat_data_insights", "cs_random",
]);

export async function GET(request: NextRequest) {
  return withRateLimit(request, puzzlesReadLimiter, async () => {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const seed = searchParams.get("seed") ?? undefined;
    if (!path || !VALID_PATH_IDS.has(path)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const questions = getQuestionsForPath(path as PathId, undefined, seed).map(sanitizeQuestion);
    return NextResponse.json({ questions });
  });
}
