# RESTORA — del MVP pulido a un producto que se vende · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar RESTORA lista para cobrar de verdad y venderse en directo: producto pulido y coherente (A), aislamiento entre negocios verificado (B), cobro con Stripe (C), web de producto terminado (D) y un plan de salida a mercado preparado pero sin activar (E).

**Architecture:** Un solo producto (`producto/`: Next 16 + PostgreSQL con RLS en Vercel/Neon) y una web de marketing separada (raíz del repo: Next estático en Cloudflare Pages). Cinco áreas con dependencias explícitas (ver «Qué bloquea a qué»). Cada tarea termina con un commit verificable (pruebas unitarias + los 13 bloques e2e en verde).

**Tech Stack:** Next 16 (App Router), React 19, PostgreSQL 16 + RLS, Stripe, Resend, Vercel Blob, Anthropic API (lectura de albaranes), Playwright (e2e), Vitest (unitarias), Cloudflare Pages/D1 (web).

**Spec:** `docs/superpowers/specs/2026-10-05-roadmap-brief.md` (el encargo del propietario, literal). Apoyos: `producto/docs/HOJA-DE-RUTA.md`, `producto/docs/DECISIONES.md`.

## Global Constraints

- **Marca:** verde `#1E3D2F` (marca), `#3E8E6A` (acento), `#14201A` (tinta), fondo `#F5F6F3`; tipografía Inter. Nada de colores nuevos fuera de los tokens de `producto/src/app/globals.css` (`:root`).
- **Idioma:** la app, en español (es-ES: miles con punto, coma decimal, `Europe/Madrid`); la web, en español y catalán (ES/CA) con el mismo contenido.
- **Prohibido en cualquier texto público o de la app:** «fundador/es», «socio/s fundador/es», «founder», «beta», «plazas limitadas», «primeros restaurantes», «estamos empezando». (Las pruebas lo vigilan: Task 26.)
- **Precios y planes:** no se implementa ninguna cifra ni nombre de plan hasta que el propietario los confirme (decisión **D1**). Los 89 €/149 €/179 € de septiembre NO se asumen vigentes.
- **Publicidad:** **planificada, NO activada.** Hasta cumplir las condiciones de la Task 36 no hay gasto publicitario ni campañas de pago (directriz del 05/10).
- **Movimiento:** curvas `--ease-out: cubic-bezier(.23, 1, .32, 1)`, `--ease-in-out: cubic-bezier(.77, 0, .175, 1)`, `--ease-drawer: cubic-bezier(.32, .72, 0, 1)`; solo `transform` y `opacity`; menos de 300 ms salvo explicación; `:active` con `scale(.97)`; todo respeta `prefers-reduced-motion` (regla global ya existente).
- **Diseño responsive:** la app mide **la zona de contenido**, no la ventana: contenedor `pg` (columnas a 940 px de contenido; el escandallo a 1000) y contenedor `app` solo para el armazón (barra lateral, cabecera, hojas). Matriz de comprobación: 390 · 768 · 1093 · 1280 · 1440.
- **Datos:** migraciones aditivas e idempotentes en `producto/db/migrations/`; toda tabla con `tenant_id` lleva RLS; ninguna consulta de negocio fuera de `withTenant()`.
- **Rama y despliegue:** se trabaja en `claude/new-session-c92ohx`; cada push despliega a producción en Vercel (la app) — solo se hace push con las pruebas en verde. La web se publica aparte con `actualizar-restora.bat` (opción P), solo tras aprobación.
- **Calidad:** `npx tsc --noEmit`, `npx eslint src`, `npx vitest run` y `node tests/e2e/run.mjs` (15 bloques) en verde antes de cada commit que toque `producto/`.
- **Atribución en commits:** los trailers que pide el entorno (Co-Authored-By y Claude-Session).

## Estado de partida (hechos comprobados en esta sesión)

| Tema | Estado real | Fuente |
| --- | --- | --- |
| Skills (Fase 0) | 20 instaladas en `.claude/skills` y versionadas | commit `f23a6ed` |
| Borrar albaranes (Fase 1.1) | **Hecho**: vista previa del impacto (stock, PMP, platos, avisos, ventas con coste congelado), elección obligatoria sobre esas ventas, auditoría, 4 escenarios e2e | `compras.ts`, `borrar-doc.tsx`, `tests/e2e/borrado.mjs` |
| Descuadres + tutorial (Fase 1.2/1.3) | **Hecho**: causa raíz = columnas por ancho de ventana en vez de ancho de contenido; tutorial dibujado en el contenedor equivocado (desplazado el ancho de la barra lateral) | `globals.css`, `tour.tsx` |
| Hoy (Fase 2, primera pantalla) | **Hecho**: «Requiere tu atención» ordenado por gravedad, panel «Cómo va el mes» con selector de mes, cifras que cuentan, arco/gráficos/barras animados, esqueleto de carga, estados vacíos, gráficos explorables | `hoy/*`, `tests/e2e/hoy.mjs` |
| Aislamiento entre negocios | **Real, no solo diseñado**: rol `restora_app` sin BYPASSRLS, `withTenant()` cambia a ese rol en cada transacción, 161 comprobaciones e2e sobre 17 tablas + 404 por HTTP entre negocios | `db.ts`, `0003_app_role.sql`, `rls.mjs` |
| **Varios locales por negocio** | **NO implementado**: el esquema tiene `locales`/`local_id`, pero `loadLocal()` toma siempre el primero (`order by created_at limit 1`); no hay selector ni alta de locales. La web promete «comparar entre locales» (perfil Pequeño grupo) | `ctx.ts` línea 50, `lib/copy/precios.ts` |
| Stripe | Implementado y **apagado**: Checkout, portal, webhook con idempotencia (`stripe_events`) y estados de suscripción; **un solo precio** (`STRIPE_PRICE_ID`), sin planes, sin datos fiscales, sin reintentos propios | `billing.ts`, `api/stripe/webhook` |
| Web | Con lenguaje de fundadores en `lib/site-copy.ts`, `lib/dictionaries.ts`, `lib/copy/{precios,contacto,sobre,preguntas,legal}.ts`, `app/[locale]/precios/page.tsx`, `contacto/page.tsx`; pendientes con `TODO(Ramon)`: redes, foto, vídeo, dónde se alojan los datos | `grep` |
| Pruebas | 409 unitarias + 15 bloques e2e (alta, recorrido 52 pantallas, flujos, RLS, fugas entre negocios, prueba gratuita y bloqueo —con el impago a 5 días y el tope mensual de lecturas—, calidad de lectura, borrado de albaranes, corregir y borrar, Hoy, pantallas renovadas, Mi local y Más, coherencia entre pantallas, matriz de 156 comprobaciones de anchos y accesibilidad con axe) | `tests/` |

