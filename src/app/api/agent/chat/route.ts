import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { NextRequest } from "next/server";
import { buildSystemPrompt, AGENT_CONFIGS } from "@/lib/ai/personalities";
import { PUZZLES } from "@/lib/puzzles/data/puzzles";
import { agentChatSchema } from "@/lib/security/schemas";
import { withRateLimit, agentChatLimiter } from "@/lib/security/ratelimit";
import { createSupabaseServerClient } from "@/lib/db/supabase.server";

export async function POST(request: NextRequest) {
  return withRateLimit(request, agentChatLimiter, async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const parsed = agentChatSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { puzzleId, agentPersonality, playerAttempt, timeRemainingSeconds, messages, sessionId } = parsed.data;
    const puzzle = PUZZLES[puzzleId];
    if (!puzzle) {
      return new Response(JSON.stringify({ error: "Puzzle not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const hintsUsed = messages.filter((m) => m.role === "assistant").length;
    const config = AGENT_CONFIGS[agentPersonality];

    const systemPrompt = buildSystemPrompt(agentPersonality, {
      puzzleType: puzzle.type,
      puzzleTitle: puzzle.title,
      puzzleDescription: puzzle.description,
      playerAttempt,
      hintsUsed,
      timeRemainingSeconds,
      agentContext: puzzle.agentContext,
    });

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      maxOutputTokens: 350,
      temperature: config.temperature,
    });

    return result.toTextStreamResponse();
  });
}
