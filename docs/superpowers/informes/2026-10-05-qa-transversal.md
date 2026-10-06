# QA transversal (Task 10 del plan) — informe del 5 de octubre de 2026

> Qué se ha medido en toda la app (no solo en las pantallas nuevas), cómo, qué salió y qué se corrigió. Todo se repite con `node tests/e2e/run.mjs` (15 bloques desde la fusión del Área B);
> los tres bloques de este informe son `matriz.mjs`, `a11y.mjs` y `coherencia.mjs`. Cifras locales: build de producción en el equipo de desarrollo con los datos de ejemplo.

## 1. Matriz de anchos — `matriz.mjs`

26 pantallas × 6 anchos (360 · 390 · 768 · 1093 · 1280 · 1440 px) = **156 comprobaciones**. En cada una: respuesta 200, ningún error de consola, ningún desbordamiento horizontal,
**ningún control tapado por otro elemento** (se miran cinco puntos de cada botón, enlace o campo y se pregunta al navegador qué hay encima, con la pantalla entera a la vista) y
**ningún texto cortado en seco** (cajas con el desbordamiento oculto, sin puntos suspensivos, cuyo texto no cabe).

Resultado: **156/156**. Lo que encontró por el camino:

| Hallazgo | Dónde | Arreglo |
|---|---|---|
| «Proveedores» cortado en las pestañas de Compras a 390 px | Compras, Artículos, Proveedores e Inventario en móvil | Las pestañas miden lo que dice su texto y, si no caben (a 360 px no caben), se deslizan; al entrar queda a la vista la actual |
| «Como el sistema» cortado en el selector de tema | Mi local en móvil | La etiqueta pasa a «Sistema», como en «Más» |

**Una advertencia sobre el método.** La primera versión del detector de controles tapados daba por buenas todas las pantallas por un fallo mío: descartaba todo lo que estaba dentro del armazón de la app.
Lo vi al probarlo con dos botones superpuestos a propósito y no saltaba. Lo rehíce y ahora se comprueba contra ese caso malo antes de fiarse del «todo bien».

## 2. Accesibilidad — `a11y.mjs`

axe-core 4.13 con las reglas WCAG 2.0, 2.1 y 2.2 de nivel A y AA. **29 pantallas** (las 26 de la app y Entrar, Registro y Recuperar) × móvil y escritorio × tema claro y oscuro = **116 análisis**.
Además, un recorrido por teclado de 5 pantallas en 2 anchos (hasta 60 paradas cada una): cada control con foco **cambia de aspecto** (se compara con y sin foco) y **no queda tapado** por una barra o por el botón flotante;
y el enlace «Saltar al contenido» (con su destino) en toda pantalla con barra lateral.

La primera pasada encontró **14 violaciones serias o críticas** (3 reglas) y **23 problemas de foco**. Todo corregido; la segunda pasada: **0 y 0**.

| Regla | Dónde | Arreglo |
|---|---|---|
| `nested-interactive` (grave) | Gráficas de Hoy y de Ventas: eran una «imagen» con botones y enlaces dentro, y los lectores de pantalla no los ven | El contenedor pasa a ser un grupo con nombre; los puntos siguen siendo botones/enlaces con su nombre |
| `label` (crítica) | Inventario en móvil: 42 campos sin nombre accesible | Nombre = etiqueta visible + artículo («Stock (kg) Setas variadas») |
| `color-contrast` (grave) | Carta imprimible: títulos de familia a 3,9:1 y pie a 3,0:1 | 5,6:1 y 5,2:1 |
| Foco tapado | Móvil: el botón «Añadir» tapaba el control enfocado al tabular | `scroll-padding-bottom` en el área de contenido |

**Lo que axe no cubre.** Las herramientas automáticas detectan una parte de los problemas de accesibilidad; no sustituyen una prueba con un lector de pantalla real (VoiceOver, TalkBack, NVDA). Está en la lista de pendientes del MVP.

## 3. Guía de interfaz web de Vercel — revisión de código

Reglas descargadas de `vercel-labs/web-interface-guidelines` (skill `web-design-guidelines`) y aplicadas con búsquedas mecánicas de antipatrones y lectura de las pantallas de edición y borrado.

**Cumple** (comprobado): sin `transition: all`; sin `user-scalable=no`; sin `div`/`span` con `onClick`; foco de los campos sustituido (no solo `outline: none`); `color-scheme` y `theme-color` para el tema oscuro;
`lang="es"`; `autocomplete`, `inputMode` y tipo correcto en los formularios de acceso; avisos en vivo (`aria-live`) en toasts, cambios de mes y esqueletos; el campo del código de 6 cifras gestiona el pegado (no lo bloquea);
confirmación en el resto de acciones que borran datos guardados (sin confirmar quedan solo quitar una línea de un borrador y quitar un proveedor recién añadido en el alta, que se rehacen en un clic); formatos de fecha y número con `Intl`.

**Corregido a raíz de la revisión:**