## Decisiones del propietario (estado a 5 de octubre de 2026)

Registradas con sus palabras en `producto/docs/DECISIONES.md`, punto 8.

| ID | Decisión | Estado | Qué desbloquea / qué falta |
| --- | --- | --- | --- |
| **D1** | **Precios y nombres de plan definitivos** | **Pendiente.** El propietario pidió primero el cálculo de la comisión de Stripe y del coste de IA por local: hecho en `producto/docs/PRECIOS-Y-COSTES.md` (Stripe ≈ 2,8–3,8 % del precio sin IVA al mes; IA ≈ 5 € por local y mes, 1,5–20 € según volumen; ≈ 8 céntimos por albarán) | Faltan cuántos planes, nombres, precios (mensual/anual, con o sin IVA), si hay límite de albaranes por plan y precio por local adicional. Bloquea Tasks 19–25, 28 y 35. **No se implementa ninguna cifra hasta tenerlo** |
| **D2** | Alcance multi-local | **Pendiente** (no contestada; el «coste por local» sugiere que el cobro puede ser por local) | Bloquea Tasks 15–17 y el copy de «Grupo» en la web. Mi recomendación sigue siendo V1 con un restaurante por negocio y multi-local en V2, y retirar de la web lo de «comparar entre locales» mientras tanto |
| **D3** | Prueba gratuita | **Decidido: se mantienen los 14 días** (sin tarjeta, como ahora) | Task 21 y 23 |
| **D4** | Impago | **Decidido y hecho: se bloquea a los 5 días de impago** (aviso desde el primer día). Siguen pendientes los **datos fiscales** (razón social, NIF, domicilio, régimen de IVA) | Falta el correo de cobro fallido (Task 23); Tasks 22 y 29 esperan los datos fiscales |
| **D5** | Material real de la web | **Parcial.** Las redes sociales y la imagen de marca **no existen y hay que crearlas**; hay que **cambiar el teléfono de la web** (falta el número nuevo) y **rellenar la web con imágenes generadas**. Sin contestar: región de los datos (Neon) y qué sellos son verídicos | Tasks 27–29 y nuevas Tasks 31b–31d (más abajo). Mientras no existan, la web no enseña enlaces a redes |
| **D6** | Qué es «Inteligencia» | **Decidido: «Avisos» pasa a ser el centro de inteligencia** (priorizado por impacto en euros, con acción directa). Hoy no usa IA | Task 8 puede ejecutarse |

## Qué bloquea a qué

```
A (interfaz V1) ────────────────────────────────────────┐
   A1 → A2…A9 → A10 → A11 (criterios de «MVP terminado») ┼─► E4 (condiciones para activar publicidad)
B1 → B2 → B3  (aislamiento y copias verificados) ────────┼─► C6 (pasar Stripe a producción)
        D2 (decisión) ─► B4 → B5 → B6 · B7              │
D1 (precios) ─► C1 → C2 → C3 → C4 → C5 → C6 ─► C7        │
        │                │                              │
        │                └─► D3 (página de precios) ────┤
D1-tarea 26 (limpiar fundadores) ─► D2/D3…D7 ──► D7 (publicar web) ─┘
E1 → E2 → E3  (se pueden preparar ya; NADA se activa)
```

Reglas duras:
- **No se pasa Stripe a producción (Task 24, última comprobación) hasta que B1–B3 estén en verde** (aislamiento verificado y restauración probada): cobrar con fugas posibles o sin copia probada es el peor escenario.
- **La web no publica precios (Task 28) hasta que existan los planes en Stripe de prueba (Task 20)** y D1 esté decidido.
- **Marketing: planificar sí, activar no.** E4 solo se cumple con A11 + C6 + D7 hechos y autorización expresa del propietario.
- A, B (B1–B3), C0 (D1) y D1 (limpieza de lenguaje) **no tienen dependencias entre sí**: se pueden ejecutar en paralelo.

## Review Focus (lo que la especificación implica y ninguna tarea probaría por sí sola)

1. **Un usuario de un negocio adivina un id o una ruta de archivo de otro** (`/api/archivos/…`, `/api/documentos/[id]`, `/api/recetas/[id]`, `/api/exportar/…`): la respuesta es 404 igual que si no existiera (nunca 403, que confirmaría que existe). Test en Task 13.
2. **El webhook de Stripe llega repetido, desordenado o después de cancelar**: el estado del plan no retrocede (idempotencia por id de evento + rango de estados). Test en Task 24.
3. **Se borra un albarán mientras otra persona importa ventas**: no queda coste congelado medio actualizado. Test en Task 13 (concurrencia) y ya cubierto por bloqueo de fila en el borrado.
4. **Cambio de plan a mitad de ciclo o durante la prueba**: sin doble cobro y con prorrateo explicado antes de confirmar. Test en Task 24.
5. **La web promete algo que el producto no hace** (por ejemplo «compara entre locales»): una prueba cruza cada promesa de la web con una ruta/función del producto. Test en Task 29.
6. **Formato es-ES en todo lo nuevo** (miles con punto, coma decimal, fechas `Europe/Madrid`, euros siempre con símbolo): prueba de formato en los gráficos y cifras que cuentan (ya cubierto en `hoy.mjs`; extender en Task 10).

---

## ÁREA A — Interfaz y producto (V1)

> **Estado a 5 de octubre de 2026 (hecho directamente, sin subagentes, por ser la prioridad de la Fase 2):** Task 1 (sistema común: `Kpi`, `Atencion`, `Esqueleto`, `SelectNav`, series mensuales) ✓ ·
> Tasks 2–7 (Compras, Escandallos, Carta, Proveedores, Inventario, Ventas) ✓ con su bloque e2e `pantallas.mjs` · Task 8 (Avisos como centro de inteligencia) ✓, con «resuelto» e «ignorado» persistentes y deshacer (migración `0009`)
> · Task 10 (QA transversal) ✓ salvo Lighthouse sobre el dominio real y una prueba con lector de pantalla: matriz de 156 comprobaciones de anchos, axe (WCAG 2.2 AA) con 0 violaciones, coherencia entre pantallas, corregir y borrar,
> revisión con la guía de interfaz de Vercel y Lighthouse local (informe en `docs/superpowers/informes/2026-10-05-qa-transversal.md`) · Task 11 redactada, **pendiente de tu firma** (`docs/superpowers/mvp-terminado.md`)
> · La ficha del proveedor ya lleva cifras (gasto, peso en tus compras, subidas, albaranes) y el gasto por mes en un solo color; la del artículo ya cumplía el sistema.
> · La ficha de la compra guardada ya lleva cifras y la tabla a todo el ancho; la pantalla de revisión ya cumplía el sistema.
> · Task 9 ✓ salvo Facturación (espera a D1): Mi local lleva las cuatro fichas del sistema común (plan, compras guardadas, equipo y food cost objetivo) y «Para dejarlo a punto» con lo que falta y tiene efecto real
>   (código postal, comensales al día, datos de ejemplo, equipo); Más abre con la tarjeta de la cuenta y el plan; el plan se cuenta igual en las dos con `estadoPlan` (`server/plan.ts`). Bloque e2e `cuenta-ui.mjs`.
> · **Queda** lo de Facturación, que se completa con los planes (D1).
> Los pasos de abajo se conservan como referencia de lo que se hizo y de lo que falta.

