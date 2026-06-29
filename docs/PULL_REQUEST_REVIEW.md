# Revisión de Pull Requests abiertos

> Estado y recomendación documental sobre pull requests e issues.

## Audiencia

Mantenedores, desarrollo, QA, producto y gestión de proyectos.

## Qué responde este documento

Qué PRs están abiertos o fusionados, qué conflictos existen y cómo decidir integración.

## Estado y fecha de revisión

- Fecha: 2026-06-29.
- Rama: `docs/audit-and-current-architecture`.
- Referencia local: `8d7dfcb442772099958efc8578db124a7b3a7bff`.
- Estado: revisión documental Codex; no confirma despliegue productivo ni sustituye validación humana.

> Análisis detallado de los PRs #12 y #13, ambos abiertos y sin revisión al momento de esta auditoría.

---

## Resumen


> [!NOTE]
> GitHub revalidado en esta fase con `gh pr list` y `gh issue list` el 2026-06-29. En esa consulta, PR #12 y PR #13 estaban abiertos y `CONFLICTING`; PR #14 estaba `MERGED`; issue #11 estaba abierto.

| PR | Título | Autor | Estado | Líneas +/− | Archivos |
|:--:|--------|:-----:|:------:|:----------:|:--------:|
| #13 | Optimización UI/UX con Metodología BEM, Modos de Color y Centrado de Cards | rebecadev10 | Abierto | +908 / −1203 | 3 |
| #12 | ui: nav, vista lista/grid paginada y mejoras de layout | JoseJEspinoza | Abierto | +834 / −140 | 4 |

**Ambos PRs tienen conflictos entre sí** porque modifican los mismos archivos (`index.html`, `style.css`, `app.js`). Deben revisarse y mergearse en orden, o mejor aún, coordinar una integración que combine ambos cambios.

---

## PR #13 — rebecadev10: Optimización UI/UX con BEM, Modos de Color y Centrado de Cards

### Resumen

| Aspecto | Detalle |
|---------|---------|
| **Rama** | `rebeca.rodriguez/feat/bem-y-modo-oscuro` |
| **Commits** | 1 |
| **Archivos** | `index.html`, `static/css/style.css`, `static/js/app.js` |
| **+/-** | +908 / −1203 |

### Cambios principales

#### 1. Metodología BEM (Block, Element, Modifier)
- Renombra clases CSS de naming plano (`.card`, `.search-bar`) a BEM (`.card__title`, `.search-bar__input`).
- Reestructura el HTML para separar bloques, elementos y modificadores.
- **Impacto**: Rompe cualquier selector CSS o JS que use las clases anteriores. El autor actualizó tanto CSS como HTML y JS consistentemente.

#### 2. Eliminación de estilos inline
- Migra todos los `style="..."` del HTML al archivo CSS.
- **Impacto**: Positivo — mejora mantenibilidad, reduce duplicación.

#### 3. Modo claro/oscuro
- Implementa variables CSS para ambos modos.
- Usa `prefers-color-scheme` para detección automática del sistema.
- **Impacto**: Sin regresión, agrega funcionalidad sin romper existente.

#### 4. Centrado de cards
- Corrige el grid de resultados para centrar tarjetas.
- Optimiza para visualización móvil.
- **Impacto**: Positivo — mejora la experiencia visual.

### Análisis

| Aspecto | Evaluación |
|---------|:----------:|
| **Calidad del cambio** | 🟢 Bueno — refactor consistente, BEM bien aplicado |
| **Riesgo de regresión** | 🟡 Medio — cambio masivo de clases puede afectar JS que referencia clases por nombre |
| **Pruebas** | 🔴 Sin tests — no se puede verificar que no haya regresiones |
| **Conflicto con PR #12** | 🔴 Alto — ambos modifican los mismos archivos |

### Riesgos específicos

1. **app.js modificado** (91 adiciones, 140 eliminaciones): las referencias a clases CSS en el JS fueron actualizadas para reflejar BEM. Si alguna clase se omitió, la funcionalidad asociada se rompe.
2. **Sin validación visual**: no hay capturas de pantalla ni descripción de cómo se ve el modo oscuro en cada componente.
3. **Commit único**: 908 adiciones y 1203 eliminaciones en un solo commit. Idealmente debería dividirse en: (a) refactor BEM, (b) modo oscuro, (c) centrado de cards.

### Recomendaciones

