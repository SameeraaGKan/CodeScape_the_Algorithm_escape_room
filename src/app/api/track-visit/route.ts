import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db, pageViews } from "@/lib/db";
import { trackVisitSchema } from "@/lib/security/schemas";
import { withRateLimit, pageViewLimiter } from "@/lib/security/ratelimit";

const VISITOR_COOKIE = "ce_vid";

export async function POST(request: NextRequest) {
  return withRateLimit(request, pageViewLimiter, async () => {
    const body = await request.json().catch(() => null);
    const parsed = trackVisitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const visitorId = request.cookies.get(VISITOR_COOKIE)?.value ?? randomUUID();

    await db.insert(pageViews).values({
      path: parsed.data.path,
      visitorId,
      referrer: parsed.data.referrer,
      userAgent: request.headers.get("user-agent"),
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  });
}
