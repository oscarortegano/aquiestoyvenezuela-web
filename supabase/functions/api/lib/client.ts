/**
 * @module lib/client
 * Shared Supabase client factory and CORS headers for the API Edge Function.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/** CORS headers applied to every response. */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

/**
 * Creates a Supabase client scoped to the incoming request's auth token.
 * Passes the Authorization header through so RLS policies apply to the caller.
 *
 * @param req - The incoming HTTP request.
 * @returns An object with the configured `supabase` client and the raw `authHeader` string (or null).
 */
export function createSupabaseClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization");
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
  return { supabase, authHeader };
}