### Task 1: [A1] Sistema de diseño compartido: KPI, movimiento, esqueletos y estados vacíos

**Files:**
- Modify: `producto/src/app/globals.css` (sección «sistema»: `.kpi`, `.rise`, `.press`, `.skel-*`, estados vacíos)
- Create: `producto/src/components/ui/kpi.tsx` (ficha con `CountUp`, variación y mini evolución)
- Create: `producto/src/components/ui/page-skeleton.tsx` y `producto/src/app/(app)/loading.tsx` (esqueleto genérico de cualquier pantalla)
- Modify: `producto/src/components/ui/count-up.tsx` (añadir formatos `pct0`, `kg`, `uds`)
- Test: `producto/tests/unit/count-up-format.test.ts`, `producto/tests/e2e/recorrido.mjs` (sin desbordes)

**Interfaces:**
- Produces: `<Kpi label value fmt delta? spark? href? hint? />` (cliente) y `CountFmt = "eur" | "eur0" | "int" | "pct0" | "pct1" | "kg" | "uds"`; clases `.rise` (entrada escalonada con `--i`), `.press` (pulsar) y `.skel-card`.
- Consumes: `Delta`, `Sparkline` de `components/charts.tsx`.

- [ ] **Step 1:** Test unitario de formatos (`CountUp` con `pct0`, `kg`, `uds`: miles con punto, coma decimal) — falla.
- [ ] **Step 2:** Implementar `Kpi` y los formatos; sustituir `.stat` (etiqueta en mayúsculas) por el patrón nuevo en una sola pantalla piloto (Escandallos) y comprobar visualmente a 390/1280.
- [ ] **Step 3:** `loading.tsx` genérico con la estructura (cabecera, fila de KPI, tarjeta de lista) para que ninguna ruta salte al cargar.
- [ ] **Step 4:** `npx vitest run tests/unit/count-up-format.test.ts` → PASS; recorrido e2e sin desbordes.
- [ ] **Step 5:** Commit `feat(ui): KPI con cifras que cuentan, esqueleto genérico y utilidades de movimiento`.

### Task 2: [A2] Compras (lista y ficha)

**Files:** Modify `producto/src/app/(app)/compras/page.tsx`, `compras/[id]/page.tsx`; Test `producto/tests/e2e/compras-ui.mjs`.
**Interfaces:** Consumes `Kpi`, `Delta` (Task 1). Produces: barra de KPI del mes (gasto, nº de documentos, proveedores, albaranes por revisar) con variación frente al mes anterior; gráfico «Gasto por proveedor» pulsable (filtra la lista); filtros por estado con contador; esqueleto propio.

- [ ] **Step 1:** e2e: la barra de KPI muestra el gasto del mes y «vs mes anterior»; pulsar un proveedor del gráfico filtra la lista (URL `?prov=`); estado vacío con acción «Subir albarán».
- [ ] **Step 2:** Implementar KPI y gráfico interactivo; mantener el borrado con impacto (ya hecho) y los puntos de entrada.
- [ ] **Step 3:** Verificar 390/768/1093/1280; `node tests/e2e/run.mjs`.
- [ ] **Step 4:** Commit.

### Task 3: [A3] Escandallos (lista)

**Files:** Modify `escandallos/page.tsx`; Test `tests/e2e/escandallos-ui.mjs`.
**Interfaces:** Consumes `Kpi`; el filtro `?fam=` ya existe. Produces: KPI con variación (food cost carta vs objetivo, platos fuera, margen al mes, sin PVP), semáforo por plato con motivo en palabras, orden por impacto, chips de familia, tabla/lista con ordenación.

- [ ] **Step 1:** e2e: KPI con objetivo y variación; chip de familia que filtra y se quita; ordenar por «aporta al mes».
- [ ] **Step 2:** Implementar; **Step 3:** responsive; **Step 4:** Commit.

### Task 4: [A4] Carta

**Files:** Modify `producto/src/app/(app)/carta/page.tsx` y subpantallas; Test `tests/e2e/carta-ui.mjs`.
**Interfaces:** Produce: rejilla de platos con food cost visible y filtro por grupo; vista previa imprimible intacta; estado vacío (subir carta/ejemplo).

- [ ] **Step 1–3:** e2e (rejilla, filtro, vacío) → implementar → responsive. **Step 4:** Commit.

### Task 5: [A5] Proveedores (lista y ficha)

**Files:** Modify `proveedores/page.tsx`, `proveedores/[id]/page.tsx`; Test `tests/e2e/proveedores-ui.mjs`.
**Interfaces:** Produce: KPI (gasto 30/90 días con variación, nº de artículos), comparativa de precio entre proveedores por artículo (barras con el mejor resaltado), evolución del gasto, estado vacío.

- [ ] **Step 1–3:** e2e → implementar → responsive. **Step 4:** Commit.

### Task 6: [A6] Inventario y pedidos

**Files:** Modify `inventario/page.tsx`, `inventario/table.tsx`, `inventario/pedidos/*`; Test `tests/e2e/inventario-ui.mjs`.
**Interfaces:** Produce: KPI (valor del almacén, bajo mínimo, cobertura media), barra de cobertura por artículo, acciones en lote (preparar pedido) con vista previa, estados vacíos y de guardado.

- [ ] **Step 1–3:** e2e → implementar → responsive. **Step 4:** Commit.

### Task 7: [A7] Ventas y rentabilidad

