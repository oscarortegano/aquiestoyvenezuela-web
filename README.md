# Aquí Estoy Venezuela

> Entrada general, comprensión rápida y navegación del proyecto.

## Audiencia

Todos: ciudadanía, voluntariado, coordinación, producto, desarrollo, datos, seguridad, QA, DevOps y gestión de proyectos.

## Qué responde este documento

Qué es el proyecto, qué hace hoy, qué está verificado, qué riesgos existen y qué documento leer después.

## Estado y fecha de revisión

- Fecha: 2026-06-29.
- Rama: `docs/audit-and-current-architecture`.
- Referencia local: `8d7dfcb442772099958efc8578db124a7b3a7bff`.
- Estado: revisión documental Codex; no confirma despliegue productivo ni sustituye validación humana.

**Directorio web de emergencia para la búsqueda y localización de personas en Venezuela.**

> ⚠️ **Advertencia de privacidad**: Actualmente **toda la información de la tabla de personas es de lectura pública**, incluyendo teléfonos y datos sensibles. Ver [Seguridad y privacidad](#seguridad-y-privacidad).

---

## Resumen ejecutivo

| Pregunta | Respuesta breve |
|---|---|
| **¿Qué hace?** | Permite buscar personas reportadas, registrar desaparecidos, y que administradores actualicen estados e importen listados. |
| **¿Quién lo usa?** | Ciudadanos (búsqueda y reporte sin registro) y administradores autorizados (gestión con login). |
| **¿De dónde vienen los datos?** | Formulario público en la web, importación CSV por administradores, y datos demo para pruebas. |
| **¿Dónde se guardan?** | Base de datos PostgreSQL en Supabase. También almacenamiento local del navegador en modo demo. |
| **¿Qué puede ver el público?** | Actualmente TODO: nombres, cédulas, edades, ubicaciones, teléfonos, observaciones y estados. |
| **¿Qué puede hacer un administrador?** | Iniciar sesión, actualizar estado, eliminar reportes e importar archivos CSV. |
| **¿Qué está verificado?** | El código del repositorio fue verificado. El despliegue real en producción NO pudo verificarse. |
| **¿Principal riesgo actual?** | Exposición pública de datos personales sensibles (P0). El panel administrativo tiene un bug que impide su visualización (P0). |

---

## Navegación rápida

- [Entender el proyecto en cinco minutos](#entender-el-proyecto-en-cinco-minutos)
- [Capacidades actuales](#capacidades-actuales)
- [Cómo funciona para una persona no técnica](#cómo-funciona-para-una-persona-no-técnica)
- [Origen, recorrido y destino de los datos](#origen-recorrido-y-destino-de-los-datos)
- [Calidad y confiabilidad de la información](#calidad-y-confiabilidad-de-la-información)
- [Seguridad y privacidad](#seguridad-y-privacidad)
- [Arquitectura técnica del proyecto](#arquitectura-técnica-del-proyecto)
  - [Vista general](#vista-general)
  - [Diagrama de arquitectura actual](#diagrama-de-arquitectura-actual)
  - [Componentes y responsabilidades](#componentes-y-responsabilidades)
  - [Mapa de código](#mapa-de-código)
  - [Modos de operación](#modos-de-operación)
  - [Flujo técnico de una consulta](#flujo-técnico-de-una-consulta-de-búsqueda)
  - [Flujo técnico de escritura](#flujo-técnico-de-escritura-y-administración)
  - [Autenticación y autorización](#autenticación-y-autorización)
  - [Arquitectura de datos](#arquitectura-de-datos)
  - [Fronteras de seguridad](#fronteras-de-seguridad-actuales)
  - [Arquitectura de despliegue](#arquitectura-de-despliegue)
  - [Stack técnico](#stack-técnico)
  - [Dependencias externas](#dependencias-externas)
  - [Decisiones y deuda técnica](#decisiones-arquitectónicas-y-deuda-técnica)
  - [Arquitectura actual frente a objetivo](#arquitectura-actual-frente-a-objetivo)
  - [Cómo modificar el sistema](#cómo-modificar-el-sistema-de-forma-segura)
- [Estado técnico verificable](#estado-técnico-verificable)
- [Ejecución local](#ejecución-local)
- [Despliegue](#despliegue)
- [Pull requests y trabajo pendiente](#pull-requests-y-trabajo-pendiente)
- [Arquitectura objetivo](#arquitectura-objetivo)
- [Documentación especializada](#documentación-especializada)
- [Contribuir](#contribuir)

---

## Entender el proyecto en cinco minutos

### ¿Qué problema resuelve?

En emergencias, la información de personas desaparecidas queda dispersa en chats de WhatsApp, redes sociales, llamadas y hojas de cálculo. Esta fragmentación dificulta encontrar datos rápidamente y provoca duplicación.

El proyecto centraliza esa información en un solo lugar accesible desde cualquier navegador.

### Flujo completo en términos simples

```
Persona reporta    →  Formulario web o archivo CSV
                         ↓
                    Validación (nombre y cédula obligatorios)
                         ↓
                    Verificación de duplicado por cédula
                         ↓
                    Base de datos (PostgreSQL en Supabase)
                         ↓
                    Búsqueda pública (cualquier visitante)
                         ↓
                    Administrador actualiza estado o importa más datos
```

### Qué está verificado y qué no

| Categoría | Estado | Etiqueta |
|-----------|:------:|----------|
| Código frontend (HTML, CSS, JS) | Revisado y funcional en modo sandbox | **Verificado en código** |
| Modo sandbox/demo | Funcional sin backend | **Probado localmente** |
| Esquema de base de datos (schema.sql) | Definido en el repositorio | **Configurado, no verificado** |
| Edge Function (API) | Código escrito en el repositorio | **Configurado, no verificado** |
| Supabase Auth | Configurado en código | **Configurado, no verificado** |
| Despliegue en producción | Existe HTML observado con datos reales pero con versiones diferentes al repositorio | **Observado en HTML, no verificado** |
| Dominio aquiestoyvenezuela.com | Configurado en nginx.conf | **Configurado, no verificado** |
| SSL/HTTPS | Configurado en nginx.conf pero con error que impide el inicio | **Configurado, no funcional** |

> ⚠️ **Version drift**: El HTML observado en producción referencia CSS `?v=13`, JS `?v=12` y config `?v=7`, mientras que el repositorio contiene `?v=8`, `?v=11` y `?v=6`. El código en producción es **diferente** al del repositorio.

---

## Capacidades actuales

### Funciones públicas

| Capacidad | Estado | Verificación |
|-----------|:------:|:------------:|
| Buscar personas por nombre o cédula | **Funcional** | Probado en sandbox |
| Filtros por estado, edad, ubicación | **Funcional** | Verificado en código |
| Ver estadísticas generales | **Funcional** | Probado en sandbox |
| Ver detalle de cada persona | **Funcional** | Verificado en código |
| Compartir en redes sociales y WhatsApp (enlace) | **Funcional** | Verificado en código |
| Registrar públicamente un desaparecido | **Funcional** | Verificado en código |
| Detección de duplicados por cédula | **Parcial** | Usa ILIKE con substring — falsos positivos posibles |
| Paginación ("Cargar más") | **Funcional** | Probado en sandbox |

### Funciones administrativas

| Capacidad | Estado | Verificación |
|-----------|:------:|:------------:|
| Inicio de sesión (Supabase Auth) | **Configurado** | Código existe, no verificado con Supabase real |
| Actualizar estado (Desaparecido/Encontrado) | **Configurado** | Código existe |
| Eliminar reportes | **Configurado** | Sin soft delete — eliminación permanente |
| Importar registros por CSV | **Funcional** | Probado en sandbox |
| Panel de administración | ⚠️ **Bug P0** | `id="admin-panel"` duplicado — el panel no se muestra |

### Modo demostración

| Capacidad | Estado |
|-----------|:------:|
| Sandbox completo con localStorage | **Funcional** |
| Datos de demostración | **Funcional** (5 personas ficticias) |
| Admin de prueba | **Funcional** (credenciales hardcodeadas) |

---

## Cómo funciona para una persona no técnica

> Para una explicación detallada con escenarios paso a paso, ver [docs/HOW_THE_PROJECT_WORKS.md](./docs/HOW_THE_PROJECT_WORKS.md).

### Buscar a una persona

1. Abrís la página y ves tres números: total de reportados, buscados y localizados.
2. Escribís un nombre o cédula en el buscador y presionás Enter.
3. Aparecen tarjetas con la información de cada persona que coincide.
4. Si no hay resultados, la página ofrece un formulario para reportar a la persona como desaparecida.

### Reportar a una persona desaparecida

1. Completás el formulario con nombre y cédula (obligatorios) y datos adicionales (edad, teléfono, ubicación, observaciones).
2. El sistema verifica que no exista otra persona con esa misma cédula.
3. Si no existe, guarda el reporte con estado "Desaparecido".

### Qué hace un administrador

1. Entra a `/admin`, inicia sesión con su correo y contraseña.
2. Puede cambiar el estado de una persona (de Desaparecido a Encontrado, o viceversa).
3. Puede eliminar reportes (la eliminación es permanente).
4. Puede cargar un archivo CSV con muchos registros para importarlos de una vez.

### ⚠️ Lo que el sistema NO hace

- **No modera reportes**: cualquier persona puede publicar un reporte sin revisión previa.
- **No verifica identidad**: no hay CAPTCHA ni verificación humana.
- **No guarda historial**: cuando un administrador modifica datos, la información anterior se pierde.
- **No protege datos sensibles**: teléfonos, observaciones médicas y datos de quien reportó son visibles públicamente.
- **WhatsApp NO está integrado**: el botón solo abre la aplicación con un mensaje pre-escrito. No recibe ni procesa mensajes.

---

## Origen, recorrido y destino de los datos

### ¿De dónde provienen los datos?

| Fuente | Canal | Estado |
|--------|-------|:------:|
| Formulario público en la web | Navegador → API | **Implementado** |
| Importación de archivo CSV | Panel admin → API | **Implementado** |
| Datos de demostración | Código (app.js y schema.sql) | **Implementado** |
| WhatsApp (solo enlace para compartir) | Deep link — no recibe datos | **Solo enlace** |

### ¿Cómo ingresan los datos?

**Formulario público**: el usuario completa un formulario, el frontend valida nombre y cédula, verifica que no exista un duplicado, y envía los datos a la API o directamente a Supabase. Se guarda con estado inicial "Desaparecido".

**Importación CSV**: un administrador carga un archivo. PapaParse (librería JavaScript) lo lee en el navegador. El sistema identifica columnas por palabras clave en los encabezados (`nom`→nombre, `ced`→cédula, `edad`→edad, etc.). Los registros se envían a la API y se guardan con upsert por cédula (actualiza si existe, inserta si no).

> ⚠️ **Riesgo de importación**: El importador actual **siempre fuerza `estado: 'Desaparecido'`** y **sobrescribe** registros existentes. Si una persona ya estaba marcada como "Encontrado", una reimportación la revierte a "Desaparecido". Además, el mapeo de columnas usa coincidencia por substrings — extremadamente frágil (ej: `'ci'` dentro de `'ubicaCIón'` o `'observaCIones'`).

**Modo demo**: si no existe `config.js`, la app funciona completamente con datos ficticios en localStorage.

### ¿Dónde se almacenan los datos?

| Tipo de información | Dónde se guarda | ¿Verificado? |
|--------------------|-----------------|:------------:|
| Nombres, cédulas, edades, ubicaciones, estados | PostgreSQL (Supabase) | Configurado, no verificado |
| Fotografías | Supabase Storage (bucket `fotos-personas`) | Configurado, sin interfaz de carga |
| Datos de demostración | localStorage del navegador | Probado localmente |
| Sesión de administrador | Supabase Auth (cookies/localStorage) | Configurado, no verificado |
| Configuración | Archivo `static/js/config.js` (ignorado por Git) | No verificado |

### ¿Qué información es pública?

Actualmente **toda la tabla `personas` es de lectura pública** (política RLS: `USING (true)`). Esto incluye:

- Nombre, cédula, edad y ubicación (apropiadamente públicos para búsqueda)
- **Teléfono de contacto** (debería ser privado)
- **Nombre y cédula de quien reportó la localización** (debería ser privado)
- **Observaciones** que pueden contener datos médicos o personales (deberían ser privadas)
- **Indicador de menor de edad** (requiere protección especial)

---

## Calidad y confiabilidad de la información

Centralizar información no garantiza que cada dato sea correcto. La auditoría de este repositorio encontró múltiples problemas de calidad.

### Problemas identificados

| Problema | Impacto | Origen |
|----------|:-------:|--------|
| **Cédulas vacías en pantalla** | Usuario no puede verificar identidad | Columna CSV no mapeada o celda vacía |
| **Números de documento dentro del nombre** | Confusión sobre identidad | CSV fuente con campos concatenados |
| **Edades en campo de ubicación** | Información de localización inútil | Admin ingresó datos compuestos en formulario de estado |
| **Prefijos numéricos en ubicaciones** (ej: `22_LA GUAIRA`) | Búsqueda por ubicación devuelve ruido | Datos CSV sin limpiar |
| **Cédulas duplicadas por formato** (`V-12345678` vs `V-12.345.678`) | Misma persona con dos registros | El formulario normaliza la cédula; el CSV no |
| **Estadísticas inconsistentes** (total ≠ desaparecidos + encontrados) | Desconfianza en los números | Posible mezcla entre sandbox y Supabase, o versiones de código diferentes |
| **Upsert destructivo en CSV** | Personas "Encontrado" revierten a "Desaparecido" | El importador fuerza `estado:'Desaparecido'` en todos los registros |

### Lo que falta

- [ ] Normalización de cédulas en todas las vías de ingreso
- [ ] Validación de contenido en campos (ej: una ubicación no debería contener edades)
- [ ] Trazabilidad de origen (¿de dónde vino cada registro?)
- [ ] Reporte de filas rechazadas en importación CSV
- [ ] Prevención de sobrescritura de estados verificados
- [ ] Métricas de completitud, validez y unicidad
- [ ] Revisión manual de registros dudosos

---

## Seguridad y privacidad

### Riesgos identificados (ordenados por severidad)

| ID | Hallazgo | Severidad | Descripción |
|----|----------|:---------:|-------------|
| **SEC-01** | Exposición pública de datos sensibles | **P0** | RLS permite SELECT público (`USING (true)`) sobre todas las columnas. Teléfonos, observaciones y datos de quien reportó son visibles para cualquier persona. |
| **SEC-02** | `verifyAdmin()` no verifica rol | **P0** | La Edge Function solo verifica que el usuario esté autenticado, no que tenga rol de administrador. Cualquier usuario registrado en Supabase Auth puede modificar o eliminar registros. |
| **SEC-03** | RLS UPDATE/DELETE para cualquier authenticated | **P0** | Las políticas de actualización y eliminación permiten la operación a cualquier usuario autenticado. |
| **SEC-04** | Sin auditoría de cambios | **P1** | No existe historial de quién modificó qué ni cuándo. Los datos anteriores se pierden al actualizar. |
| **SEC-05** | Sin moderación de reportes | **P1** | Cualquier persona puede insertar reportes sin revisión previa. |
| **SEC-06** | Sin rate limiting | **P2** | No hay límite de velocidad en la API. |
| **SEC-07** | Sin CAPTCHA | **P2** | No hay verificación humana en formularios públicos. |
| **SEC-08** | Bucket de fotos público | **P2** | El bucket `fotos-personas` permite subida pública sin restricción de tipo. |
| **SEC-09** | Sin soft delete | **P2** | La eliminación es física y permanente. |
| **SEC-10** | Error leakage en API | **P2** | Los mensajes de error devuelven información interna de la base de datos. |
| **SEC-11** | CDN sin SRI | **P2** | Los scripts de Supabase JS y PapaParse se cargan sin `integrity`. |

### Sobre la clave de Supabase

| Clave | Dónde está | Clasificación |
|-------|-----------|:------------:|
| `SUPABASE_URL` | `config.js` (template en `config.example.js`) | **Pública** — es la URL del proyecto |
| `SUPABASE_ANON_KEY` | `config.js` (template en `config.example.js`) | **Publicable** — diseñada para uso en cliente bajo RLS |
| `service_role` | No encontrada en el repositorio | **Secreta** — nunca debe llegar al navegador |

> **Correcto**: `config.js` está en `.gitignore`. La anon key es publicable por diseño de Supabase (el acceso real lo controla RLS). La service_role es el verdadero secreto y felizmente no aparece en el código.

### Sobre el cifrado

- **En tránsito**: HTTPS configurado en nginx.conf (aunque el contenedor Docker tiene un error que impide iniciar con TLS).
- **En reposo**: Supabase ofrece cifrado administrado por el proveedor. No se requiere ni se encontró código adicional de cifrado en la aplicación.
- **A nivel de aplicación**: No se encontró cifrado adicional de campos.

### Sobre backups

No se encontraron scripts de backup en el repositorio. Sin embargo, Supabase ofrece Point-in-Time Recovery como servicio administrado. **No se pudo verificar** si esta funcionalidad está habilitada en el proyecto activo.

---

## Arquitectura técnica del proyecto

> Para detalle técnico profundo, ver [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

### Vista general

La aplicación es una **SPA (Single Page Application)** construida con HTML, CSS y JavaScript vanilla, sin framework ni proceso de build. Toda la interacción con el usuario ocurre en el navegador. Para consultar y modificar información, el frontend puede utilizar una **Edge Function de Supabase** (Deno + TypeScript) como camino preferido, o acceder **directamente a Supabase** mediante el cliente JS como ruta alternativa cuando la Edge Function no responde. Además, dispone de un **modo sandbox** basado en `localStorage` que permite probar la aplicación completa sin backend.

Los archivos estáticos se sirven mediante **Nginx** dentro de un contenedor **Docker**. La base de datos, autenticación, almacenamiento de archivos y Edge Function son provistos por **Supabase** como plataforma managed.

### Diagrama de arquitectura actual

El siguiente diagrama muestra los componentes reales del sistema y cómo se conectan. Los componentes verificados en código se muestran con borde sólido; los configurados pero no verificados en producción, con borde discontinuo.

```mermaid
flowchart TD
    U[Usuario público] --> WEB
    A[Administrador] --> ADMIN["/admin<br/>redirección"]
    ADMIN --> WEB

    subgraph NAVEGADOR["Navegador — Frontend"]
        WEB["index.html + app.js<br/>SPA vanilla JS"]
        CONFIG["config.js<br/>SUPABASE_URL + ANON_KEY"]
        DEMO["localStorage<br/>modo sandbox"]
    end

    subgraph SUPABASE["Supabase — Backend"]
        EF["Edge Function /api<br/>Deno + TypeScript"]
        DB[("PostgreSQL<br/>public.personas")]
        AUTH["Supabase Auth<br/>email + contraseña"]
        ST["Storage<br/>bucket fotos-personas"]
    end

    subgraph DOCKER["Docker — Servidor"]
        NGINX["Nginx Alpine<br/>sirve archivos estáticos"]
    end

    WEB -->|Camino preferido| EF
    WEB -->|Fallback si EF no responde| DB
    WEB -.->|Sin config.js| DEMO
    CONFIG --> WEB
    EF --> DB
    EF --> AUTH
    WEB --> AUTH
    NGINX --> WEB

    style DEMO stroke-dasharray: 5 5
    style EF stroke-dasharray: 5 5
    style DB stroke-dasharray: 5 5
    style AUTH stroke-dasharray: 5 5
    style ST stroke-dasharray: 5 5
    style NGINX stroke-dasharray: 5 5
```

**Conclusiones principales**:
- El navegador es el entorno principal: toda la lógica de UI, validación de formularios y renderizado ocurre en `app.js`.
- Hay **tres caminos de ejecución** que deben mantenerse sincronizados: Edge Function, acceso directo a Supabase, y sandbox.
- Los componentes de Supabase están **configurados en código** pero su despliegue real **no pudo verificarse**.
- Docker/Nginx están configurados pero tienen un **error que impide iniciar** con la configuración actual.

### Componentes y responsabilidades

| Componente | Tecnología o archivo | Responsabilidad | Lugar de ejecución | Estado |
|-----------|----------------------|-----------------|-------------------|:------:|
| Página principal | `index.html` | Estructura HTML de la SPA: búsqueda, filtros, tarjetas, modales | Navegador | Verificado en código |
| Redirección admin | `admin/index.html` | Setea flag en `sessionStorage` y redirige a `/` para activar login | Navegador | Verificado en código |
| Lógica frontend | `static/js/app.js` | Búsqueda, filtros, render, modales, admin, CSV, sandbox | Navegador | Verificado en código |
| Configuración | `static/js/config.example.js` | Template con `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `WHATSAPP_PHONE` | Navegador | Verificado en código |
| Estilos | `static/css/style.css` | Diseño visual, responsive, glassmorphism | Navegador | Verificado en código |
| Cliente Supabase | CDN `@supabase/supabase-js@2` | Cliente JS para Auth y acceso directo a PostgreSQL | Navegador | Verificado en código |
| Edge Function | `supabase/functions/api/index.ts` | API REST: stats, búsqueda, registro, estado, eliminación, CSV | Supabase (Deno) | Configurado, no verificado |
| Base de datos | `schema.sql` → PostgreSQL | Tabla `personas`, RLS, índices, bucket storage | Supabase | Configurado, no verificado |
| Autenticación | Supabase Auth | Login de administradores con email + contraseña | Supabase | Configurado, no verificado |
| Storage | Supabase Storage | Bucket `fotos-personas` para fotografías | Supabase | Configurado, sin interfaz |
| CSV parser | CDN `PapaParse 5.4.1` | Lectura de archivos CSV en el navegador | Navegador | Verificado en código |
| Sandbox | `localStorage` del navegador | Datos demo, admin demo, pruebas sin backend | Navegador | Probado localmente |
| Servidor web | Nginx Alpine en Docker | Sirve archivos estáticos, proxy, SSL | Contenedor Docker | Configurado, no funcional |

### Mapa de código

| Ruta | Responsabilidad | Cuándo modificarla | Dependencias |
|------|----------------|-------------------|--------------|
| `index.html` | Estructura HTML de la SPA | Cambios de UI, nuevos elementos, modales | `app.js`, `style.css` |
| `admin/index.html` | Redirección para login admin | Cambios en flujo de acceso admin | `app.js` (lee `sessionStorage`) |
| `static/js/app.js` | Toda la lógica del frontend | Cambios de comportamiento, búsqueda, admin, CSV | `config.js`, Supabase JS, PapaParse |
| `static/js/config.example.js` | Template de configuración | Cambiar variables de configuración soportadas | Ninguna |
| `static/css/style.css` | Estilos visuales | Cambios de diseño, responsive, dark mode | `index.html` |
| `schema.sql` | Esquema de base de datos | Cambios de tabla, RLS, índices, bucket | Edge Function, `app.js` (fallback) |
| `supabase/functions/api/index.ts` | API REST (Edge Function) | Cambios de endpoints, validaciones, autorización | `schema.sql`, `app.js` |
| `Dockerfile` | Imagen Docker con Nginx | Cambios de empaquetado | `nginx.conf`, `index.html`, `static/` |
| `docker-compose.yml` | Orquestación del contenedor | Cambios de puertos, volúmenes, servicios | `Dockerfile` |
| `nginx.conf` | Configuración de Nginx | Cambios de SSL, proxy, headers | `Dockerfile` |
| `README.md` | Este documento | Actualizar estado, arquitectura, guía | Todos los docs |
| `docs/` | Documentación especializada | Actualizar tras cambios arquitectónicos | `README.md` |

### Modos de operación

El sistema tiene **tres modos de operación** que coexisten en el mismo archivo `app.js`. Esto significa que cualquier cambio de lógica debe reflejarse en los tres caminos.

#### Modo con Edge Function (preferido)

- **URL**: `${SUPABASE_URL}/functions/v1/api/...`
- **Autenticación admin**: header `Authorization: Bearer <token>` con JWT de Supabase Auth
- **Validaciones**: la Edge Function valida nombre y cédula obligatorios, verifica duplicado por cédula, fuerza `estado: 'Desaparecido'` en registros nuevos
- **Endpoints**: `GET /stats`, `GET /personas`, `POST /personas`, `PUT /personas/:id/status`, `DELETE /personas/:id`, `POST /import-csv`
- **Errores**: si la Edge Function no responde, el frontend cae automáticamente al acceso directo

#### Acceso directo a Supabase (fallback)

- **Cuándo se usa**: cuando la Edge Function no responde o no está desplegada
- **Mecanismo**: `supabaseClient.from('personas').select('*')` directamente desde el navegador
- **Autenticación**: usa `SUPABASE_ANON_KEY` en header `apikey`
- **Control de acceso**: depende **exclusivamente** de las políticas RLS de PostgreSQL
- **Lógica duplicada**: las validaciones que hace la Edge Function (duplicado por cédula, campos obligatorios) se replican en el frontend
- **Riesgo**: el fallback **evita las validaciones del servidor** y depende solo de RLS, que actualmente permite SELECT e INSERT públicos

#### Modo sandbox (demo)

- **Cuándo se activa**: si no existe `config.js` o si `SUPABASE_URL` contiene el valor placeholder
- **Almacenamiento**: `localStorage` con clave `personas_demo` (5 registros ficticios)
- **Admin demo**: `admin@example.com` / `change-me` (hardcodeado en `app.js`)
- **Sesión**: `sessionStorage` con clave `admin_session_demo`
- **Útil para**: desarrollo local, onboarding, pruebas visuales
- **No suficiente para**: probar RLS, Auth real, Edge Function, Storage, ni comportamiento con datos reales

| Modo | Backend | Almacenamiento | Autenticación | Uso recomendado | Limitación |
|------|---------|---------------|--------------|-----------------|------------|
| Edge Function | Supabase Deno | PostgreSQL | JWT + verifyAdmin | Producción | No verificado desplegado |
| Acceso directo | Supabase JS | PostgreSQL | Anon key + RLS | Fallback de emergencia | Sin validación de servidor |
| Sandbox | Ninguno | localStorage | Credenciales hardcodeadas | Desarrollo y demo | No prueba backend real |

> [!WARNING]
> Un cambio en la API puede requerir actualizar también el camino de acceso directo y el sandbox mientras esos tres modos continúen coexistiendo.

### Flujo técnico de una consulta de búsqueda

Cuando un usuario escribe un nombre o cédula y presiona Enter, el frontend construye una consulta con filtros y paginación. El siguiente diagrama muestra los tres caminos posibles:

```mermaid
sequenceDiagram
    participant U as Usuario
    participant W as app.js
    participant EF as Edge Function
    participant DB as PostgreSQL
    participant LS as localStorage

    U->>W: Escribe búsqueda + filtros
    W->>W: Debounce 300ms
    W->>W: Muestra skeletons

    alt Edge Function disponible
        W->>EF: GET /personas?q=...&category=...&estado=...&edad=...&page=...&limit=...
        EF->>DB: SELECT con ILIKE, filtros, paginación
        DB-->>EF: Resultados
        EF-->>W: JSON con personas
    else Fallback directo
        W->>DB: supabase.from('personas').select('*').ilike(...)
        DB-->>W: Resultados
    else Modo sandbox
        W->>LS: Filtra localStorage
        LS-->>W: Resultados demo
    end

    W->>W: Renderiza tarjetas
    W-->>U: Muestra resultados o "No encontrado"
```

**Parámetros de búsqueda**: `q` (texto), `category` (todo/cédula/nombre/apellido), `status` (Desaparecido/Encontrado), `edad` (rango), `orden` (recientes/nombre/edad), `tipoUbicacion` (hospital/refugio), `ubicacion` (texto), `page` y `limit` (paginación).

**Diferencia entre caminos**: la Edge Function construye la consulta SQL en el servidor; el fallback construye la consulta con el cliente Supabase JS en el navegador. El sandbox filtra un array en memoria. Los resultados pueden diferir si la lógica de filtros no está perfectamente sincronizada.

### Flujo técnico de escritura y administración

El siguiente diagrama muestra cómo se crean, actualizan y eliminan registros, incluyendo la importación CSV:

```mermaid
sequenceDiagram
    participant U as Usuario/Admin
    participant W as app.js
    participant EF as Edge Function
    participant DB as PostgreSQL

    Note over W: Registro público
    U->>W: Completa formulario
    W->>W: Valida nombre + cédula
    W->>W: Verifica duplicado por cédula
    W->>EF: POST /personas
    EF->>DB: INSERT estado='Desaparecido'
    EF-->>W: 201 Created
    W-->>U: Confirmación

    Note over W: Cambio de estado (admin)
    U->>W: Selecciona "Encontrado"
    W->>EF: PUT /personas/:id/status
    EF->>EF: verifyAdmin (JWT)
    EF->>DB: UPDATE estado + ubicacion
    EF-->>W: 200 OK

    Note over W: Eliminación (admin)
    U->>W: Confirma eliminación
    W->>EF: DELETE /personas/:id
    EF->>EF: verifyAdmin (JWT)
    EF->>DB: DELETE fila
    EF-->>W: 200 OK

    Note over W: Importación CSV (admin)
    U->>W: Selecciona archivo CSV
    W->>W: PapaParse lee + mapea columnas
    W->>W: Fuerza estado='Desaparecido'
    W->>EF: POST /import-csv
    EF->>EF: verifyAdmin (JWT)
    EF->>DB: UPSERT por cédula
    EF-->>W: Resumen insertados/actualizados
```

> [!CAUTION]
> La importación CSV **siempre fuerza `estado: 'Desaparecido'`** en todos los registros. Si una persona ya estaba marcada como "Encontrado", una reimportación la revierte. Ver [Calidad de datos](#calidad-y-confiabilidad-de-la-información).

### Autenticación y autorización

| Concepto | Significado | Estado actual |
|----------|-------------|:------------:|
| **Autenticación** | Verificar quién es el usuario | Supabase Auth (email + contraseña) |
| **Autorización** | Verificar qué puede hacer | `verifyAdmin()` — solo verifica autenticación, **no rol** |
| **RLS** | Row Level Security de PostgreSQL | SELECT público, INSERT público, UPDATE/DELETE para authenticated |
| **Sesión** | Token JWT persistido | Supabase Auth guarda sesión en `localStorage` del navegador |
| **Rol** | Nivel de permiso (admin, moderador, visor) | **No implementado** — cualquier authenticated es admin efectivo |

**Flujo de login**:
1. El administrador visita `/admin`
2. `admin/index.html` setea `sessionStorage.triggerAdminLogin = 'true'` y redirige a `/`
3. `app.js` detecta el flag, abre el modal de login
4. El usuario ingresa email + contraseña
5. `supabaseClient.auth.signInWithPassword()` valida contra Supabase Auth
6. Supabase devuelve un JWT que se persiste en `localStorage`
7. `onAuthStateChange` activa el panel admin

**Brecha crítica**: `verifyAdmin()` en la Edge Function (`api/index.ts:32-42`) solo llama `supabase.auth.getUser(token)` — verifica que el token sea válido, pero **no verifica que el usuario tenga rol de administrador**. Combinado con RLS que permite UPDATE/DELETE a cualquier `authenticated`, cualquier usuario registrado en Supabase Auth puede modificar o eliminar registros.

### Arquitectura de datos

El modelo actual tiene una **sola tabla** sin relaciones:

```mermaid
erDiagram
    personas {
        bigint id PK "GENERATED ALWAYS AS IDENTITY"
        text nombre "NOT NULL"
        text cedula "NOT NULL — UNIQUE"
        integer edad
        text ultima_ubicacion
        text telefono_contacto "Sensible — expuesto públicamente"
        text observaciones "Sensible — expuesto públicamente"
        text estado "NOT NULL — CHECK Desaparecido/Encontrado"
        text ubicacion_encontrado
        text encontrado_por "Sensible — expuesto públicamente"
        text encontrado_por_cedula "Sensible — expuesto públicamente"
        boolean es_menor "NOT NULL — DEFAULT false"
        text foto_url
        timestamptz fecha_registro "DEFAULT now()"
        timestamptz fecha_actualizacion "DEFAULT now()"
    }
```

**Clave única**: `cedula` tiene restricción UNIQUE — previene duplicados exactos. Sin embargo, el formulario normaliza la cédula (sin puntos, con prefijo V-/E-) mientras que el CSV no la normaliza, lo que permite duplicados por formato (`V-12345678` vs `V-12.345.678`).

**Índices**: 7 índices incluyendo B-tree (estado+fecha, edad, nombre) y GIN trigram (nombre, cédula, ubicaciones) para búsqueda por substring.

**Estados**: solo dos valores permitidos por CHECK constraint: `Desaparecido` y `Encontrado`.

**Bucket de fotos**: `fotos-personas` configurado como público en `schema.sql`. Sin interfaz de carga en el frontend.

**Importación CSV**: usa `upsert` con `onConflict: 'cedula'` — actualiza si existe, inserta si no. El cliente siempre envía `estado: 'Desaparecido'`, lo que sobrescribe registros existentes.

> Para detalle de calidad de datos, ver [Calidad y confiabilidad de la información](#calidad-y-confiabilidad-de-la-información) y [docs/DATA_SOURCES_STORAGE_AND_HOSTING.md](./docs/DATA_SOURCES_STORAGE_AND_HOSTING.md).

### Fronteras de seguridad actuales

| Frontera | Control actual | Brecha | Recomendación |
|----------|---------------|--------|---------------|
| Navegador | Entorno no confiable | El frontend expone `SUPABASE_ANON_KEY` (publicable por diseño) | Normal — la clave es publicable bajo RLS |
| RLS (PostgreSQL) | SELECT público, INSERT público, UPDATE/DELETE authenticated | **No separa columnas públicas de privadas** — toda la fila es visible | Crear vista pública sin columnas sensibles |
| Edge Function | `verifyAdmin()` verifica JWT | **No verifica rol** — cualquier authenticated es admin | Implementar verificación de rol real |
| Supabase Auth | email + contraseña | Sin roles diferenciados | Agregar `app_metadata.role` o tabla de roles |
| CORS | `Access-Control-Allow-Origin: *` | Permite cualquier origen | Restringir a dominios conocidos (defensa complementaria) |
| Storage | Bucket público con INSERT público | Cualquiera puede subir archivos | Restringir a autenticados + validar tipo MIME |
| Frontend | `escapeHTML()` en render | `onclick` inline con datos de usuario — posible XSS | Usar `addEventListener` + `dataset` |

> CORS solo limita navegadores — no detiene scripts, curl ni llamadas directas a la API REST de Supabase. La protección real de datos depende de RLS. Ver [docs/AUDIT_CURRENT_STATE.md](./docs/AUDIT_CURRENT_STATE.md).

### Arquitectura de despliegue

```mermaid
flowchart LR
    subgraph BUILD["Construcción"]
        GIT["GitHub<br/>repositorio"]
        DOCKER["Docker build<br/>nginx:alpine"]
    end

    subgraph SERVE["Servidor"]
        NGINX["Nginx<br/>puerto 80"]
        FILES["index.html<br/>static/<br/>schema.sql"]
    end

    subgraph SUPA["Supabase (externo)"]
        AUTH["Auth"]
        EF["Edge Function"]
        DB["PostgreSQL"]
        ST["Storage"]
    end

    subgraph CLIENTE["Navegador"]
        APP["app.js<br/>+ Supabase JS"]
    end

    GIT --> DOCKER --> NGINX
    NGINX --> FILES --> APP
    APP -->|HTTPS| EF
    APP -->|HTTPS| AUTH
    APP -->|HTTPS| DB
    EF --> DB
    AUTH --> DB

    style NGINX stroke-dasharray: 5 5
    style EF stroke-dasharray: 5 5
    style DB stroke-dasharray: 5 5
    style AUTH stroke-dasharray: 5 5
    style ST stroke-dasharray: 5 5
```

**Construcción de la imagen Docker**:
- `Dockerfile` copia `index.html`, `static/`, `schema.sql` y `nginx.conf` a la imagen Nginx Alpine
- **No copia** `admin/index.html` — la ruta `/admin` no funciona dentro del contenedor
- `schema.sql` se copia al document root — queda **expuesto públicamente**
- `docker-compose.yml` solo mapea puerto `80:80` (no 443)

**Nginx**:
- Configurado para HTTPS con certificados Let's Encrypt en `/etc/letsencrypt/...`
- Sin embargo, `docker-compose.yml` no monta volúmenes para certificados ni expone 443
- El redirect `return 301 https://...` hace que nginx **no pueda iniciar** sin certificados

**Edge Function**: se despliega por separado con `supabase functions deploy api`. No forma parte de la imagen Docker.

**Variables necesarias**: `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `static/js/config.js` (creado manualmente, ignorado por Git).

### Stack técnico

| Capa | Tecnología | Función | Estado |
|------|-----------|---------|:------:|
| Interfaz | HTML5 + CSS3 | Estructura y estilo | Verificado en código |
| Lógica frontend | JavaScript vanilla (sin framework) | Interacción, búsqueda, admin, CSV | Verificado en código |
| Cliente Supabase | `@supabase/supabase-js@2` (CDN) | Auth y acceso directo a PostgreSQL | Verificado en código |
| CSV parser | PapaParse 5.4.1 (CDN) | Lectura de CSV en navegador | Verificado en código |
| API | Supabase Edge Functions (Deno + TypeScript) | Endpoints REST para CRUD | Configurado, no verificado |
| Base de datos | PostgreSQL (Supabase) | Tabla `personas`, RLS, índices | Configurado, no verificado |
| Autenticación | Supabase Auth | Login admin con email + contraseña | Configurado, no verificado |
| Almacenamiento | Supabase Storage | Bucket `fotos-personas` | Configurado, sin interfaz |
| Servidor web | Nginx Alpine | Servir archivos estáticos | Configurado, no funcional |
| Contenedores | Docker + docker-compose | Empaquetar y desplegar | Configurado, no funcional |
| CI/CD | — | — | No encontrado |
| Tests | — | — | No encontrado |

### Dependencias externas

| Dependencia | Forma de carga | Versión | Uso | Riesgo |
|------------|---------------|---------|-----|--------|
| Supabase JS | CDN jsdelivr | `@2` (sin patch) | Cliente Auth + PostgreSQL | Sin SRI — si el CDN se compromete, se inyecta JS arbitrario |
| PapaParse | CDN cloudflare | `5.4.1` | Parseo de CSV en navegador | Sin SRI — mismo riesgo |
| Google Fonts | CDN | Sin versión fija | Tipografía | Dependencia de disponibilidad |

> [!IMPORTANT]
> Ningún script CDN tiene atributo `integrity` (SRI). Si un CDN se compromete, un atacante podría inyectar JavaScript arbitrario en la aplicación.

### Decisiones arquitectónicas y deuda técnica

#### Decisiones encontradas o inferidas

| Decisión | Evidencia | Estado | Consecuencia |
|----------|-----------|:------:|-------------|
| SPA vanilla sin framework | Sin `package.json`, sin build | Inferida | Carga rápida, pero `app.js` monolítico de 1791 líneas |
| Failover API → Supabase directo | `app.js` try/catch con fallback | Inferida | Resiliencia, pero lógica duplicada en dos lenguajes |
| localStorage como sandbox | `setupSandboxMode()` en `app.js` | Inferida | Demo sin backend, pero tres caminos que mantener |
| Cédula como clave única | `UNIQUE` en `schema.sql` | Inferida | Previene duplicados exactos, pero no por formato |
| Sin tabla de auditoría | No existe en `schema.sql` | Inferida | No se puede rastrear quién cambió qué |

> Estas decisiones fueron **inferidas** por el auditor a partir del código. No son ADRs formalmente aceptados por el equipo.

#### Deuda técnica relevante

| Tema | Impacto | Riesgo | Detalle en |
|------|:-------:|-------|:----------:|
| Lógica duplicada API + fallback | Medio | Divergencia entre caminos | [ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| `app.js` monolítico (1791 líneas) | Medio | Difícil mantenimiento y testing | [ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Sin tests automatizados | Alto | Regresiones no detectadas | [AUDIT_CURRENT_STATE.md](./docs/AUDIT_CURRENT_STATE.md) |
| Sin roles administrativos | Crítico | Cualquier authenticated es admin | [AUDIT_CURRENT_STATE.md](./docs/AUDIT_CURRENT_STATE.md) |
| Sin separación de datos públicos/privados | Crítico | Datos sensibles expuestos | [AUDIT_CURRENT_STATE.md](./docs/AUDIT_CURRENT_STATE.md) |
| Nginx no funcional con Docker | Alto | No se puede desplegar vía Docker | [AUDIT_CURRENT_STATE.md](./docs/AUDIT_CURRENT_STATE.md) |
| Importación CSV destructiva | Alto | Reimportación revierte encontrados | [DATA_SOURCES_STORAGE_AND_HOSTING.md](./docs/DATA_SOURCES_STORAGE_AND_HOSTING.md) |

### Arquitectura actual frente a objetivo

| Área | Arquitectura actual | Arquitectura objetivo | Brecha |
|------|---------------------|----------------------|:------:|
| Frontend | SPA vanilla JS monolítico | SPA modular con separación de responsabilidades | Media |
| API | Edge Function + fallback directo a Supabase | Edge Function como única frontera | Alta |
| Datos | Tabla única con SELECT público total | Vista pública + tabla base con acceso restringido | Alta |
| Autenticación | Supabase Auth (email + contraseña) | Supabase Auth + roles (admin, moderador, visor) | Alta |
| Autorización | verifyAdmin() sin verificación de rol | Verificación de rol real en cada endpoint | Crítica |
| Storage | Bucket público sin restricciones | Bucket restringido con validación de tipo y tamaño | Media |
| Auditoría | Sin historial de cambios | Tabla de auditoría con trigger automático | Alta |
| Moderación | Sin moderación — publicación inmediata | Cola de moderación con aprobación admin | Alta |
| Infraestructura | Docker con error HTTPS, sin CI/CD | Docker funcional + CI/CD + staging | Alta |
| Testing | Sin pruebas automatizadas | Tests unitarios + integración mínimos | Alta |
| Observabilidad | Sin monitoreo ni logs | Health checks + logging + alertas | Alta |
| Backups | No documentado | Política de backup documentada y verificada | Media |

> Para el plan detallado de transición, ver [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) y [docs/RECOMMENDED_BACKLOG.md](./docs/RECOMMENDED_BACKLOG.md).

### Cómo modificar el sistema de forma segura

> [!WARNING]
> Un cambio en la API puede requerir actualizar también el camino de acceso directo y el sandbox mientras esos tres modos continúen coexistiendo.

**Cambios de frontend**: revisar juntos `index.html`, `static/css/style.css` y `static/js/app.js`. Los selectores del JS referencian IDs y clases del HTML.

**Cambios de API**: revisar `supabase/functions/api/index.ts` y `static/js/app.js` (sección de fallback). La lógica de validación debe mantenerse sincronizada entre ambos.

**Cambios de datos**: revisar `schema.sql` (tabla, RLS, índices), la Edge Function (consultas SQL) y `app.js` (fallback directo e importador CSV).

**Cambios de despliegue**: revisar `Dockerfile` (archivos copiados), `docker-compose.yml` (puertos, volúmenes) y `nginx.conf` (SSL, proxy, headers).

---

## Estado técnico verificable

### Componentes del sistema

| Componente | Código | Despliegue | Estado |
|-----------|:------:|:----------:|:------:|
| Frontend (HTML, CSS, JS) | ✅ | ✅ (con version drift) | **Funcional** |
| Base de datos (schema.sql) | ✅ | ❓ | **Configurado** |
| Edge Function (API) | ✅ | ❓ | **Configurado** |
| Supabase Auth | ✅ | ❓ | **Configurado** |
| Supabase Storage | ✅ | ❓ | **Configurado** |
| Docker / Nginx | ✅ | ❌ (error TLS) | **No funcional** |
| Dominio / SSL | ✅ (config) | ❓ | **No verificado** |
| CI/CD | ❌ | ❌ | **Inexistente** |
| Tests automatizados | ❌ | ❌ | **Inexistente** |
| Backups | ❌ (sin scripts) | ❓ (puede estar en Supabase) | **No verificado** |
| Monitoreo | ❌ | ❌ | **Inexistente** |

> ✅ = Verificado en código &nbsp; ❌ = No encontrado &nbsp; ❓ = No verificable sin acceso

### Bugs conocidos

| ID | Bug | Severidad | Impacto |
|----|-----|:---------:|---------|
| **BUG-01** | `id="admin-panel"` duplicado en `index.html:43` y `index.html:141` | **P0** | El panel de administración nunca se muestra tras login. Bloquea importación CSV y acciones admin. |
| **BUG-02** | HTTPS redirect rompe el contenedor Docker | **P0** | nginx.conf redirige HTTP→HTTPS pero no hay certificados. El contenedor probablemente no inicia. |
| **BUG-03** | CSV import fuerza `estado:'Desaparecido'` y sobrescribe encontrados | **P1** | Una reimportación revierte personas localizadas a desaparecidas. |
| **BUG-04** | Mapeo de columnas CSV por substring matching | **P1** | `'ci'` matchea dentro de `'ubicaCIón'` y `'observaCIones'`. Campos intercambiados. |
| **BUG-05** | Sin botón "Reportar Desaparecido" visible sin buscar primero | **P1** | Un ciudadano que quiere reportar debe saber que tiene que buscar antes. |
| **BUG-06** | `schema.sql` expuesto públicamente en la imagen Docker | **P1** | Cualquier persona puede leer la estructura completa de la base de datos. |

---

## Ejecución local

### Modo sandbox (sin backend, sin instalar nada)

Abrí `index.html` en tu navegador. La app detecta que no hay configuración de Supabase y entra en modo demo con datos ficticios.

### Modo con Supabase (requiere proyecto Supabase)

```bash
git clone https://github.com/Open-Vzla-SOS/aquiestoyvenezuela-web.git
cd aquiestoyvenezuela-web
cp static/js/config.example.js static/js/config.js
# Editar config.js con SUPABASE_URL y SUPABASE_ANON_KEY de tu proyecto
# Ejecutar schema.sql en el SQL Editor de Supabase
# Abrir index.html en el navegador
```

### Con Docker

```bash
docker compose up --build -d
```

> ⚠️ El contenedor Docker tiene un error que impide iniciar con HTTPS. Para desarrollo local, editar `nginx.conf` eliminando el bloque `listen 443 ssl` y el `return 301 https://`.

---

## Despliegue

### Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5, CSS3, JavaScript vanilla |
| API | Supabase Edge Functions (Deno + TypeScript) |
| Base de datos | PostgreSQL (Supabase) |
| Autenticación | Supabase Auth (email + contraseña) |
| Almacenamiento | Supabase Storage |
| Servidor web | Nginx (Alpine) en Docker |
| CSV | PapaParse 5.4.1 (CDN) |

### Lo que NO está configurado

- **Sin CI/CD**: no hay GitHub Actions ni automatización de despliegue.
- **Sin tests**: no se encontraron pruebas automatizadas de ningún tipo.
- **Sin monitoreo**: no hay health checks, logging estructurado ni alertas.
- **Sin backups documentados**: no hay scripts ni documentación de respaldo.

---

## Pull requests y trabajo pendiente

### PRs abiertos (al 2026-06-29)

| PR | Título | Autor | Estado | Archivos | Notas |
|----|--------|:-----:|:------:|:--------:|-------|
| #13 | Optimización UI/UX con BEM, Modo Oscuro | rebecadev10 | Abierto | 3 | +908/-1203, 1 commit masivo, refactor de nomenclatura |
| #12 | ui: nav, vista lista/grid y paginación | JoseJEspinoza | Abierto | 4 | +834/-140, 3 commits, fork externo |

> **Ambos PRs están en conflicto** (modifican los mismos archivos). Ver [docs/PULL_REQUEST_REVIEW.md](./docs/PULL_REQUEST_REVIEW.md) para análisis detallado y recomendación de integración.

### Issues

| Issue | Estado | Descripción |
|-------|:------:|-------------|
| #11 | Abierto | "make responsive all app" |

---

## Arquitectura objetivo

Propuesta de mejoras incrementales sobre la arquitectura actual:

```mermaid
flowchart TD
    subgraph "Usuarios"
        U[Usuario público]
        A[Administrador]
    end

    subgraph "Frontend"
        WEB[SPA - HTML/CSS/JS]
    end

    subgraph "API Layer (propuesto)"
        API[Edge Function]
        RL[Rate Limiting]
        CAP[CAPTCHA]
    end

    subgraph "Supabase"
        DB[(PostgreSQL / con vista pública)]
        AUTH[Auth + Roles]
        ST[Storage - Restringido]
    end

    subgraph "Moderación y Auditoría (propuesto)"
        MOD[Cola de moderación]
        HIST[Historial de cambios]
    end

    U --> WEB
    A --> WEB

    WEB --> CAP --> RL --> API
    WEB --> AUTH

    API --> MOD --> DB
    API --> HIST --> DB

    DB -->|Vista pública sin datos sensibles| WEB
    DB -->|Datos completos solo admin| A


    ST --> AUTH

    style API fill:#90EE90,stroke:#333
    style MOD fill:#90EE90,stroke:#333
    style HIST fill:#90EE90,stroke:#333
    style CAP fill:#90EE90,stroke:#333
    style RL fill:#90EE90,stroke:#333
```

> ▬▬ Componentes actuales &nbsp; 🟢 Componentes propuestos

---

## Documentación especializada

| Documento | Audiencia | Pregunta que responde |
|-----------|:---------:|----------------------|
| [README.md](./README.md) | Todos | ¿Qué es y cuál es su estado? |
| [HOW_THE_PROJECT_WORKS.md](./docs/HOW_THE_PROJECT_WORKS.md) | No técnicos | ¿Cómo funciona paso a paso? |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Técnicos | ¿Cómo está construido? |
| [DATA_SOURCES_STORAGE_AND_HOSTING.md](./docs/DATA_SOURCES_STORAGE_AND_HOSTING.md) | Datos/infraestructura | ¿De dónde vienen y dónde terminan los datos? |
| [AUDIT_CURRENT_STATE.md](./docs/AUDIT_CURRENT_STATE.md) | Líderes y auditores | ¿Qué riesgos y brechas existen? |
| [PULL_REQUEST_REVIEW.md](./docs/PULL_REQUEST_REVIEW.md) | Mantenedores | ¿Qué cambios están pendientes? |
| [RECOMMENDED_BACKLOG.md](./docs/RECOMMENDED_BACKLOG.md) | Equipo | ¿Qué debería hacerse y en qué orden? |
| [AUDIT_EXECUTION_LOG.md](./docs/AUDIT_EXECUTION_LOG.md) | Auditores | ¿Cómo se ejecutó la revisión? |

### ¿Por dónde comenzar?

- **Familiar o ciudadano**: Leé [Cómo funciona](#cómo-funciona-para-una-persona-no-técnica) y [HOW_THE_PROJECT_WORKS.md](./docs/HOW_THE_PROJECT_WORKS.md).
- **Voluntario**: Leé [Capacidades actuales](#capacidades-actuales) y [Origen de los datos](#origen-recorrido-y-destino-de-los-datos).
- **Coordinador no técnico**: Leé [Entender el proyecto](#entender-el-proyecto-en-cinco-minutos) y [Calidad de datos](#calidad-y-confiabilidad-de-la-información).
- **Frontend**: Leé [Mapa de código](#mapa-de-código), [Modos de operación](#modos-de-operación) y [Flujo de búsqueda](#flujo-técnico-de-una-consulta-de-búsqueda).
- **Backend**: Leé [Edge Function](#modos-de-operación), [Autenticación y autorización](#autenticación-y-autorización) y [ARCHITECTURE.md](./docs/ARCHITECTURE.md).
- **Datos**: Leé [Arquitectura de datos](#arquitectura-de-datos) y [DATA_SOURCES_STORAGE_AND_HOSTING.md](./docs/DATA_SOURCES_STORAGE_AND_HOSTING.md).
- **Seguridad**: Leé [Fronteras de seguridad](#fronteras-de-seguridad-actuales) y [AUDIT_CURRENT_STATE.md](./docs/AUDIT_CURRENT_STATE.md).
- **DevOps**: Leé [Arquitectura de despliegue](#arquitectura-de-despliegue) y [DATA_SOURCES_STORAGE_AND_HOSTING.md](./docs/DATA_SOURCES_STORAGE_AND_HOSTING.md).
- **QA**: Leé [Modos de operación](#modos-de-operación) y [AUDIT_EXECUTION_LOG.md](./docs/AUDIT_EXECUTION_LOG.md).
- **Arquitectura**: Leé [Decisiones y deuda técnica](#decisiones-arquitectónicas-y-deuda-técnica) y [ARCHITECTURE.md](./docs/ARCHITECTURE.md).
- **Product Manager o Project Manager**: Leé [Arquitectura actual frente a objetivo](#arquitectura-actual-frente-a-objetivo) y [RECOMMENDED_BACKLOG.md](./docs/RECOMMENDED_BACKLOG.md).
- **Administrador de sistema**: Leé [Despliegue](#despliegue) y [Arquitectura de despliegue](#arquitectura-de-despliegue).
- **Auditor de seguridad**: Leé [Seguridad](#seguridad-y-privacidad) y [AUDIT_CURRENT_STATE.md](./docs/AUDIT_CURRENT_STATE.md).
- **Colaborador de datos**: Leé [Calidad de datos](#calidad-y-confiabilidad-de-la-información).

---

## Contribuir

### Reportar problemas

Abrí un [issue](https://github.com/Open-Vzla-SOS/aquiestoyvenezuela-web/issues) describiendo el problema, pasos para reproducir y comportamiento esperado.

### Enviar cambios

1. Hacé fork del repositorio.
2. Creá una rama descriptiva.
3. Probá tus cambios en modo sandbox (si tocás frontend) o contra un proyecto Supabase de prueba.
4. Enviá un Pull Request.

### Buenas prácticas

- Mantené sincronía entre Edge Function y fallback directo a Supabase.
- No incluyas claves, tokens ni datos reales en commits.
- `config.js` está en `.gitignore` — usá `config.example.js` como template.

---

## Contacto

- **Repositorio**: [github.com/Open-Vzla-SOS/aquiestoyvenezuela-web](https://github.com/Open-Vzla-SOS/aquiestoyvenezuela-web)
- **Sitio web**: [aquiestoyvenezuela.com](https://aquiestoyvenezuela.com) (si está desplegado)

---

> 📋 **Última actualización de esta documentación**: 2026-06-29 — Reauditoría independiente, rama `docs/audit-and-current-architecture`.
> Esta documentación fue verificada contra el código del repositorio en el commit `8d7dfcb`. El despliegue en producción NO fue verificado y presenta diferencias de versión con el repositorio.

## Estados documentales usados

| Estado | Significado |
|---|---|
| Verificado en código | Confirmado en archivos del repositorio local. |
| Probado localmente | Ejecutado en esta revisión y observado localmente. |
| Observado | Visto en evidencia externa o herramienta, indicando fecha/fuente. |
| Configurado, no verificado | Existe configuración, pero no se probó el servicio real. |
| Documentado, no implementado | Aparece en documentación, no se encontró implementación. |
| Propuesto | Recomendación o arquitectura objetivo. |
| No encontrado | Se buscó evidencia y no apareció. |
| No verificable | Requiere acceso, ambiente o decisión fuera de esta revisión. |
