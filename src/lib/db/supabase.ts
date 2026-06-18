import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Lazy singleton — avoids calling createClient at module init time (safe for SSR/build)
let _browser: ReturnType<typeof createClient> | undefined;
export function getSupabaseBrowser() {
  if (!_browser) {
    _browser = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _browser;
}

// Admin client with service role — bypasses RLS, server-side only
export function getSupabaseAdmin() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