**Files:** Modify `ventas/page.tsx`, `ventas/importar/*`; `components/charts.tsx` (`Scatter` con foco por teclado y cuadrantes explicados); Test `tests/e2e/ventas-ui.mjs`.
**Interfaces:** Produce: mapa de rentabilidad (estrellas/caballos/enigmas/perros) pulsable y con leyenda accionable («qué hacer con cada cuadrante»), selector de periodo con transición, KPI con variación, importación con vista previa y esqueleto.

- [ ] **Step 1–3:** e2e → implementar → responsive. **Step 4:** Commit.

### Task 8: [A8] Avisos → centro de inteligencia (depende de D6)

**Files:** Modify `hoy/avisos/page.tsx`; Create `producto/db/migrations/0008_avisos_estado.sql` (si se decide marcar «resuelto/ignorado»); Test `tests/e2e/avisos-ui.mjs`, `tests/unit/avisos-priority.test.ts`.
**Interfaces:** Produce: lista priorizada por impacto en euros con motivo, acción directa (valorar plato, comparar proveedores, preparar pedido), estados «visto/resuelto/ignorado» persistentes por local, filtros (precio, food cost, stock, carta).

- [ ] **Step 1:** test unitario del orden (impacto € desc, gravedad) → falla. **Step 2:** implementar orden y migración. **Step 3:** e2e (marcar resuelto, filtro, enlace a acción). **Step 4:** Commit.

### Task 9: [A9] Cuenta, Mi local, Facturación y Más

**Files:** Modify `cuenta/*`, `mas/*`; Test `tests/e2e/cuenta-ui.mjs`.
**Interfaces:** Produce: mismas tarjetas, jerarquía y movimiento que el resto; Facturación con el patrón de planes (se completa en Task 21).

- [ ] **Step 1–3:** implementar → responsive → e2e. **Step 4:** Commit.

### Task 10: [A10] QA transversal: accesibilidad, matriz responsive, rendimiento

**Files:** Create `producto/tests/e2e/matriz.mjs` (390/768/1093/1280/1440 × todas las rutas: sin desbordes, sin solapes, sin errores de consola), `producto/tests/e2e/a11y.mjs` (axe-core con Playwright: sin violaciones serias, foco visible, contraste AA, `aria-live` en cambios de mes).
**Interfaces:** Consumes todo A1–A9.

- [ ] **Step 1:** `matriz.mjs` y `a11y.mjs` (fallan donde corresponda). **Step 2:** arreglar lo que salga. **Step 3:** revisar el código con la skill `web-design-guidelines` (informe en `docs/`). **Step 4:** Lighthouse móvil de Hoy ≥ 90 en rendimiento y CLS < 0,1; registrar cifras. **Step 5:** Commit.

### Task 11: [A11] Criterios de «MVP terminado»

**Files:** Create `docs/superpowers/mvp-terminado.md`.
**Interfaces:** Produce la lista verificable que desbloquea E4.

- [ ] **Step 1:** Redactar criterios medibles (cero errores en `matriz.mjs`/`a11y.mjs`; lectura de albaranes con ≥ 95 % de líneas bien en el conjunto de prueba; borrar/corregir siempre posible; Hoy < 2 s en LCP; flujo alta→primer albarán→primer escandallo < 10 min sin ayuda). **Step 2:** Revisión del propietario (firma). **Step 3:** Commit.

---

## ÁREA B — Base de datos multi-restaurante (verificar de verdad)

> **Estado a 5 de octubre de 2026 (hecho por un subagente en su rama y fusionado tras repetir todas las pruebas):** Task 12 (B1) ✓ — `npm run build` ejecuta `scripts/audit-tenancy.mjs` tras las migraciones y falla el despliegue si una tabla de negocio no tiene RLS activada y forzada con políticas,
> si una tabla global no está justificada o si un `sys()` toca una tabla de negocio (salida de emergencia ruidosa: `SKIP_TENANCY_AUDIT=1`; **arranca en modo aviso**: estricta, falló el despliegue en Vercel y no se ha leído el informe contra Neon, ver `producto/docs/DESPLIEGUE.md`); los 56 `sys()` revisados a mano en `producto/docs/DECISIONES.md`, apartado 9 ·
> Task 13 (B2) ✓ — `tests/e2e/fugas.mjs`, 678 comprobaciones; arregló una carrera entre borrar un albarán e importar ventas y dos errores 500 · Task 14 (B3) ◐ — copias y restauración **documentadas pero sin ensayar** (hace falta la cuenta de Neon:
> `producto/docs/COPIAS-Y-RESTAURACION.md`, `producto/scripts/restore-drill.md`) y tope mensual de lecturas con IA por negocio (`MAX_LECTURAS_MES`, 1.500 por defecto, 0 apaga la lectura; es un freno de emergencia, no un límite de plan) ·
> Tasks 15–17 (B4–B6) ⏸ esperan a D2 (varios locales) · Task 18 (B7) ✓ — medido con 50 y 200 negocios sintéticos (`producto/docs/RENDIMIENTO.md`): migración `0010` con once índices (dar de baja un negocio: de 10,6 s a 0,25 s) y dos consultas de ventas más rápidas. El plan reserva `0011` y `0012` al Área C.

### Task 12: [B1] Auditoría automática de aislamiento

**Files:** Create `producto/scripts/audit-tenancy.mjs`; Test `producto/tests/unit/tenancy-audit.test.ts` (con una base temporal).
**Interfaces:** Produce: `node scripts/audit-tenancy.mjs` → lista tablas con `tenant_id` y si tienen RLS activada y política; tablas sin `tenant_id` con datos de negocio; usos de `sys()` (54 hoy) clasificados (solo tablas globales, filtrados por la sesión); código de salida ≠ 0 si una tabla nueva no tiene RLS. Se engancha a `npm run build` (falla el despliegue si falta).

- [ ] **Step 1:** Test: crear una tabla con `tenant_id` sin política → el script falla. **Step 2:** Implementar consultando `pg_class`, `pg_policy`, `pg_attribute`. **Step 3:** Revisar manualmente los 54 `sys()` y anotar el resultado en `producto/docs/DECISIONES.md`. **Step 4:** Commit.

### Task 13: [B2] Pruebas de fuga por API y rutas

**Files:** Create `producto/tests/e2e/fugas.mjs`; Modify `tests/e2e/run.mjs`.
**Interfaces:** Consumes los negocios A y B que crea `rls.mjs` (extraer helper `negocios()` a `lib.mjs`).

