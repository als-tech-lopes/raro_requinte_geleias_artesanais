import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