1. ✅ **Aprobar el cambio conceptualmente** — BEM y modo oscuro son mejoras netas.
2. ⚠️ **Solicitar división en commits más pequeños** para facilitar revisión.
3. ⚠️ **Verificar que las clases en app.js coinciden con las nuevas clases BEM** — especialmente en selectores como `querySelector('.card')` que ahora sería `querySelector('.card__item')` o similar.
4. ⚠️ **Probar manualmente** en modo sandbox antes de mergear.
5. 🔄 **Coordinar con PR #12** para integrar ambos cambios.

---

## PR #12 — JoseJEspinoza: ui, nav, vista lista/grid paginada y mejoras de layout

### Resumen

| Aspecto | Detalle |
|---------|---------|
| **Rama** | `jose.espinoza/ui/nav-listgrid-pagination` |
| **Commits** | 3 |
| **Archivos** | `.gitignore`, `index.html`, `static/css/style.css`, `static/js/app.js` |
| **+/-** | +834 / −140 |

### Cambios principales

#### 1. Navegación principal (nav)
- Nav sticky con logo y menú hamburguesa responsivo.
- Logo ampliado sin texto de marca al lado.
- "Reportar desaparecido" movido al final del menú.
- "Administración" movida al footer.
- **Impacto**: Cambia la estructura del header y la disposición de elementos.

#### 2. Vista de lista (tabla) adicional a la vista de tarjetas
- Toggle entre vista tarjetas (grid) y vista lista (tabla).
- Tabla responsiva con columnas: Nombre, Cédula, Edad, Ubicación, Estado, Fecha.
- Contador de resultados visible en ambas vistas.
- **Impacto**: Nuevo modo de visualización sin eliminar el existente.

#### 3. Paginación por páginas
- Reemplaza "Cargar más" por paginación con 12 registros por página.
- Botones Anterior / Siguiente.
- Filtros y búsqueda resetean a página 1.
- `pageSize` configurable en `state.pageSize`.
- **Impacto**: Cambia el comportamiento de paginación. Rompe la funcionalidad de scroll infinito anterior.

#### 4. Sandbox mejorado
- 25 registros demo realistas (venezolanos, varias ciudades) reemplazan los 5 anteriores.
- Banner de sandbox con botón para cerrar.
- **Impacto**: Mejora la experiencia de desarrollo/demo.

#### 5. Footer rediseñado
- Layout de 3 columnas: info del proyecto, recursos (GitHub, docs), llamado a contribuir.
- Reloj en tiempo real desde el sismo del 24 de junio 2026.
- Quita enlace de administración del footer.
- **Impacto**: Footer completamente rediseñado.

#### 6. .gitignore mejorado
- Excluye archivos de tooling.
- **Impacto**: Positivo — mantenimiento del repositorio.

### Análisis

| Aspecto | Evaluación |
|---------|:----------:|
| **Calidad del cambio** | 🟢 Bueno — cambios bien estructurados en 3 commits |
| **Riesgo de regresión** | 🟡 Medio — paginación reemplaza scroll infinito, puede afectar UX existente |
| **Pruebas** | 🔴 Sin tests — incluye plan de pruebas manual en la descripción |
| **Conflicto con PR #13** | 🔴 Alto — ambos modifican HTML, CSS y JS |

### Riesgos específicos

1. **Paginación vs. "Cargar más"**: usuarios acostumbrados al comportamiento anterior encontrarán una experiencia diferente. El plan de pruebas manual listado en el PR cubre los escenarios básicos.
2. **Footer con reloj**: el contador del sismo es contextual al desastre actual. Cuando pase el tiempo, el contador puede no ser relevante. Considerar si debe mantenerse o eliminarse a futuro.
3. **Nav sticky**: en móviles, el nav sticky ocupa espacio vertical precioso. Verificar que no afecte la legibilidad en pantallas pequeñas.
4. **Vista lista con acciones admin**: el PR menciona que las acciones admin deben ser visibles en la vista lista cuando hay sesión activa. Verificar implementación.

### Recomendaciones

1. ✅ **Aprobar el cambio conceptualmente** — las mejoras de navegación, vista lista y paginación son valiosas.
2. ⚠️ **Probar el plan de pruebas manual** listado en el PR body antes de mergear:
   - Navegar páginas en sandbox y producción
   - Alternar vista Tarjetas ↔ Lista
   - Filtros y búsqueda resetean a página 1
   - Menú hamburguesa en móvil
   - Acciones admin visibles en vista lista con sesión activa