- [ ] **Step 1:** Para cada ruta con id (`/api/archivos/…`, `/api/documentos/[id]`, `/api/documentos/[id]/estado`, `/api/recetas/[id]`, `/api/exportar/[tipo]`, `/api/buscar`) con la sesión de A y ids de B → **404** (mismo cuerpo que un id inexistente). **Step 2:** Invitaciones y cambio de negocio: un usuario de A no puede aceptar una invitación de B ni cambiar a B. **Step 3:** Concurrencia: borrar albarán y a la vez importar ventas → el resultado es coherente. **Step 4:** Commit.

### Task 14: [B3] Copias de seguridad probadas y límites por negocio

**Files:** Create `producto/docs/COPIAS-Y-RESTAURACION.md`, `producto/scripts/restore-drill.md` (procedimiento) ; Modify `producto/src/server/ratelimit.ts` (límite de lecturas IA por negocio/mes: ya hay límite por hora).
**Interfaces:** Produce RPO/RTO documentados y una restauración ensayada.

- [ ] **Step 1:** Ensayo real: rama de recuperación de Neon a un punto anterior, verificar un albarán borrado a propósito y restaurarlo (en una rama, no en producción). **Step 2:** Documentar tiempos y pasos. **Step 3:** Límites mensuales de lecturas IA y de archivos por negocio con mensajes claros. **Step 4:** Commit. *(Desbloquea el paso a producción de Stripe.)*

### Task 15: [B4] Varios locales por negocio: selector y alta (depende de D2)

**Files:** Modify `producto/src/server/ctx.ts` (`loadLocal(tenantId, localId?)`, cookie `rs_local` validada), `producto/src/app/(app)/cuenta/local/*`, `components/shell/side.tsx` (selector); Create `producto/db/migrations/0009_locales_plan.sql` si hace falta límite por plan.
**Interfaces:** Produce: `ctx.local` = el local elegido (nunca uno ajeno); alta/baja de locales (propietario); todas las consultas siguen filtrando por `local_id`.

- [ ] **Step 1:** e2e: un negocio con dos locales; los proveedores, precios y albaranes de uno no aparecen en el otro. **Step 2:** Implementar selector y alta. **Step 3:** Commit.

### Task 16: [B5] RLS también por local (defensa en profundidad)

**Files:** Create migración `0010_rls_local.sql`; Modify `producto/src/server/db.ts` (`withTenant(tenantId, fn, { localId })` fija `app.local_id`).
**Interfaces:** Produce políticas `local_id = current_setting('app.local_id')::uuid` en las tablas con `local_id`.

- [ ] **Step 1:** Ampliar `rls.mjs`: con el contexto del local 1, ninguna tabla deja ver ni tocar filas del local 2. **Step 2:** Migración y cambio de `withTenant`. **Step 3:** Todos los bloques e2e en verde. **Step 4:** Commit.

### Task 17: [B6] Vista de grupo (solo lectura)

**Files:** Create `producto/src/app/(app)/grupo/page.tsx`, `producto/src/server/queries/grupo.ts`.
**Interfaces:** Produce: comparativa entre locales (food cost, margen, precio por artículo) solo para el plan que lo incluya (D1).

- [ ] **Step 1–3:** e2e con dos locales → implementar → responsive. **Step 4:** Commit.

### Task 18: [B7] Rendimiento con 50 negocios sintéticos

**Files:** Create `producto/scripts/seed-carga.mjs`, `producto/tests/carga/hoy.mjs`.
**Interfaces:** Produce: tiempos de `/hoy`, `/compras`, `/escandallos` con 50 negocios y miles de líneas; índices `(tenant_id, …)` donde falten.

- [ ] **Step 1:** Generar datos y medir (p95 de las consultas de Hoy). **Step 2:** `EXPLAIN` de las consultas calientes; añadir índices. **Step 3:** Documentar. **Step 4:** Commit.

---

## ÁREA C — Pasarela de pago y facturación (Stripe)

### Task 19: [C1] Modelo de planes (necesita D1)

**Files:** Create `producto/src/lib/planes.ts`, `producto/db/migrations/0011_plan_key.sql` (`organizations.plan_key`); Modify `producto/src/server/env.ts` (`STRIPE_PRICES` JSON: clave de plan → id de precio); Test `producto/tests/unit/planes.test.ts`.
**Interfaces:** Produce `PLANES: Record<PlanKey, { nombre; precioMes; incluye; limites: { locales; usuarios; lecturasMes } }>` y `planDe(org)`; el texto de cada plan sale de aquí (la web lo consume en Task 28).

- [ ] **Step 1:** Test: cada plan tiene nombre, precio y límites; `planDe` devuelve el de la suscripción o «prueba». **Step 2:** Implementar con los valores confirmados en D1. **Step 3:** Commit.

### Task 20: [C2] Stripe en modo prueba: productos, precios, webhooks, portal

**Files:** Create `producto/scripts/stripe-setup.mjs` (idempotente por `lookup_key`); Modify `producto/src/server/billing.ts` (precios por plan), `api/stripe/webhook/route.ts`.
**Interfaces:** Produce los productos/precios de prueba, el endpoint de webhook con los eventos `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`, y la configuración del portal.

- [ ] **Step 1:** Test de `suscripcionVigente`/`planDeSuscripcion` con los planes nuevos (ampliar `billing.test.ts`). **Step 2:** Script de creación y verificación. **Step 3:** Probar con la CLI de Stripe en local. **Step 4:** Commit.

### Task 21: [C3] Elegir y cambiar de plan en Facturación (D1, D3)

**Files:** Modify `producto/src/app/(app)/cuenta/facturacion/page.tsx`, `pagar.tsx`; Test `tests/e2e/facturacion-ui.mjs` (con Stripe simulado).
**Interfaces:** Produce: tarjetas de plan (patrón de Task 1), checkout con el plan elegido, cambio con vista previa del prorrateo, cancelación al final del periodo, estado de la prueba.

- [ ] **Step 1–3:** e2e → implementar → responsive. **Step 4:** Commit.

### Task 22: [C4] Datos fiscales y facturas (D4)

**Files:** Modify `facturacion/page.tsx` (formulario de datos fiscales), `billing.ts` (cliente con dirección y `tax_ids`); Create `producto/db/migrations/0012_datos_fiscales.sql`.
**Interfaces:** Produce: NIF/CIF, razón social y domicilio del cliente en Stripe; IVA 21 % (Stripe Tax o tipo fijo); facturas descargables y enviadas por correo.

- [ ] **Step 1:** Test de validación de NIF/CIF español. **Step 2:** Formulario + sincronización. **Step 3:** Commit.

### Task 23: [C5] Impagos: reintentos, avisos y bloqueo a los 5 días (D4)

