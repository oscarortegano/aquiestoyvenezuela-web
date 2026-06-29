/**
 * @module handlers/import-csv
 * Handler for POST /import-csv — bulk upsert of persona records. Admin only.
 */
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../lib/client.ts";
import { verifyAdmin } from "../lib/auth.ts";

/**
 * Bulk-upserts an array of persona records parsed from a CSV upload.
 * Rows without `nombre` or `cedula` are silently skipped.
 * Conflicts on `cedula` are resolved by updating the existing row (upsert).
 *
 * @param req - Incoming request (JSON body: array of persona objects).
 * @param supabase - Supabase client.
 * @param authHeader - Raw Authorization header for admin verification.
 * @returns `{ message, inserted, skipped }`, or 400 if the body is invalid, 401 if unauthorized.
 */
export async function handleImportCsv(
  req: Request,
  supabase: SupabaseClient,
  authHeader: string | null
): Promise<Response> {
  await verifyAdmin(supabase, authHeader);
  const body = await req.json();

  if (!Array.isArray(body)) {
    return new Response(
      JSON.stringify({ error: "El cuerpo debe ser un array de registros." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const validRows = body
    .filter((row: any) => row.nombre && row.cedula)
    .map((row: any) => ({
      nombre: row.nombre,
      cedula: row.cedula,
      edad: row.edad ? parseInt(row.edad, 10) : null,
      ultima_ubicacion: row.ultima_ubicacion || null,
      telefono_contacto: row.telefono_contacto || null,
      observaciones: row.observaciones || null,
      estado: row.estado || "Desaparecido",
      ubicacion_encontrado: row.ubicacion_encontrado || null,
      es_menor: !!row.es_menor,
    }));

  const skipped = body.length - validRows.length;

  if (validRows.length === 0) {
    return new Response(
      JSON.stringify({ error: "No hay filas válidas. Cada fila requiere nombre y cédula." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { error } = await supabase
    .from("personas")
    .upsert(validRows, { onConflict: "cedula" });

  if (error) throw error;

  return new Response(
    JSON.stringify({ message: "Importación completada", inserted: validRows.length, skipped }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
