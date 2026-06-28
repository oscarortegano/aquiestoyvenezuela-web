import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "").replace(/\/$/, "");
  const method = req.method;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  
  // Usar service role para poder bypass RLS controladamente, o reenviar cabecera del usuario
  const authHeader = req.headers.get("Authorization");
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });

  // Helper para verificar si el usuario está autenticado como administrador
  async function verifyAdmin() {
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

  try {
    // 1. GET /stats
    if (path === "/stats" && method === "GET") {
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

    // 2. GET /personas (Búsqueda, Filtros y Paginación)
    if (path === "/personas" && method === "GET") {
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

    // 3. POST /personas (Creación pública de reporte)
    if (path === "/personas" && method === "POST") {
      const body = await req.json();
      
      // Validación básica
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
            estado: "Desaparecido"
          }
        ])
        .select();

      if (error) throw error;

      return new Response(
        JSON.stringify(data[0]),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. PUT /personas/:id/status (Privado - Actualizar Estatus)
    const statusMatch = path.match(/^\/personas\/(\d+)\/status$/);
    if (statusMatch && method === "PUT") {
      await verifyAdmin();
      const id = statusMatch[1];
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
          fecha_actualizacion: new Date().toISOString()
        })
        .eq("id", id)
        .select();

      if (error) throw error;

      return new Response(
        JSON.stringify(data[0]),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4.1 DELETE /personas/:id (Privado - Eliminar Reporte)
    const deleteMatch = path.match(/^\/personas\/(\d+)$/);
    if (deleteMatch && method === "DELETE") {
      await verifyAdmin();
      const id = deleteMatch[1];
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

    // 5. POST /import-csv (Privado - Carga Masiva)
    if (path === "/import-csv" && method === "POST") {
      await verifyAdmin();
      const body = await req.json(); // Array de registros parsed
      
      if (!Array.isArray(body)) {
        return new Response(
          JSON.stringify({ error: "El cuerpo debe ser un array de registros." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Procesar en chunks o de a uno (Upsert)
      const results = [];
      for (const row of body) {
        if (!row.nombre || !row.cedula) continue;
        
        const { data, error } = await supabase
          .from("personas")
          .upsert(
            {
              nombre: row.nombre,
              cedula: row.cedula,
              edad: row.edad ? parseInt(row.edad, 10) : null,
              ultima_ubicacion: row.ultima_ubicacion || null,
              telefono_contacto: row.telefono_contacto || null,
              observaciones: row.observaciones || null,
              estado: row.estado || "Desaparecido",
              ubicacion_encontrado: row.ubicacion_encontrado || null,
              es_menor: !!row.es_menor
            },
            { onConflict: "cedula" }
          )
          .select();

        if (error) {
          results.push({ cedula: row.cedula, status: "error", error: error.message });
        } else {
          results.push({ cedula: row.cedula, status: "success" });
        }
      }

      return new Response(
        JSON.stringify({ message: "Importación completada", results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 404 Not Found
    return new Response(
      JSON.stringify({ error: "Endpoint no encontrado." }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    const status = err.message === "Unauthorized admin user" || err.message === "Missing authorization header" ? 401 : 500;
    return new Response(
      JSON.stringify({ error: err.message || "Error interno del servidor" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
