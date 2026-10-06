# Criterios de «MVP terminado» (Task 11 del plan) — propuesta para tu revisión

> Hasta que firmes este documento no se activa ninguna publicidad (directriz del 5/10/2026: *planificada, no activada*). Cada criterio se comprueba con una orden o una prueba
> concreta, no con una opinión. Lo que ya está verde lo digo con su cifra; lo que no se puede medir desde aquí lo digo también, con lo que hace falta para medirlo.
> Última comprobación: 5 de octubre de 2026, sobre la rama `claude/new-session-c92ohx`.

## Cómo se firma

1. Lees la tabla y cambias lo que no te convenza (un criterio que no quieras, un umbral que veas flojo).
2. Marcas abajo «Aprobado» con la fecha.
3. Cuando todas las filas de «Producto» estén en ✓ y las de «Para vender» tengan su respuesta, el MVP se considera terminado y se desbloquea la Task E4 (activar anuncios), que seguirá necesitando tu orden y un presupuesto.

## Producto (lo que hace la app)

| # | Criterio | Cómo se mide | Hoy |
|---|---|---|---|
| P1 | Nada se rompe al cambiar el código | `tsc`, `eslint` y las 409 pruebas unitarias (con las de base de datos temporal, `REQUIRE_DB_TESTS=1`) sin errores | ✓ |
| P2 | Los flujos reales funcionan de punta a punta | `node tests/e2e/run.mjs`: 15 bloques en verde (alta y primer albarán, recorrido de 52 pantallas, flujos con base de datos, aislamiento entre negocios, fugas entre negocios, prueba y bloqueo (con el tope mensual de lecturas), calidad de lectura, borrado de albaranes, corregir y borrar, Hoy, pantallas renovadas, Mi local y Más, coherencia entre pantallas, matriz de anchos y accesibilidad) | ✓ |
| P3 | La interfaz no se rompe en ningún ancho | `matriz.mjs`: 26 pantallas × 360 · 390 · 768 · 1093 · 1280 · 1440 px sin desbordes, sin controles tapados, sin textos cortados y sin errores de consola | ✓ 156/156 |
| P4 | Accesible (WCAG 2.2 AA) | `a11y.mjs` (axe-core): 0 violaciones serias o críticas en 29 pantallas, en claro y oscuro, móvil y escritorio (116 análisis); el foco se ve y no queda tapado al tabular; «Saltar al contenido» en toda pantalla con menú. Falta una prueba con un lector de pantalla real | ✓ automática · ✗ lector de pantalla |
| P5 | Todo lo que se introduce se puede corregir o borrar, con aviso de lo que afecta | `borrado.mjs` (albaranes, con el impacto en precio medio, stock y ventas), `correcciones.mjs` (proveedor, artículo, plato, elaboración en uso, línea de inventario, importación de ventas con su stock, documento por revisar, cotización, invitación y miembro del equipo) y `flujos.mjs` (datos de ejemplo y negocio entero). Lo que está en uso se niega y dice dónde | ✓ |
| P6 | La misma cifra sale igual en todas las pantallas que la enseñan | `coherencia.mjs`: avisos de precio (menú, Avisos, Compras, Proveedores), platos fuera de objetivo (menú, Escandallos, Avisos), bajo mínimo (menú, Inventario), gasto de 30 días (Compras, Proveedores), food cost de la carta (Escandallos, Carta) y food cost del mes (Hoy, Ventas) | ✓ 6/6 |
| P7 | Lectura de albaranes: al menos el 95 % de las líneas bien (cantidad, precio, importe y unidad) y como mucho un 1 % de errores **sin avisar** | 30 albaranes reales (foto y PDF) de al menos 5 proveedores, con su transcripción correcta hecha a mano, pasados por la lectura con `npm run eval:lectura` (instrucciones y formato en `producto/tests/eval/README.md`). Separa el error que la lectura avisa (la persona lo revisa) del que no avisa (el peligroso) | ✗ **No medible hoy**: solo hay casos sintéticos. La herramienta está lista y probada contra la lectura simulada; faltan tus albaranes y aprobar el gasto de API (≈ 2,4 € las 30, hasta 4,5 €) |
| P8 | Rápida en el móvil | Lighthouse móvil de Hoy: rendimiento ≥ 90 y CLS < 0,1; y **LCP ≤ 2,5 s con datos reales de usuarios** (Vercel Speed Insights, percentil 75). *(El plan decía «LCP < 2 s»; bajo la simulación de Lighthouse —4G lenta y procesador 4 veces más lento— no sale, y 2,5 s es el umbral «bueno» de Google. Te propongo este cambio.)* | ◐ En local: rendimiento 93–95, CLS 0,000–0,001, LCP 2,8–3,1 s simulado (≈ 0,5 s sin simular). Falta medirlo sobre producción, desde un equipo con acceso al dominio. Detalle en `informes/2026-10-05-qa-transversal.md` |
| P9 | Una persona nueva llega sola de «crear la cuenta» a su primer escandallo en < 10 min | 3 pruebas con dueños o encargados de restaurante reales, cronometradas y sin ayuda | ✗ **Necesita personas**; el recorrido automático (`smoke.mjs`) comprueba que se puede, no cuánto tarda alguien que lo ve por primera vez |
| P10 | Cuenta, Mi local, Facturación y fichas de detalle con el mismo sistema que el resto | Revisión visual en 390 y 1280 px y pasar P3 y P4 | ◐ Mi local, Más y las fichas de artículo y proveedor ya lo cumplen (`cuenta-ui.mjs`); Facturación se completa con los planes (D1) |