3. ⚠️ **Verificar comportamiento del footer** después del merge (el PR #13 también modifica clases en HTML).
4. 🔄 **Coordinar con PR #13** para integrar ambos cambios.

---

## Análisis de conflictos entre PR #12 y PR #13

### Archivos en conflicto

| Archivo | PR #12 cambia | PR #13 cambia | ¿Conflicto? |
|---------|:-------------:|:-------------:|:-----------:|
| `index.html` | 103+/10- | 251+/262- | **Sí** — estructura del DOM |
| `static/css/style.css` | 468+/20- | 566+/801- | **Sí grave** — PR #13 renombra TODAS las clases a BEM; PR #12 agrega nuevas clases con naming plano |
| `static/js/app.js` | 259+/110- | 91+/140- | **Sí** — PR #13 actualiza referencias a clases; PR #12 agrega nueva lógica de paginación y vistas |

### Naturaleza del conflicto

El PR #13 es un **refactor masivo de naming** (BEM) que cambia la nomenclatura de todas las clases CSS y sus referencias en HTML/JS. El PR #12 agrega **nueva funcionalidad** (nav, vista lista, paginación) usando las clases existentes.

Si se mergea PR #12 primero:
- Las nuevas funcionalidades del PR #12 usarán clases planas.
- El PR #13 luego renombrará esas clases a BEM.
- **Problema**: el PR #13 no incluye las nuevas clases del PR #12, por lo que el nav y la vista lista se romperían después de mergear ambos.

Si se mergea PR #13 primero:
- El PR #12 necesitaría actualizarse para usar las nuevas clases BEM.
- **Problema**: el autor del PR #12 tendría que rebasar y ajustar todo su código.

### Estrategia recomendada

1. **Comunicar a ambos autores** que hay conflictos y coordinar una integración.
2. **Opción A (recomendada)**: Mergear PR #13 primero (refactor BEM), luego pedir a JoseJEspinoza que actualice PR #12 sobre la nueva base BEM.
3. **Opción B**: Mergear PR #12 primero, luego pedir a rebecadev10 que actualice PR #13 incluyendo las nuevas funcionalidades en el refactor BEM.
4. **Opción C (ideal)**: Crear un PR de integración que combine ambos cambios, trabajando con ambos autores.

### Recomendación: Opción A

```
main
 └── develop
      ├── PR #13 (BEM + modo oscuro) → MERGE primero
      └── PR #12 (nav + paginación) → REBASE sobre develop después del merge
```

**Razones**:
- PR #13 es un refactor base que afecta el naming de todo el frontend.
- Es más fácil actualizar PR #12 sobre la nueva base BEM que al revés.
- El autor de PR #12 (JoseJEspinoza) tiene experiencia con rebases (ha contribuido múltiples PRs antes).

---

## Checklist de revisión para ambos PRs

### Previo al merge

- [ ] ¿Los cambios funcionan en modo sandbox?
- [ ] ¿Los cambios funcionan con datos reales (si hay backend)?
- [ ] ¿No hay referencias a clases CSS antiguas en app.js?
- [ ] ¿El nav sticky no obstruye contenido en mobile?
- [ ] ¿La paginación funciona con filtros aplicados?
- [ ] ¿El toggle lista/grid persiste el estado actual?
- [ ] ¿El modo oscuro se ve bien en todos los componentes?
- [ ] ¿El banner de sandbox se cierra correctamente?
- [ ] ¿Las acciones administrativas son visibles en vista lista?
- [ ] ¿No hay console.logs, debuggers o código de prueba olvidados?
- [ ] ¿El footer se ve bien en desktop y mobile?

### Post-merge

- [ ] ¿Los conflictos de merge se resolvieron correctamente?
- [ ] ¿Las funcionalidades combinadas funcionan juntas?
- [ ] ¿Se actualizó el README si es necesario?
- [ ] ¿Se cerró el issue #11 (responsive) si aplica?

---

## Issues relacionados

| Issue | Relación con PRs |
|-------|-----------------|
| [#11 — "make responsive all app"](https://github.com/Open-Vzla-SOS/aquiestoyvenezuela-web/issues/11) | Ambos PRs contribuyen a mejorar responsive. PR #13 (BEM + centrado) y PR #12 (nav hamburguesa + vista lista responsiva). Revisar si después de mergear ambos se puede cerrar este issue. |
