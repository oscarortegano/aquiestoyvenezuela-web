# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Emergency missing-persons registry for Venezuela. The public can search and report missing people; admins can mark them as found or delete incorrect records.

## Running locally

No build step. Open `index.html` directly in a browser. Without `static/js/config.js` the app auto-enters sandbox mode (localStorage, no backend).

To connect to real Supabase:

```bash
cp static/js/config.example.js static/js/config.js
# Edit config.js with real SUPABASE_URL, SUPABASE_ANON_KEY, WHATSAPP_PHONE
```

Sandbox admin credentials: `admin@example.com` / `change-me`.

## Docker deploy

```bash
docker compose up --build -d   # serves on port 80
```

The Dockerfile uses `nginx:alpine`. `nginx.conf` expects Let's Encrypt certs at `/etc/letsencrypt/live/aquiestoyvenezuela.com/` and proxies `/api/` to the upstream `apivzla`.

## Architecture

```
index.html + static/js/app.js   ← all frontend logic (vanilla JS, no framework)
        │
        ├─ Preferred: Supabase Edge Function (supabase/functions/api/index.ts, Deno)
        └─ Fallback:  Supabase JS client directly
```

**`static/js/app.js`** is the entire frontend: state management, rendering, search, filters, pagination, admin panel, CSV import, WhatsApp sharing, toasts. All state lives in the global `state` object. The `DOM` object holds all element references.

**`supabase/functions/api/index.ts`** is the Deno Edge Function. It exposes REST endpoints the frontend calls as `${SUPABASE_URL}/functions/v1/api/...`. If the Edge Function fails, `app.js` falls back to the Supabase JS client directly.

**`schema.sql`** creates the `personas` table, RLS policies, and the `fotos-personas` storage bucket. Run it once in Supabase SQL Editor to set up a new project.

**`admin/index.html`** only sets `triggerAdminLogin` in `sessionStorage` then redirects to `/`, which triggers the login modal in `app.js`.

## Key data model

Single table: `public.personas`. Required fields: `nombre`, `cedula` (unique), `estado` (`Desaparecido`|`Encontrado`), `es_menor`, `fecha_registro`, `fecha_actualizacion`.

## Sandbox vs Supabase mode

`app.js` checks for real `SUPABASE_URL`/`SUPABASE_ANON_KEY` on init. If missing or containing placeholder values, it sets `state.useSandbox = true` and operates entirely from `localStorage` with seeded demo data. All API call paths are branched on `state.useSandbox`.

## Files not to commit

`static/js/config.js` is gitignored. Never commit it with real keys, real CSV data, or production backups.

## Edge Function deployment

```bash
supabase functions deploy api
```

The function reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from its runtime environment (set in the Supabase project, not in this repo).