/**
 * @module api
 * Supabase Edge Function — REST API for the AquíEstoyVenezuela platform.
 *
 * Public endpoints:
 *   GET  /stats                    — aggregate counts (total / desaparecidos / encontrados)
 *   GET  /personas                 — search & paginate personas
 *   POST /personas                 — report a missing person
 *
 * Admin endpoints (require Bearer token):
 *   PUT    /personas/:id/status    — update status and location
 *   DELETE /personas/:id           — remove a report
 *   POST   /import-csv             — bulk upsert from CSV data
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createSupabaseClient } from "./lib/client.ts";
import { handleStats } from "./handlers/stats.ts";
import { handleGetPersonas, handleCreatePersona, handleUpdateStatus, handleDeletePersona } from "./handlers/personas.ts";
import { handleImportCsv } from "./handlers/import-csv.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "").replace(/\/$/, "");
  const method = req.method;
  const { supabase, authHeader } = createSupabaseClient(req);

  try {
    if (path === "/stats" && method === "GET") {
      return await handleStats(supabase);
    }

    if (path === "/personas" && method === "GET") {
      return await handleGetPersonas(url, supabase);
    }

    if (path === "/personas" && method === "POST") {
      return await handleCreatePersona(req, supabase);
    }

    const statusMatch = path.match(/^\/personas\/(\d+)\/status$/);
    if (statusMatch && method === "PUT") {
      return await handleUpdateStatus(req, statusMatch[1], supabase, authHeader);
    }

    const deleteMatch = path.match(/^\/personas\/(\d+)$/);
    if (deleteMatch && method === "DELETE") {
      return await handleDeletePersona(deleteMatch[1], supabase, authHeader);
    }

    if (path === "/import-csv" && method === "POST") {
      return await handleImportCsv(req, supabase, authHeader);
    }

    return new Response(
      JSON.stringify({ error: "Endpoint no encontrado." }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const status =
      err.message === "Unauthorized admin user" || err.message === "Missing authorization header"
        ? 401
        : 500;
    return new Response(
      JSON.stringify({ error: err.message || "Error interno del servidor" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
