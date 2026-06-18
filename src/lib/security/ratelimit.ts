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

export async function withRateLimit(
  request: NextRequest,
  limiter: Ratelimit,
  handler: () => Promise<Response | NextResponse>
): Promise<Response | NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "anonymous";

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

  return handler();
}