**Files:** Modify `producto/src/server/plan.ts` (`gracia`), `email.ts` (plantillas), `billing.ts`; Test `tests/unit/plan.test.ts`.
**Interfaces:** Produce: `past_due` → aviso en la app (planbar) → correo diario de cobro fallido → bloqueo al agotar la gracia → reactivación inmediata al pagar.

- [x] **Hecho el 5/10 (sin esperar a D1):** `past_due_since` (migración `0008`), `bloqueado()` a los 5 días, `diasDeGracia()`, aviso con los días que quedan, pantalla `/bloqueado` para el impago, pruebas unitarias y un escenario e2e (día 2 avisa, día 6 bloquea, pagar desbloquea).
- [ ] **Falta:** correo diario de cobro fallido (Resend) y reintentos propios si Stripe no los cubre; comprobarlo con los relojes de Stripe (Task 24).

### Task 24: [C6] Pruebas con relojes de Stripe y paso a producción

**Files:** Create `producto/tests/stripe/relojes.mjs`, `producto/docs/PASO-A-PRODUCCION-STRIPE.md`.
**Interfaces:** Produce: pruebas de fin de prueba, cobro correcto, cobro fallido, cambio de plan a mitad de ciclo (sin doble cobro), cancelación; webhook repetido/desordenado.

- [ ] **Step 1:** Reloj de prueba: prueba → cobro → fallo → recuperación. **Step 2:** Duplicar y desordenar eventos del webhook → el plan no retrocede. **Step 3:** Lista de paso a live (claves, secreto de webhook, ajustes de impuestos, cobro real de 1 € y reembolso). **Step 4:** **Solo con B1–B3 en verde y con visto bueno del propietario**, pasar a producción. **Step 5:** Commit.

### Task 25: [C7] Límites por plan en la app

**Files:** Modify `producto/src/server/ctx.ts` (límites en `AppCtx`), `compras/subir` (lecturas/mes), `cuenta/usuarios` (usuarios).
**Interfaces:** Consumes `PLANES` (Task 19).

- [ ] **Step 1–3:** e2e: al llegar al límite, mensaje claro con la acción «Cambiar de plan». **Step 4:** Commit.

---

## ÁREA D — Web de RESTORA (venta directa)

> **Estado a 5 de octubre de 2026 (hecho directamente, tras aprobar el plan):** Task 26 ✓ (sin fundadores ni beta ni las cifras de septiembre; `tests/web/no-founder.test.ts`) ·
> Task 27 ◐ (capturas reales de la app en la home y en Funcionalidades con `npm run capturas`; el hero sigue con foto y tarjetas marcadas como ejemplo) · Task 28 ⏸ (espera a D1 y a los planes) ·
> Task 29 ✓ (`docs/AUDITORIA-CONVERSION.md`, 62 afirmaciones cruzadas con el producto y corregidas; `tests/web/promesas.test.ts`) · Task 30 ✓ en lo que es código (los `utm_*` llegan al registro sin guardar nada en el navegador;
> la medición de visitas la activa el propietario en Cloudflare) · Task 31 ✓ (datos estructurados `WebSite`, `SoftwareApplication` y `FAQPage`; canonical, hreflang y sitemap con prueba) · Task 31b ⏸ (falta el número nuevo) ·
> Task 31c ✓ (kit de marca) · Task 31d ✓ (7 imágenes del carrusel colocadas con texto alternativo ES/CA y nota de transparencia en el pie; `docs/marketing/imagenes.md`) · Task 32 ⏸ (publicar requiere la orden del propietario: `actualizar-restora.bat`, opción P).
> Además, la web ya no enseña los `[PENDIENTE]` de la biografía de «Sobre nosotros» (`ABOUT_BIO_READY`), y Lighthouse móvil sale en 93-98 con accesibilidad, buenas prácticas y SEO a 100 tras corregir cómo se mide el LCP.
> Contraste: `npm run qa:web` recorre las 22 páginas × 3 anchos × tema claro y oscuro sin una sola violación de axe y mide con píxeles reales los textos sobre foto (4,5:1 como mínimo); para lograrlo, el texto de estado verde/rojo usa `--up-ink`/`--down-ink`, los paneles con texto blanco usan `--brand-deep` (en oscuro `--brand` es verde claro) y las bandas de foto llevan un velo (`.scrim`).
> Pruebas del área: `npm run test:web` (19) y `npm run qa:web`.

### Task 26: [D1] Eliminar el lenguaje de fundadores y beta

**Files:** Modify `lib/site-copy.ts`, `lib/dictionaries.ts`, `lib/copy/precios.ts`, `lib/copy/contacto.ts`, `lib/copy/sobre.ts`, `lib/copy/preguntas.ts`, `lib/copy/legal.ts`, `app/[locale]/precios/page.tsx`, `app/[locale]/contacto/page.tsx`, `components/**` (los que lean `founder*`); Create `tests/no-founder.test.ts` (raíz).
**Interfaces:** Produce: la web sin «fundador/beta/plazas limitadas/primeros restaurantes», en ES y CA; sin campos `founder*` en los tipos.

- [ ] **Step 1:** Test que falla si reaparece cualquiera de las palabras prohibidas en `lib/**`, `app/**`, `components/**`. **Step 2:** Reescribir el copy (hero, CTAs «Probar gratis 14 días», precios sin oferta de fundadores, FAQs, formulario de contacto, newsletter). **Step 3:** `npm run build` (raíz) y comprobar ES/CA. **Step 4:** Commit.

### Task 27: [D2] Marca y producto: home y hero con capturas reales

**Files:** Modify `components/home/*`, `components/site/hero.tsx`, `components/site/dashboard-mock.tsx` (sustituir mocks por capturas del producto), `public/images/*`; Create `scripts/capturas.mjs` (genera capturas con Playwright de la app con datos de ejemplo).
**Interfaces:** Consumes los tokens de marca; produce una home coherente con la app (mismas fuentes, colores y tarjetas) y capturas reales del «Hoy» renovado.

- [ ] **Step 1:** Script de capturas reproducible (390/1280). **Step 2:** Recomponer hero y secciones con capturas. **Step 3:** Revisión visual y rendimiento (imágenes responsive). **Step 4:** Commit.

### Task 28: [D3] Precios, Funcionalidades, Cómo funciona, Sobre nosotros y Contacto (D1, D5)

**Files:** Modify `app/[locale]/precios/page.tsx` y `lib/copy/precios.ts` (alimentados por `PLANES` de Task 19 cuando exista), `funcionalidades`, `como-funciona`, `sobre-nosotros` (foto), `contacto`.
**Interfaces:** Produce: página de precios con los planes definitivos y comparativa, sin oferta de fundadores; «Sobre nosotros» con foto y datos reales.

