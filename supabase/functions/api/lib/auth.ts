/**
 * @module lib/auth
 * Admin authentication helper for protected API routes.
 */
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/**
 * Verifies that the request carries a valid Supabase auth token.
 * Throws with a message that maps to HTTP 401 in the top-level error handler.
 *
 * @param supabase - Supabase client (already scoped to the request's auth token).
 * @param authHeader - Raw `Authorization` header value, or null if absent.
 * @returns The authenticated Supabase user object.
 * @throws {Error} "Missing authorization header" if no token is present.
 * @throws {Error} "Unauthorized admin user" if the token is invalid or expired.
 */
export async function verifyAdmin(supabase: SupabaseClient, authHeader: string | null) {
  if (!authHeader) {
    throw new Error("Missing authorization header");
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error("Unauthorized admin user");
  }
  return user;
}
