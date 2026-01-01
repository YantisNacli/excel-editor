import { createClient } from "@supabase/supabase-js";

// Get Supabase client - safe for build-time usage with fallbacks
export function getSupabase() {
  const url = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(url, key);
}

// Default singleton for routes that import directly
export const supabase = getSupabase();