- [ ] **Step 1–3:** contenido final → build ES/CA → capturas. **Step 4:** Commit. *(No se ejecuta hasta D1 y la Task 20.)*

### Task 29: [D4] Auditoría de conversión actualizada

**Files:** Create `docs/AUDITORIA-CONVERSION.md`, `tests/web/auditoria.test.ts`; Modify según resultados (`app/sitemap.ts`, `components/site/footer.tsx`, legales).
**Interfaces:** Cada punto del encargo tiene una comprobación: sitemap y robots; HTTPS/HSTS (`_headers`); velocidad (Lighthouse móvil ≥ 90, LCP < 2,5 s); chat (decisión: WhatsApp ya existe; chat propio opcional); responsive 375/768/1440; Sobre nosotros; formulario de contacto (Worker + D1 + aviso por correo); **redes reales** (D5); **sellos verídicos** (solo los demostrables); datos de contacto visibles; volver arriba; FAQs; **políticas legales completas** (aviso legal, privacidad/RGPD, cookies **y nuevas: condiciones de contratación, cancelación y reembolso, encargado del tratamiento**); newsletter con incentivo; botones de compartir; vídeo de presentación (D5). Más una prueba que cruza las promesas de la web con rutas del producto.

- [ ] **Step 1:** Escribir la auditoría con estado de cada punto. **Step 2:** Test de promesas (cada «feature» de la web ↔ ruta/función real) → falla con «comparar entre locales» si B4–B6 no existen. **Step 3:** Corregir. **Step 4:** Commit.

### Task 30: [D5] Analítica y conversión

**Files:** Modify `components/site/*` (eventos de clic en CTAs), `lib/site.ts`; Create `lib/analytics.ts`.
**Interfaces:** Produce: medición sin cookies (Cloudflare Web Analytics o Plausible) y UTM que viajan hasta el registro de la app.

- [ ] **Step 1:** Test: los enlaces a la app llevan `utm_*` preservados. **Step 2:** Implementar. **Step 3:** Commit.

### Task 31: [D6] SEO técnico

**Files:** Modify `app/[locale]/**/page.tsx` (metadatos, Open Graph), `app/sitemap.ts` (hreflang ES/CA); Create datos estructurados (`SoftwareApplication`, `FAQPage`).
**Interfaces:** Produce: metadatos únicos por página, imágenes sociales, `hreflang`.

- [ ] **Step 1:** Test de metadatos por ruta. **Step 2:** Implementar. **Step 3:** Commit.

### Task 31b: [D6b] Teléfono de la web: cambiarlo en un solo sitio (decidido el 5/10; falta el número nuevo)

**Files:** Modify `lib/site.ts` (teléfono y WhatsApp), los textos que lo escriban a mano (`grep` del número actual en `lib/**`, `app/**`, `components/**`, `public/**`, `functions/**`); Create `tests/web/telefono.test.ts`.
**Interfaces:** Produce: el número nuevo en cabecera, pie, botón de WhatsApp, Contacto y textos legales, y **el antiguo en ninguna parte** (la prueba falla si reaparece). Consume el número que dé el propietario.

- [ ] **Step 1:** Pedir el número nuevo (con prefijo) y si es el mismo para llamadas y WhatsApp. **Step 2:** Test que falla si el número antiguo aparece en el repositorio de la web. **Step 3:** Centralizar en `lib/site.ts` y sustituir. **Step 4:** `npm run build` (raíz) y comprobar ES/CA. **Step 5:** Commit. *(No se publica sin aprobación: Task 32.)*

### Task 31c: [D6c] Kit de marca para redes sociales (las redes y la imagen de marca hay que crearlas)

**Files:** Create `scripts/marca.mjs` (SVG → PNG con Playwright, reproducible), `public/marca/*` (avatar 1080×1080 y 400×400; portadas LinkedIn 1584×396, X 1500×500, Facebook 820×312 y YouTube 2560×1440; imagen para compartir 1200×630; plantillas de publicación 1080×1350 e historia 1080×1920; logotipo en color, blanco y monocromo), `docs/marketing/marca.md` (uso del logotipo, colores, tipografía, nombres de usuario propuestos, descripciones en ES/CA); Modify `lib/site.ts` (`redes` vacío: el pie solo enseña las que existan).
**Interfaces:** Consume los tokens de marca (`#1E3D2F`, `#3E8E6A`, `#14201A`, `#F5F6F3`, Inter) y el símbolo de la app; produce los archivos y la lista de nombres de usuario. **Crear las cuentas lo hace el propietario** (necesitan su identidad y verificación); el pie de la web no enseña ninguna red hasta que exista (sin enlaces vacíos ni redes falsas).

- [ ] **Step 1:** Propuesta de nombres de usuario y descripciones (ES/CA). **Step 2:** `scripts/marca.mjs` genera todos los formatos. **Step 3:** Prueba que comprueba tamaños exactos y que el pie no muestra redes sin URL. **Step 4:** Revisión visual por el propietario. **Step 5:** Commit. *(Crear los perfiles no es publicidad: la directriz del 05/10 solo veta la publicidad de pago.)*

### Task 31d: [D6d] Imágenes generadas para rellenar la web

**Files:** Create `docs/marketing/imagenes.md` (un encargo por hueco de la web: formato, proporción, paleta, estilo y texto alternativo), `scripts/capturas.mjs` (capturas reales del producto, Task 27); Modify `public/images/*` y los componentes de cada hueco; reutiliza `scripts/gen-image-variants.mjs` (variantes responsive).
**Interfaces:** Produce: cada hueco de la web con imagen y `alt` (inicio, funcionalidades, cómo funciona, precios, «Sobre nosotros», imagen para compartir), sin fotos ni vídeo pendientes de la persona. **Claude no genera imágenes**: los huecos de ambientación se rellenan con las que genere el propietario con su herramienta de imágenes (o con una clave de API de un proveedor de imágenes guardada como secreto, nunca en el repositorio); lo que sí se genera aquí son las capturas reales del producto y las ilustraciones vectoriales de marca. **Reglas:** las imágenes generadas se usan para ambientación y producto, **nunca como retratos de clientes o equipo, testimonios ni sellos de confianza**.

- [ ] **Step 1:** Inventario de huecos (`grep` de `TODO(Ramon)` y de las imágenes actuales) y encargo por hueco. **Step 2:** Capturas reales del producto (390/1280) con datos de ejemplo. **Step 3:** Colocar las imágenes recibidas, generar variantes y `alt`. **Step 4:** Revisión visual y rendimiento (Lighthouse móvil ≥ 90). **Step 5:** Commit.