## Seguridad y datos

| # | Criterio | Cómo se mide | Hoy |
|---|---|---|---|
| S1 | Un negocio no puede ver datos de otro | `rls.mjs` (169 comprobaciones sobre las tablas de negocio con dos negocios reales), `fugas.mjs` (678: rutas, archivos, búsqueda, exportaciones, 49 acciones de servidor, invitaciones y cambio de negocio con los ids del otro negocio) y la auditoría de `npm run build` (`audit-tenancy.mjs`: RLS activada y forzada con políticas en toda tabla de negocio, los 56 usos de `sys()` clasificados) | ◐ En local, todo ✓. La auditoría del build arranca en **modo aviso** hasta leer su informe contra Neon (estricta, falló el despliegue): ver `producto/docs/DESPLIEGUE.md` |
| S2 | Se puede recuperar la base de datos | Restaurar una copia de Neon (punto en el tiempo) en una rama y comprobar que arranca la app | ◐ Documentado (`producto/docs/COPIAS-Y-RESTAURACION.md`, lista del ensayo en `producto/scripts/restore-drill.md`); falta ensayarlo con la cuenta de Neon y anotar los tiempos reales |
| S3 | Sin secretos en el repositorio | Búsqueda de secretos sobre todo el historial; claves solo en las variables de entorno de Vercel | ✗ Pendiente de pasar la búsqueda completa (Área B) |
| S4 | Los correos de la app llegan | Alta, verificación y recuperación probadas con el dominio de envío real (Resend) | ✗ Pendiente de comprobar con un buzón real |

## Para vender (no bloquean el producto, sí la venta)

| # | Criterio | Cómo se mide | Hoy |
|---|---|---|---|
| V1 | Cobro mensual correcto | Stripe en modo prueba con relojes: alta, primer cobro, cobro fallido, **bloqueo a los 5 días**, reactivación al pagar y cancelación | ✗ Espera a **D1** (planes y precios). El bloqueo a los 5 días ya está hecho y probado en local |
| V2 | Datos fiscales y legales verdaderos | Razón social, NIF, domicilio y régimen de IVA en aviso legal, privacidad, cookies, términos y factura | ✗ Espera tus datos |
| V3 | La web describe lo que existe | Sin lenguaje de «fundadores/beta», sin funciones que no estén, sin «comparar entre locales» mientras no haya varios locales (D2) | ✗ Área D, espera a D1 y D2 |
| V4 | Marca y contacto reales | Teléfono nuevo en la web y en la app; perfiles de redes creados; imágenes de relleno colocadas | ✗ Espera el número y las imágenes |

## Qué NO exige el MVP

App nativa, varios locales por negocio (D2: V1 con un restaurante por negocio), inteligencia con IA generativa más allá de la lectura de albaranes (D6: «Avisos» es el centro de inteligencia y no usa IA) y publicidad de pago.

## Aprobación

- [ ] Aprobado por el propietario — fecha: ____________
