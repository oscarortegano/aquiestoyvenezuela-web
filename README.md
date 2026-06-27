# Aquí Estoy Venezuela Web

Plataforma web ciudadana para registrar, buscar y actualizar reportes de personas desaparecidas o localizadas en Venezuela durante situaciones de emergencia. El proyecto combina una interfaz estática, Supabase como base de datos/autenticación/storage y una Edge Function opcional como capa API.

## Ruta rápida

```bash
git clone https://github.com/aquiestoyvenezuela/aquiestoyvenezuela-web.git
cd aquiestoyvenezuela-web
cp static/js/config.example.js static/js/config.js
```

Editá `static/js/config.js` con tus valores de Supabase:

```js
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-supabase-anon-key";
const WHATSAPP_PHONE = "584120000000";
```

Para probar sin Supabase, abrí `index.html` en el navegador. Si `static/js/config.js` no está configurado, la app entra en modo demo local usando `localStorage`.

## Qué hace el proyecto

- Busca personas por nombre, apellido o cédula.
- Muestra estadísticas: reportados, desaparecidos y localizados.
- Permite registrar reportes públicos de personas desaparecidas.
- Evita duplicados básicos por cédula antes de registrar.
- Permite filtrar por estado, edad, tipo de lugar y ubicación.
- Muestra detalles de cada persona y botones para compartir en redes.
- Permite informar novedades por WhatsApp.
- Incluye login administrativo para actualizar estados, eliminar reportes e importar CSV.

## Stack

| Capa | Tecnología | Archivos principales |
|---|---|---|
| Frontend | HTML, CSS, JavaScript vanilla | `index.html`, `static/css/style.css`, `static/js/app.js` |
| Configuración cliente | JavaScript local ignorado por Git | `static/js/config.example.js`, `static/js/config.js` |
| Base de datos | Supabase/Postgres | `schema.sql` |
| Auth | Supabase Auth | `static/js/app.js` |
| API opcional | Supabase Edge Function con Deno | `supabase/functions/api/index.ts` |
| CSV | PapaParse desde CDN | `index.html`, `static/js/app.js` |
| Deploy estático | Nginx + Docker | `Dockerfile`, `docker-compose.yml`, `nginx.conf` |

## Estructura del repositorio

```text
.
├── index.html                         # Página principal de búsqueda, registro y modales
├── admin/index.html                   # Redirección para activar login admin desde /admin
├── static/
│   ├── css/style.css                  # Estilos visuales de la aplicación
│   ├── img/                           # Logo y fondo
│   └── js/
│       ├── app.js                     # Lógica principal del frontend
│       └── config.example.js          # Plantilla de configuración local
├── supabase/functions/api/index.ts    # Edge Function REST para stats/personas/importación
├── schema.sql                         # Tabla, RLS, storage bucket y datos demo
├── Dockerfile                         # Imagen Nginx para servir la web
├── docker-compose.yml                 # Servicio web local/servidor
└── nginx.conf                         # Configuración de dominio, SSL y proxy /api/
```

## Modos de ejecución

### 1. Demo local sin Supabase

Si `SUPABASE_URL` o `SUPABASE_ANON_KEY` no están configurados, `app.js` activa modo sandbox:

- guarda datos en `localStorage` del navegador;
- crea registros ficticios de prueba;
- permite probar búsqueda, filtros, registro, edición e importación CSV;
- usa credenciales demo para admin:

```text
Email: admin@example.com
Password: change-me
```

Este modo es SOLO para pruebas locales. Los datos no salen del navegador.

### 2. Producción con Supabase

En producción, la app usa:

- `personas` como tabla principal;
- Supabase Auth para administradores;
- Storage bucket `fotos-personas` para fotos públicas;
- Edge Function `/functions/v1/api/*` cuando está disponible;
- fallback directo al cliente Supabase si la API no responde.

## Configurar Supabase

1. Creá un proyecto en Supabase.
2. Abrí el SQL Editor.
3. Ejecutá `schema.sql`.
4. Creá al menos un usuario administrador en Supabase Auth.
5. Copiá la URL del proyecto y la anon key en `static/js/config.js`.
6. Si vas a usar la Edge Function, desplegá `supabase/functions/api/index.ts`.

### Tabla principal: `personas`

Campos relevantes:

| Campo | Uso |
|---|---|
| `id` | Identificador interno |
| `nombre` | Nombre completo de la persona |
| `cedula` | Cédula única |
| `edad` | Edad aproximada |
| `ultima_ubicacion` | Última ubicación conocida |
| `telefono_contacto` | Teléfono de quien reporta |
| `observaciones` | Señales, vestimenta o detalles útiles |
| `estado` | `Desaparecido` o `Encontrado` |
| `ubicacion_encontrado` | Lugar donde fue localizada |
| `encontrado_por` | Persona que reportó la localización |
| `encontrado_por_cedula` | Cédula de quien reportó la localización |
| `es_menor` | Marca si es niño, niña o adolescente |
| `foto_url` | URL pública de foto, si existe |
| `fecha_registro` | Fecha de creación del reporte |
| `fecha_actualizacion` | Última actualización |

## API disponible

