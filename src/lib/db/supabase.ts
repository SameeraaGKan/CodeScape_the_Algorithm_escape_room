import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Uses createBrowserClient so the session is stored in cookies (not just localStorage),
// making it visible to the server-side client and proxy.
let _browser: ReturnType<typeof createBrowserClient> | undefined;
export function getSupabaseBrowser() {
  if (!_browser) {
    _browser = createBrowserClient(supabaseUrl, supabaseAnonKey);
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
