# Cómo funciona Aquí Estoy Venezuela

> Explicación funcional y no técnica del sistema.

## Audiencia

Ciudadanos, familiares, voluntarios, coordinación y personas no técnicas.

## Qué responde este documento

Cómo buscar, registrar, actualizar, importar y entender qué ve el público.

## Estado y fecha de revisión

- Fecha: 2026-06-29.
- Rama: `docs/audit-and-current-architecture`.
- Referencia local: `8d7dfcb442772099958efc8578db124a7b3a7bff`.
- Estado: revisión documental Codex; no confirma despliegue productivo ni sustituye validación humana.

> Guía para personas no técnicas — familiares, voluntarios, organizaciones humanitarias y cualquier persona que quiera entender el proyecto sin necesidad de saber de programación.

---


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

## Índice

- [¿Qué es esto?](#qué-es-esto)
- [¿Qué problema resuelve?](#qué-problema-resuelve)
- [Escenario 1: Buscar a una persona desaparecida](#escenario-1-buscar-a-una-persona-desaparecida)
- [Escenario 2: Reportar a alguien como desaparecido](#escenario-2-reportar-a-alguien-como-desaparecido)
- [Escenario 3: Compartir información por WhatsApp o redes sociales](#escenario-3-compartir-información-por-whatsapp-o-redes-sociales)
- [Escenario 4: Un administrador actualiza un reporte](#escenario-4-un-administrador-actualiza-un-reporte)
- [Escenario 5: Un administrador importa una lista desde un archivo](#escenario-5-un-administrador-importa-una-lista-desde-un-archivo)
- [¿Qué información se puede ver?](#qué-información-se-puede-ver)
- [¿Qué información debería ser privada?](#qué-información-debería-ser-privada)
- [¿Cómo se protege la información? (seguridad actual y deseada)](#cómo-se-protege-la-información-seguridad-actual-y-deseada)
- [¿Dónde se almacena la información?](#dónde-se-almacena-la-información)
- [¿Dónde está alojada la página?](#dónde-está-alojada-la-página)
- [¿Qué canales de entrada existen?](#qué-canales-de-entrada-existen)
- [¿Qué NO puede hacer este sistema todavía?](#qué-no-puede-hacer-este-sistema-todavía)
- [Glosario de términos sencillos](#glosario-de-términos-sencillos)

---

## ¿Qué es esto?

**Aquí Estoy Venezuela** es una página web donde cualquier persona puede:
1. **Buscar** si alguien está reportado como desaparecido o localizado.
2. **Reportar** a una persona que está desaparecida.
3. **Compartir** información por WhatsApp o redes sociales.
4. **Actualizar** (solo administradores autorizados) el estado de una persona cuando aparece.

Piénsalo como un **directorio público de emergencia**: un solo lugar donde converge la información que de otro modo estaría dispersa en chats de WhatsApp, publicaciones de redes sociales, llamadas telefónicas y listas en papel.

---

## ¿Qué problema resuelve?

Cuando ocurre una emergencia en Venezuela, la información sobre personas desaparecidas o localizadas suele estar:

- **Fragmentada**: cada organización, grupo de WhatsApp o voluntario tiene su propia lista.
- **Duplicada**: la misma persona puede aparecer en 5 listas diferentes con información distinta.
- **Difícil de encontrar**: un familiar no sabe a qué grupo o lista acudir.
- **Desactualizada**: no hay forma centralizada de saber si alguien ya fue localizado.

Aquí Estoy Venezuela centraliza todo en una sola base de datos, accesible desde cualquier navegador, sin necesidad de registro.

---

## Escenario 1: Buscar a una persona desaparecida

**María** escuchó que su vecino **José Pérez** podría estar desaparecido tras una emergencia. Quiere averiguar si hay información.

### Paso a paso

1. María abre la página web desde su teléfono o computadora.
2. Ve el logo del proyecto y tres números grandes: **total de reportados**, **desaparecidos actualmente** y **localizados**.
3. Escribe "José Pérez" en el cuadro de búsqueda y presiona Enter.
4. Aparece una tarjeta con la información de José: nombre completo, cédula, edad, dónde fue visto por última vez, y su estado ("Desaparecido" o "Encontrado").
5. María puede hacer clic en la tarjeta para ver más detalles, incluyendo observaciones (señas particulares, condiciones médicas, vestimenta).
6. Si hay más resultados, puede hacer clic en "Cargar más personas".

### ¿Qué pasa si no encuentra a la persona?

La página muestra "Persona no encontrada" y automáticamente ofrece un formulario para reportar a José como desaparecido, con el nombre que María ya escribió.

---

## Escenario 2: Reportar a alguien como desaparecido

**Carlos** no encuentra a su primo desde hace tres días. Decide reportarlo en la página.

### Paso a paso

1. Carlos abre la página y busca a su primo por nombre. No hay resultados.
2. La página le ofrece un formulario para reportarlo. También puede abrir el formulario desde el botón "Reportar Persona".
3. Llena los campos obligatorios: **nombre completo** y **cédula de identidad**.
4. Opcionalmente puede agregar: edad, teléfono de contacto, última ubicación conocida y observaciones (ropa que llevaba, condiciones médicas, señas particulares).
5. Si la persona es menor de edad, marca esa opción.
6. Hace clic en "Enviar" o "Reportar".

### ¿Qué pasa después?

- El sistema **verifica que no exista ya un registro** con esa misma cédula.
- Si ya existe, muestra un mensaje: "Esta persona ya está registrada".
- Si no existe, guarda el reporte con estado **"Desaparecido"** y muestra un mensaje de confirmación.

### ¿Qué pasa con los datos personales que Carlos ingresó?

- El nombre, la cédula, la edad y la ubicación son visibles públicamente para ayudar en la búsqueda.
- El **teléfono de contacto** de Carlos también es visible. Esta es una limitación importante que el proyecto debe corregir (ver sección de seguridad).

---

## Escenario 3: Compartir información por WhatsApp o redes sociales

**Ana** encuentra un reporte de una persona que podría ser la hermana de una amiga. Quiere compartir la información rápidamente.

### Opciones disponibles

1. **Compartir por WhatsApp**: un botón en cada tarjeta abre WhatsApp con un mensaje ya escrito que incluye el nombre y la cédula de la persona.
2. **Compartir en redes sociales**: botones para Facebook, X (Twitter), Instagram y TikTok.

> **Importante**: el botón de WhatsApp solo abre la aplicación con un mensaje pre-escrito. No envía datos automáticamente a ningún administrador ni sistema. Es un "enlace directo", no una integración automatizada.

---

## Escenario 4: Un administrador actualiza un reporte

**Laura** es una administradora autorizada. Recibe la noticia de que José Pérez fue localizado sano y salvo.

### Paso a paso

1. Laura entra a la página y navega a `/admin` (una dirección especial).
2. Se le redirige a la página principal y aparece una ventana para iniciar sesión.
3. Ingresa su correo electrónico y contraseña.
4. Una vez autenticada, cada tarjeta de persona muestra botones adicionales.
5. Busca a José Pérez y hace clic en "Actualizar estado".
6. Selecciona "Encontrado".
7. Completa los datos de localización: ¿dónde fue encontrado? ¿quién lo reportó?
8. Confirma el cambio.

### ¿Qué pasa después?

- El estado de José cambia de "Desaparecido" a "Encontrado".
- La fecha de actualización se registra.
- Las estadísticas en la página principal se actualizan (bajan los desaparecidos, suben los localizados).
- **No queda registro de quién hizo el cambio ni del estado anterior**. Esta es otra limitación importante.

### Otras acciones que puede hacer un administrador

- **Eliminar un reporte**: si la información es incorrecta o duplicada. La eliminación es permanente (no se puede recuperar).
- **Importar una lista de personas desde un archivo CSV**: ver escenario 5.

---

## Escenario 5: Un administrador importa una lista desde un archivo

Una organización humanitaria envía a Laura un archivo con 300 personas reportadas como desaparecidas en su región. En lugar de ingresarlas una por una, Laura puede importar el archivo completo.

### Paso a paso

1. Laura inicia sesión como administradora.
2. Va a la opción de importación de CSV.
3. Selecciona el archivo en su computadora.
4. El sistema **lee el archivo y reconoce automáticamente las columnas** (sabe que "nom" significa nombre, "ced" significa cédula, etc.).
5. Por cada persona en el archivo:
   - Si la cédula **no existe** en la base de datos: se agrega como nuevo registro.
   - Si la cédula **ya existe**: se actualiza la información con los datos del archivo.
6. Laura recibe un mensaje: "Importación exitosa: 295 registros insertados, 5 actualizados".

### ¿Qué hace el sistema con los datos incompletos?

- Cada fila debe tener al menos **nombre y cédula**. Las filas sin estos datos se saltan.
- Si la edad es menor de 18 años, el sistema lo marca automáticamente.

---

## ¿Qué información se puede ver?

### Visible para todos los visitantes

| Dato | ¿Se muestra? |
|------|:-----------:|
| Nombre completo | Sí |
| Cédula de identidad | Sí |
| Edad | Sí |
| Última ubicación conocida | Sí |
| Estado (Desaparecido/Encontrado) | Sí |
| Ubicación donde fue encontrado | Sí (si aplica) |
| Nombre de quien reportó la localización | Sí |
| Cédula de quien reportó la localización | Sí |
| Observaciones (señas, salud, vestimenta) | Sí |
| **Teléfono de contacto** | **Sí** — ver nota |
| Fecha de registro y actualización | Sí |
| Fotografía (si existe) | Sí |

### ¿Qué debería ser privado?

La información marcada arriba con **Sí — ver nota** representa un riesgo de privacidad. Idealmente:

- El **teléfono de contacto** solo debería ser visible para administradores.
- El **nombre y cédula de quien reportó** la localización deberían ser privados.
- Las **observaciones médicas o personales** deberían tener acceso restringido.
- Los **datos de menores de edad** requieren protección especial.

Actualmente **toda la información es pública**. Esta es la principal debilidad de seguridad del proyecto.

---

## ¿Cómo se protege la información? (seguridad actual y deseada)

### Situación actual

| Aspecto | Estado actual | Riesgo |
|---------|:------------:|:------:|
| Lectura de datos | Cualquier persona puede leer TODO | Alto — datos personales expuestos |
| Inserción de reportes | Cualquier persona puede crear reportes | Medio — posible abuso |
| Modificación de datos | Solo usuarios autenticados | Bajo |
| Eliminación de datos | Solo usuarios autenticados | Bajo |
| Inicio de sesión admin | Correo + contraseña (Supabase Auth) | Bajo |
| Verificación humana (CAPTCHA) | **No existe** | Medio — bots pueden crear reportes falsos |
| Límite de velocidad | **No existe** | Medio — un atacante podría saturar el sistema |
| Historial de cambios | **No existe** | Alto — no se puede saber quién cambió qué ni cuándo |
| Roles de administrador | **No existen** | Medio — cualquier admin tiene poder total |
| Eliminación de datos | Física (permanente, sin recuperación) | Medio — un error puede perder datos |

### Privacidad de los datos

El proyecto almacena información de personas en una base de datos en la nube (Supabase, que usa PostgreSQL). Actualmente:

- **Cualquier persona que visite la página puede leer todos los datos** de la tabla de personas, incluyendo teléfonos y datos sensibles. Esto es porque la configuración de seguridad de la base de datos (RLS — Row Level Security) permite lectura pública.
- **Cualquier persona puede crear nuevos reportes** sin necesidad de registrarse ni verificarse.
- **Solo los administradores autenticados** pueden modificar o eliminar registros.

### ¿Qué se recomienda mejorar?

1. **Separar datos públicos de privados**: que los teléfonos y datos sensibles solo sean visibles para administradores.
2. **Agregar moderación**: que los nuevos reportes no sean visibles hasta que un administrador los apruebe.
3. **Agregar historial**: registrar quién hizo cada cambio y qué datos había antes.
4. **Agregar roles**: administradores con distintos niveles de permiso.
5. **Agregar CAPTCHA y límite de velocidad** para evitar abusos automatizados.
6. **Agregar eliminación suave** (soft delete): en lugar de borrar definitivamente, marcar como eliminado para poder recuperar si es necesario.

---

## ¿Dónde se almacena la información?

| Tipo de información | ¿Dónde se guarda? | ¿Es seguro? |
|--------------------|-------------------|:-----------:|
| Nombres, cédulas, edades, ubicaciones, estados | Base de datos en la nube (Supabase PostgreSQL) | Los datos están cifrados en tránsito (HTTPS), pero son de lectura pública |
| Fotografías (si existen) | Supabase Storage (bucket público) | No — el bucket permite lectura y subida públicas |
| Datos de demostración para pruebas | Navegador del usuario (localStorage) | Solo en el dispositivo del usuario, no se suben a internet |
| Sesión de administrador | Navegador (sessionStorage/localStorage) y cookies de Supabase | Relativamente seguro mientras dure la sesión |
| Configuración (URL, claves) | Archivo `static/js/config.js` (ignorado por Git) | Depende de quién tenga acceso al servidor |

---

## ¿Dónde está alojada la página?

### Componentes

| Componente | ¿Dónde se ejecuta? |
|-----------|--------------------|
| La página web (el diseño, los botones, los formularios) | En el navegador del usuario (su teléfono o computadora) |
| La lógica que busca y guarda datos | En el servidor de Supabase (Edge Function) o directamente en la base de datos |
| La base de datos | En los servidores de Supabase (infraestructura cloud) |
| La autenticación de administradores | En Supabase Auth |
| Las fotos | En Supabase Storage |
| El servidor web (Nginx) | En un contenedor Docker (no se pudo verificar dónde está desplegado) |

### ¿Dónde está el dominio?

El proyecto está configurado para usar el dominio **aquiestoyvenezuela.com** con certificado SSL (HTTPS). Sin embargo, **no se pudo verificar** si el dominio está realmente activo y la página está funcionando en este momento.

---

## ¿Qué canales de entrada existen?

Actualmente los datos pueden ingresar al sistema de tres formas:

| Canal | ¿Quién lo usa? | ¿Está funcionando? |
|-------|:-------------:|:------------------:|
| **Formulario público** en la página web | Cualquier visitante | Sí — implementado |
| **Importación de archivo CSV** | Administradores | Sí — implementado |
| **Datos de demostración** incluidos en el código | Desarrolladores (para pruebas) | Sí — implementado |
| WhatsApp como canal de ingreso | — | **No implementado** — solo existe un botón para compartir |
| Telegram como canal de ingreso | — | **No implementado** |

---

## ¿Qué NO puede hacer este sistema todavía?

- **No puede recibir mensajes directamente por WhatsApp** — el botón de WhatsApp solo abre la aplicación con un texto pre-escrito, pero no hay un número que reciba y procese mensajes automáticamente.
- **No puede recibir mensajes por Telegram**.
- **No puede subir fotos desde la interfaz** — el sistema está preparado para almacenar fotos pero no hay un botón o formulario para subirlas.
- **No tiene moderación de reportes** — cuando alguien reporta a una persona, el reporte se publica inmediatamente sin que un administrador lo revise primero.
- **No puede recuperar un registro eliminado** — cuando un administrador elimina un reporte, se borra para siempre.
- **No tiene copias de seguridad automáticas** — si la base de datos se daña o pierde, no hay una forma automática de recuperar los datos.
- **No tiene un ambiente de pruebas separado** — no existe una versión del sistema para hacer pruebas antes de hacer cambios en la versión real.

---

## Glosario de términos sencillos

| Técnico | Significado sencillo |
|---------|---------------------|
| **Frontend** | La parte de la página que ves y con la que interactúas (lo que se ejecuta en tu navegador) |
| **Backend** | La parte que no ves, que procesa la información y la guarda (se ejecuta en servidores) |
| **Base de datos** | El "archivero" electrónico donde se guarda toda la información |
| **API** | Un "mensajero" que permite que la página web se comunique con la base de datos |
| **Edge Function** | Un tipo de API que se ejecuta cerca del usuario (en el "borde" de la red) para ser más rápida |
| **Supabase** | La plataforma que provee la base de datos, la autenticación y el almacenamiento |
| **Nginx** | El programa que sirve la página web a los visitantes |
| **Docker** | Una tecnología que empaqueta la página web para que funcione igual en cualquier servidor |
| **CSV** | Un tipo de archivo que contiene datos en forma de tabla, como una hoja de cálculo simple |
| **RLS (Row Level Security)** | Reglas de seguridad a nivel de fila en la base de datos — controlan quién puede ver o modificar cada registro |
| **localStorage** | Un espacio de almacenamiento temporal en el navegador, como una "cajita" donde la página guarda datos localmente |
| **Sandbox / modo demo** | Un modo de funcionamiento donde todo es ficticio, útil para probar la página sin conexión a internet |
| **PapaParse** | Una herramienta que lee archivos CSV directamente en el navegador |
| **HTTPS / SSL** | El candado que protege la comunicación entre tu navegador y el servidor, para que nadie intercepte los datos |
| **Upsert** | Una operación que actualiza un registro si existe, o lo crea si no existe |
| **Trigger** | Un "disparador" — algo que ocurre automáticamente cuando se cumple una condición |