La Edge Function implementa estos endpoints bajo `/api` internamente y se consume desde Supabase como `/functions/v1/api`.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/stats` | Público | Devuelve totales de reportados, desaparecidos y encontrados |
| `GET` | `/personas` | Público | Lista personas con búsqueda, filtros, orden y paginación |
| `POST` | `/personas` | Público | Crea un reporte de persona desaparecida |
| `PUT` | `/personas/:id/status` | Admin autenticado | Actualiza estado y datos de localización |
| `DELETE` | `/personas/:id` | Admin autenticado | Elimina un reporte |
| `POST` | `/import-csv` | Admin autenticado | Importa/upsertea personas desde CSV parseado |

Parámetros de búsqueda en `GET /personas`:

| Parámetro | Valores esperados |
|---|---|
| `q` | Texto libre |
| `category` | `all`, `cedula`, `nombre`, `apellido` |
| `status` | `all`, `Desaparecido`, `Encontrado` |
| `edad` | `all`, `child`, `teen`, `adult`, `senior` |
| `orden` | `recientes`, `nombre_asc`, `edad_asc`, `edad_desc` |
| `tipoUbicacion` | `all`, `hospital`, `refugio` |
| `ubicacion` | Texto libre |
| `offset` | Número inicial de paginación |
| `limit` | Tamaño de página, por defecto 50 |

## Flujo de usuario

1. La persona entra al sitio.
2. Busca por nombre o cédula.
3. Si encuentra el reporte, abre el detalle y puede compartirlo o informar novedades por WhatsApp.
4. Si no encuentra el reporte, puede registrar una nueva persona desaparecida.
5. Un administrador puede entrar por `/admin`, iniciar sesión y actualizar el estado a `Encontrado`.

## Flujo administrativo

1. Entrar a `/admin`.
2. Iniciar sesión con un usuario de Supabase Auth.
3. Ver el panel administrativo.
4. Actualizar estado de una persona.
5. Eliminar registros incorrectos si corresponde.
6. Importar CSV con columnas reconocibles.

Columnas CSV soportadas por detección flexible:

- nombre / apellido
- cedula / ci / documento / identidad
- edad / age / año
- loc / ubi / dirección
- obs / detalle / señas

## Despliegue con Docker

Construir y levantar el contenedor:

```bash
docker compose up --build -d
```

El servicio expone el sitio en el puerto `80` del host según `docker-compose.yml`.

> Importante: `nginx.conf` está preparado para `aquiestoyvenezuela.com` con certificados Let's Encrypt en `/etc/letsencrypt/live/aquiestoyvenezuela.com/`. Si desplegás en otro dominio o sin SSL local, ajustá esa configuración.

## Seguridad y datos sensibles

Este proyecto maneja datos personales sensibles. Tomalo en serio:

- No commitear `static/js/config.js`.
- No commitear `.env`, claves, certificados ni backups.
- No usar personas reales para pruebas públicas.
- Revisar políticas RLS antes de producción.
- Limitar quién tiene usuarios admin en Supabase Auth.
- Validar legalmente el tratamiento de datos personales antes de operar públicamente.

Archivos ya ignorados por Git:

```text
static/js/config.js
.env
.env.*
*.pem
*.key
*.crt
*.p12
*.pfx
backups/
node_modules/
dist/
build/
```

## Checklist de puesta en producción

- [ ] `schema.sql` ejecutado en Supabase.
- [ ] RLS habilitado y políticas revisadas.
- [ ] Usuario administrador creado en Supabase Auth.
- [ ] `static/js/config.js` creado con URL y anon key reales.
- [ ] `WHATSAPP_PHONE` configurado con número operativo.
- [ ] Edge Function desplegada si se usará `/functions/v1/api`.
- [ ] Dominio y certificados SSL configurados en Nginx.
- [ ] Prueba de búsqueda realizada.
- [ ] Prueba de registro público realizada.
- [ ] Prueba de login admin realizada.
- [ ] Prueba de actualización a `Encontrado` realizada.
- [ ] Prueba de importación CSV realizada.

## Solución de problemas

| Problema | Causa probable | Qué revisar |
|---|---|---|
| La app muestra modo demo | `config.js` no existe o tiene valores placeholder | Copiar `config.example.js` y completar Supabase |
| No carga estadísticas | Edge Function no disponible o error de Supabase | Consola del navegador, URL/key, función `/stats` |
| Login admin falla | Usuario no existe o password incorrecto | Supabase Auth |
| No permite actualizar estado | Sesión admin ausente o token inválido | Login, headers Authorization, políticas RLS |
| CSV no importa | Columnas no reconocidas o usuario no admin | Encabezados del CSV y sesión activa |
| Nginx no levanta SSL | Certificados no existen en la ruta esperada | `nginx.conf` y montaje de `/etc/letsencrypt` |

## Notas para mantenimiento

- `app.js` contiene la mayor parte de la lógica: estado global, búsqueda, render, formularios, admin, CSV y sharing.
- La Edge Function replica parte de la lógica de consulta y escritura para centralizar operaciones.
- El frontend tiene fallback directo a Supabase cuando la API no está disponible.
- Si el proyecto crece, conviene separar `app.js` por módulos: API client, estado, render, formularios, admin y CSV.
