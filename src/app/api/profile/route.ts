import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase.server";
import { db, teams } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({ status: teams.status, path: teams.selectedPath })
    .from(teams)
    .where(eq(teams.createdBy, user.email!));

  const gamesCreated = rows.length;
  const gamesCompleted = rows.filter(r => r.status === "completed").length;
  const uniquePaths = [...new Set(rows.map(r => r.path).filter(Boolean))];

  return NextResponse.json({
    gamesCreated,
    gamesCompleted,
    pathsTried: uniquePaths.length,
    paths: uniquePaths,
    memberSince: user.created_at,
    email: user.email,
    displayName: (user.user_metadata?.display_name as string) ?? "",
    avatarColor: (user.user_metadata?.avatar_color as string) ?? "#05b9b6",
  });
}
