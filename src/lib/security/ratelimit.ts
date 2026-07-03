import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different limiters for different route sensitivity
export const agentChatLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 per minute
  analytics: true,
  prefix: "rl:agent_chat",
});

export const puzzleSubmitLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 per minute
  analytics: true,
  prefix: "rl:puzzle_submit",
});

export const teamCreateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 per minute
  analytics: true,
  prefix: "rl:team_create",
});

export const pageViewLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 per minute — generous, just to blunt bot floods
  analytics: true,
  prefix: "rl:page_view",
});

export const mcqGradeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(40, "1 m"), // generous enough for legit adaptive-test pacing, throttles answer-key scraping
  analytics: true,
  prefix: "rl:mcq_grade",
});

export const roomLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
  prefix: "rl:room",
});

export const resultsSubmitLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
  prefix: "rl:results_submit",
});

export const puzzlesReadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  analytics: true,
  prefix: "rl:puzzles_read",
});

export async function withRateLimit(
  request: NextRequest,
  limiter: Ratelimit,
  handler: () => Promise<Response | NextResponse>
): Promise<Response | NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  try {
    const { success, reset } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Slow down, hacker." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) },
        }
      );
    }
  } catch {
    // Redis unavailable — fail open so the app still works
  }

  return handler();
}
