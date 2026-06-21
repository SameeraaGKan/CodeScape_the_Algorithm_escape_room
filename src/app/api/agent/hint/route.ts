import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
import { NextRequest, NextResponse } from "next/server";
import { PUZZLES } from "@/lib/puzzles/data/puzzles";
import { hintRequestSchema } from "@/lib/security/schemas";
import { withRateLimit, agentChatLimiter } from "@/lib/security/ratelimit";
import { createSupabaseServerClient } from "@/lib/db/supabase.server";
import { AGENT_CONFIGS } from "@/lib/ai/personalities";

export async function POST(request: NextRequest) {
  return withRateLimit(request, agentChatLimiter, async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = hintRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { puzzleId, playerAttempt, agentPersonality, hintsUsed } = parsed.data;
    const puzzle = PUZZLES[puzzleId];
    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    const config = AGENT_CONFIGS[agentPersonality];

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: `You are ${config.name}, a CS escape room AI teammate. Analyze the student's specific wrong answer and generate ONE targeted hint that addresses exactly what went wrong in their approach — not a generic hint. Do not reveal the answer. Keep it under 80 words.`,
      prompt: `Puzzle: "${puzzle.title}"
Description: ${puzzle.description}
Agent context: ${puzzle.agentContext}
Student's attempt: "${playerAttempt}"
Hints already given: ${hintsUsed}

Generate a specific, targeted hint based on what the student got wrong.`,
      maxOutputTokens: 150,
      temperature: config.temperature,
    });

    return NextResponse.json({ hint: text });
  });
}
