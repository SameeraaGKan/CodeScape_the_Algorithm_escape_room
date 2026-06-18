import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Server client with cookie-based session — used in Server Components and Route Handlers
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — cookie mutations are handled by proxy
        }
      },
    },
  });
}

// Decodes a Supabase JWT payload locally — no network call, just base64 decode.
// Checks expiry. Returns null if invalid or expired.
function parseJwt(token: string): { sub: string; email?: string; exp: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf-8"));
    if (!payload.sub || !payload.exp) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload as { sub: string; email?: string; exp: number };
  } catch {
    return null;
  }
}

// Resolves the authenticated user from a route handler request.
// Bearer token path: decodes the JWT locally (zero network calls).
// Cookie fallback: used for server-rendered pages / the proxy.
export async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const payload = parseJwt(token);
    if (payload) {
      return { id: payload.sub, email: payload.email ?? payload.sub };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}