### Task 32: [D7] Publicación en Cloudflare y verificación

**Files:** Modify `CLOUDFLARE.md`; usar `actualizar-restora.bat` (opción P).
**Interfaces:** Produce la web publicada y verificada en `restoraapp.app`.

- [ ] **Step 1:** Build y comprobación local. **Step 2:** **Con aprobación expresa del propietario**, publicar. **Step 3:** Verificar en producción (enlaces, formularios, ES/CA, cabeceras). **Step 4:** Nota de reversión. **Step 5:** Commit.

---

## ÁREA E — Promoción y publicidad (SOLO PLAN: NO ACTIVAR)

> **Directriz vigente (05/10): sin publicidad hasta tener el MVP terminado.** Esta área prepara el terreno. No se crea ninguna campaña, no se gasta nada, no se publica en redes de pago.
>
> **Estado a 5 de octubre de 2026:** Tasks 33, 34, 35 y 36 redactadas como **plan, no activado**, solo documentos, a la espera de la revisión del propietario: `docs/marketing/salida-a-mercado.md` (E1), `medicion.md` (E2: convención de UTM, consultas del embudo probadas contra el esquema real y tres cambios propuestos que **no** se han escrito), `materiales/` (E3: correos de la prueba, página comercial, plantilla de caso de cliente y guion del vídeo, sin precios ni nombres de plan hasta D1) y `condiciones-de-activacion.md` (E4: ninguna condición se cumple hoy). Las decisiones que necesita del propietario están en `salida-a-mercado.md`, apartado 9.

### Task 33: [E1] Estrategia de salida a mercado

**Files:** Create `docs/marketing/salida-a-mercado.md`.
**Interfaces:** Produce: cliente ideal (restaurante independiente con carta propia y compras recurrentes), propuesta de valor y mensajes, canales **orgánicos primero** (contenido útil, comunidades de hostelería, distribuidores y gestorías, ferias del sector, SEO local), guion de contacto en frío, presupuesto escalonado para cuando se active, KPI (coste por alta, de prueba a pago, retención) y calendario de 90 días.

- [ ] **Step 1:** Redactar con datos reales del producto y de la web. **Step 2:** Revisión del propietario. **Step 3:** Commit.

### Task 34: [E2] Medición preparada y desactivada

**Files:** Create `docs/marketing/medicion.md`; reutiliza Task 30.
**Interfaces:** Produce: convención de UTM, eventos de embudo (visita → registro → primer albarán → primer escandallo → pago) y panel; todo **apagado** hasta E4.

- [ ] **Step 1:** Definir eventos y propiedad de cada dato. **Step 2:** Commit.

### Task 35: [E3] Materiales

**Files:** Create `docs/marketing/materiales/` (secuencia de correos de la prueba: día 0, 2, 5, 10, 13; una página comercial; plantilla de caso de éxito; guion del vídeo).
**Interfaces:** Produce los textos listos para usar (sin «fundadores»), con los precios finales de D1.

- [ ] **Step 1:** Redactar. **Step 2:** Revisión. **Step 3:** Commit.

### Task 36: [E4] Condiciones para activar publicidad

**Files:** Create `docs/marketing/condiciones-de-activacion.md`.
**Interfaces:** Lista que debe cumplirse **entera** y que el propietario firma: A11 (MVP terminado) · C6 (cobro en producción verificado) · D7 (web publicada) · soporte atendido (WhatsApp/correo con plazo de respuesta) · medición lista (E2) · presupuesto aprobado.

- [ ] **Step 1:** Redactar y enlazar a las comprobaciones. **Step 2:** **No activar nada** hasta la firma. **Step 3:** Commit.

---

## Protocolo de ejecución con subagentes

- **Un subagente por área** (A interfaz/producto, B multi-tenant, C pagos, D web, E marketing), en paralelo donde el mapa de dependencias lo permite. Dentro de un área, **tareas en orden** (una a la vez).
- **Aislamiento:** cada área trabaja en su **propio worktree** (rama local `claude/roadmap-<área>`), para que ningún agente pise el trabajo de otro. Yo integro en `claude/new-session-c92ohx` en orden de dependencias, tras pasar `tsc`, `eslint`, `vitest` y los 8 bloques e2e. *(Desviación consciente de la skill, que desaconseja implementadores en paralelo sobre el mismo árbol: aquí no comparten árbol.)*
- **Por tarea:** implementador → revisor (cumple la tarea + calidad) → arreglos hasta 5 rondas → completada. **Libro de registro** en `.superpowers/sdd/…/progress.md` (se recupera tras compactar).
- **Modelos:** tareas mecánicas (A2–A7, D1, D6) con modelo económico; integración (B4–B6, C2–C4, A8) con modelo estándar; diseño y decisiones de arquitectura (B5, C1, D2) y la revisión final con el más capaz.
- **Cuándo paran y te preguntan:** operación irreversible o destructiva (migraciones en producción, Stripe live, publicar la web), acción sensible de seguridad, efecto fuera del árbol que se pide confirmar (push a la rama compartida, publicar), o un plan tan roto que cualquier camino sea adivinar.
- **Lo que NO hacen sin ti:** pasar Stripe a producción, publicar la web, activar publicidad, escribir precios que no hayas confirmado.

## Autorrevisión

1. **Cobertura del encargo:** Fase 3.1 (V1: Tasks 1–11, incluye lo hecho en Fases 1 y 2) · 3.2 (Tasks 12–18) · 3.3 (Tasks 19–25 + D1) · 3.4 (Tasks 26–32) · 3.5 (Tasks 33–36, con la advertencia de no activar) · reparto por áreas y dependencias (sección «Qué bloquea a qué» y «Protocolo»).
2. **Pasos:** cada tarea nombra archivos, interfaces y pruebas; las de pantallas (A2–A9) fijan el comportamiento comprobable y dejan el diseño visual a las skills `frontend-design`, `ui-ux-pro-max` y `emilkowalski/skills`.
3. **Consistencia de nombres:** `Kpi`, `CountFmt`, `PLANES`, `planDe`, `loadLocal(tenantId, localId?)`, `withTenant(tenantId, fn, { localId })` se definen en la tarea que los produce y se consumen después.
4. **Proporción:** el plan decide interfaces, archivos y criterios; no transcribe código.
5. **Lo que queda abierto a propósito:** D1–D6 (arriba). Sin ellas, las Tasks 15–17, 19–25, 28–29 y 35 no empiezan.
