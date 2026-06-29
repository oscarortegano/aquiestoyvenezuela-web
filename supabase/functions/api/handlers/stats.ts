/**
 * @module handlers/stats
 * Handler for GET /stats — returns aggregate counts from the `personas` table.
 */
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../lib/client.ts";

/**
 * Returns total, missing (Desaparecido), and found (Encontrado) person counts.
 * All three queries run in parallel.
 *
 * @param supabase - Supabase client.
 * @returns JSON response: `{ total, desaparecidos, encontrados }`.
 */
export async function handleStats(supabase: SupabaseClient): Promise<Response> {
  const [
    { count: total, error: totalError },
    { count: desaparecidos, error: desaparecidoError },
    { count: encontrados, error: encontradoError },
  ] = await Promise.all([
    supabase.from("personas").select("id", { count: "exact", head: true }),
    supabase.from("personas").select("id", { count: "exact", head: true }).eq("estado", "Desaparecido"),
    supabase.from("personas").select("id", { count: "exact", head: true }).eq("estado", "Encontrado"),
  ]);

  if (totalError || desaparecidoError || encontradoError) {
    throw totalError || desaparecidoError || encontradoError;
  }

  return new Response(
    JSON.stringify({ total: total || 0, desaparecidos: desaparecidos || 0, encontrados: encontrados || 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
