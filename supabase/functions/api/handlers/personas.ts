/**
 * @module handlers/personas
 * Handlers for the /personas resource:
 *  - GET    /personas            — search, filter, paginate (public)
 *  - POST   /personas            — create a missing-person report (public)
 *  - PUT    /personas/:id/status — update status (admin only)
 *  - DELETE /personas/:id        — delete a report (admin only)
 */
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../lib/client.ts";
import { verifyAdmin } from "../lib/auth.ts";

/**
 * Searches and paginates the `personas` table.
 *
 * Query params:
 * - `q`            — free-text search term
 * - `category`     — search field: `"all"` | `"cedula"` | `"nombre"` | `"apellido"`
 * - `status`       — filter by estado: `"all"` | `"Desaparecido"` | `"Encontrado"`
 * - `edad`         — age range: `"all"` | `"child"` | `"teen"` | `"adult"` | `"senior"`
 * - `orden`        — sort: `"recientes"` | `"nombre_asc"` | `"edad_asc"` | `"edad_desc"`
 * - `tipoUbicacion`— location type: `"all"` | `"hospital"` | `"refugio"`
 * - `ubicacion`    — free-text location substring filter
 * - `offset`       — pagination offset (default 0)
 * - `limit`        — page size, max 50 (default 50)
 *
 * @param url - Parsed request URL (used to read query params).
 * @param supabase - Supabase client.
 * @returns JSON array of matching persona rows.
 */
export async function handleGetPersonas(url: URL, supabase: SupabaseClient): Promise<Response> {
  const searchQuery = url.searchParams.get("q")?.trim() || "";
  const category = url.searchParams.get("category") || "all";
  const statusFilter = url.searchParams.get("status") || "all";
  const edadFilter = url.searchParams.get("edad") || "all";
  const ordenFilter = url.searchParams.get("orden") || "recientes";
  const tipoUbicacionFilter = url.searchParams.get("tipoUbicacion") || "all";
  const ubicacionFilter = url.searchParams.get("ubicacion")?.trim() || "";
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 50);

  let query = supabase.from("personas").select("*");

  if (searchQuery) {
    if (category === "cedula") {
      query = query.ilike("cedula", `%${searchQuery}%`);
    } else if (category === "nombre") {
      query = query.ilike("nombre", `${searchQuery}%`);
    } else if (category === "apellido") {
      query = query.or(`nombre.ilike.% ${searchQuery}%,nombre.ilike.%-${searchQuery}%`);
    } else {
      query = query.or(`nombre.ilike.%${searchQuery}%,cedula.ilike.%${searchQuery}%`);
    }
  }

  if (statusFilter !== "all") {
    query = query.eq("estado", statusFilter);
  }

  if (edadFilter !== "all") {
    if (edadFilter === "child") {
      query = query.gte("edad", 0).lte("edad", 12);
    } else if (edadFilter === "teen") {
      query = query.gte("edad", 13).lte("edad", 17);
    } else if (edadFilter === "adult") {
      query = query.gte("edad", 18).lte("edad", 59);
    } else if (edadFilter === "senior") {
      query = query.gte("edad", 60);
    }
  }

  if (tipoUbicacionFilter !== "all") {
    if (tipoUbicacionFilter === "hospital") {
      query = query.or("ultima_ubicacion.ilike.%hospital%,ultima_ubicacion.ilike.%clinica%,ubicacion_encontrado.ilike.%hospital%,ubicacion_encontrado.ilike.%clinica%");
    } else if (tipoUbicacionFilter === "refugio") {
      query = query.or("ultima_ubicacion.ilike.%refugio%,ultima_ubicacion.ilike.%albergue%,ubicacion_encontrado.ilike.%refugio%,ubicacion_encontrado.ilike.%albergue%");
    }
  }

  if (ubicacionFilter) {
    const safeUbicacion = ubicacionFilter.replace(/[%_\\]/g, "\\$&");
    const uq = `%${safeUbicacion}%`;
    query = query.or(`ultima_ubicacion.ilike.${uq},ubicacion_encontrado.ilike.${uq}`);
  }

  if (ordenFilter === "nombre_asc") {
    query = query.order("nombre", { ascending: true });
  } else if (ordenFilter === "edad_asc") {
    query = query.order("edad", { ascending: true, nullsFirst: false });
  } else if (ordenFilter === "edad_desc") {
    query = query.order("edad", { ascending: false, nullsFirst: false });
  } else {
    query = query
      .order("estado", { ascending: false })
      .order("fecha_registro", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;

  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Creates a new missing-person report. Open to the public (no auth required).
 * Nuevos registros are always created with `estado: "Desaparecido"`.
 *
 * Required body fields: `nombre`, `cedula`.
 * Optional: `edad`, `ultima_ubicacion`, `telefono_contacto`, `observaciones`, `es_menor`.
 *
 * @param req - Incoming request (JSON body).
 * @param supabase - Supabase client.
 * @returns HTTP 201 with the created persona row, or 400 if required fields are missing.
 */
export async function handleCreatePersona(req: Request, supabase: SupabaseClient): Promise<Response> {
  const body = await req.json();

  if (!body.nombre || !body.cedula) {
    return new Response(
      JSON.stringify({ error: "Nombre y Cédula son requeridos." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase
    .from("personas")
    .insert([
      {
        nombre: body.nombre,
        cedula: body.cedula,
        edad: body.edad ? parseInt(body.edad, 10) : null,
        ultima_ubicacion: body.ultima_ubicacion || null,
        telefono_contacto: body.telefono_contacto || null,
        observaciones: body.observaciones || null,
        es_menor: !!body.es_menor,
        estado: "Desaparecido",
      },
    ])
    .select();

  if (error) throw error;

  return new Response(
    JSON.stringify(data[0]),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Updates the status and location details of a persona. Admin only.
 *
 * Required body field: `estado`.
 * Optional: `ubicacion_encontrado`, `encontrado_por`, `encontrado_por_cedula`.
 *
 * @param req - Incoming request (JSON body).
 * @param id - Persona ID from the URL path.
 * @param supabase - Supabase client.
 * @param authHeader - Raw Authorization header for admin verification.
 * @returns Updated persona row, or 400 if `estado` is missing, 401 if unauthorized.
 */
export async function handleUpdateStatus(
  req: Request,
  id: string,
  supabase: SupabaseClient,
  authHeader: string | null
): Promise<Response> {
  await verifyAdmin(supabase, authHeader);
  const body = await req.json();

  if (!body.estado) {
    return new Response(
      JSON.stringify({ error: "El campo estado es requerido." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase
    .from("personas")
    .update({
      estado: body.estado,
      ubicacion_encontrado: body.ubicacion_encontrado || null,
      encontrado_por: body.encontrado_por || null,
      encontrado_por_cedula: body.encontrado_por_cedula || null,
      fecha_actualizacion: new Date().toISOString(),
    })
    .eq("id", id)
    .select();

  if (error) throw error;

  return new Response(
    JSON.stringify(data[0]),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Permanently deletes a persona record. Admin only.
 *
 * @param id - Persona ID from the URL path.
 * @param supabase - Supabase client.
 * @param authHeader - Raw Authorization header for admin verification.
 * @returns The deleted persona row, or 401 if unauthorized.
 */
export async function handleDeletePersona(
  id: string,
  supabase: SupabaseClient,
  authHeader: string | null
): Promise<Response> {
  await verifyAdmin(supabase, authHeader);

  const { data, error } = await supabase
    .from("personas")
    .delete()
    .eq("id", id)
    .select();

  if (error) throw error;

  return new Response(
    JSON.stringify(data ? data[0] : null),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