| Regla | Qué faltaba | Arreglo |
|---|---|---|
| Acciones destructivas con confirmación | Quitar a una persona del equipo y quitar una cotización se hacían con un solo clic | Hoja de confirmación en las dos (la primera avisa de que se cierra su sesión) |
| Avisar antes de perder cambios | En la ficha del escandallo, salir por un enlace de la app tiraba el borrador sin avisar (solo se avisaba al cerrar la pestaña) | Los enlaces con borrador sin aceptar piden confirmar; «Cancelar» se queda con lo escrito (con prueba e2e) |
| Saltar bloques repetidos | No había «Saltar al contenido»: con teclado había que pasar por todo el menú en cada pantalla | Enlace al principio de cada pantalla, visible al tabular |
| `autoFocus` solo en escritorio | Nuevo artículo y nuevo plato abrían el teclado del móvil nada más entrar | Foco automático solo con ratón y teclado |
| Táctil | Resalte gris de iOS y retardo del doble toque | `-webkit-tap-highlight-color` y `touch-action: manipulation` |

**Decidido dejarlo como está:** imágenes sin `width`/`height` (viven en cajas de tamaño fijo: no hay saltos de diseño; CLS medido ≈ 0); `translate="no"` en la marca (la app está en castellano);
listas sin virtualizar (un restaurante tiene decenas o pocos cientos de filas; se revisará si algún negocio supera las 500); volver con el botón del navegador desde la ficha no pide confirmar (el navegador no deja interceptarlo sin trucos que dan más problemas que valor).

## 4. Rendimiento — Lighthouse móvil

Lighthouse 13.5 con su preset móvil (4G lenta simulada y procesador 4 veces más lento) sobre la build de producción local, con sesión iniciada:

| Pantalla | Rendimiento | Accesibilidad | Buenas prácticas | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| Hoy (3 pasadas) | 93 · 95 · 95 | 100 | 100 | 2,8–3,1 s | 0,000–0,001 | 52–132 ms |
| Compras | 94 | 100 | 100 | 3,0 s | 0,001 | 65 ms |
| Escandallos | 96 | 100 | 100 | 2,7 s | 0,000 | 51 ms |

- **Cumple** rendimiento ≥ 90 y CLS < 0,1. **No cumple** «LCP < 2 s» **bajo esa simulación**. Conviene decidir el umbral sobre datos reales (ver el criterio P8 de `mvp-terminado.md`).
- La cifra más grande de Hoy (el food cost del mes) es el elemento que marca el LCP: llega con los datos, que se calculan en el servidor (en el equipo local el LCP real, sin simulación, queda en torno a 0,5 s: 26 ms hasta el primer byte y ~0,5 s hasta pintarla).
  Con Neon en producción añadirá la latencia de la base de datos.
- Oportunidades que da Lighthouse: hoja de estilos que bloquea el pintado (~0,4 s) y JavaScript sin usar (27 KB de unos 160 KB comprimidos, ~0,3–0,4 s). Se ha descartado `inlineCss` (experimental en Next 16): la hoja pesa 18 KB comprimida y en una app que se usa a diario
  la caché del navegador compensa más que ahorrar un viaje en la primera visita.
- Esta medición **no sustituye** a la de producción: Vercel Speed Insights o Lighthouse sobre el dominio real, desde un equipo con acceso.

## 5. Coherencia entre pantallas — `coherencia.mjs`

Seis comparaciones con los datos de ejemplo, todas iguales: avisos de precio (menú = Avisos = Compras = Proveedores), platos fuera de objetivo (menú = Escandallos = Avisos), bajo mínimo (menú = Inventario),
gasto de 30 días (Compras = Proveedores), food cost de la carta (Escandallos = Carta) y food cost del mes en curso (Hoy = Ventas). Resultado: **6/6**.

## 6. Corregir y borrar — `correcciones.mjs`

11 pasos sobre una cuenta nueva con datos de ejemplo, cada uno con su comprobación en la base de datos: proveedor con albaranes (se niega y dice por qué), proveedor nuevo (se crea y se elimina), artículo en uso (se niega y dice en qué plato),
artículo nuevo (se crea y se borra), plato (se duplica y la copia se borra sin tocar el original), elaboración en uso (se niega), línea de inventario (se quita sin borrar el artículo), importación de ventas (se borra y **el stock vuelve a como estaba**),
documento por revisar (se descarta y no se guarda ninguna compra), cotización (se añade y se quita) y equipo (anular una invitación; quitar a un miembro **le cierra la sesión**). Resultado: **11/11**.
Junto con `borrado.mjs` (albaranes) y `flujos.mjs` (datos de ejemplo y negocio entero) queda cubierto el criterio P5 de `mvp-terminado.md`.

## 7. Lo que no se ha podido medir desde aquí

- Lighthouse y tiempos reales sobre el dominio de producción (el entorno de desarrollo no llega a él).
- Lectura de albaranes con documentos reales (hay casos sintéticos; faltan tus albaranes y aprobar el gasto de API).
- Un lector de pantalla real y personas usando la app por primera vez.
- Copias de seguridad y búsqueda de secretos en el historial (Área B del plan).
