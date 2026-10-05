# Encargo del 5 de octubre de 2026 (texto del propietario, sin cambios)

> Este documento es la especificación de la que cuelga el plan `docs/superpowers/plans/2026-10-05-restora-roadmap.md`.
> Es lo que pidió el propietario, copiado literalmente. Donde el plan y este texto discrepen, manda este texto.

## Fase 0 — Instala las skills de desarrollo (antes de tocar nada más)

```
npx skills add https://github.com/anthropics/skills --skill frontend-design
npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max
npx skills@latest add emilkowalski/skills
npx skills add vercel-labs/agent-skills
npx skills add https://github.com/obra/superpowers --skill writing-plans
npx skills add https://github.com/obra/superpowers --skill subagent-driven-development
```

Úsalas así: `frontend-design` y `ui-ux-pro-max` para todo el trabajo visual de este sprint (Fase 2). `emilkowalski/skills` para
animaciones y microinteracciones (transiciones de los gráficos, números animados, estados de carga) — nada estático.
`vercel-labs/agent-skills` donde aplique a la implementación. `writing-plans` antes de ejecutar la Fase 3 (el roadmap
completo). `subagent-driven-development` para repartir la Fase 3 en subagentes paralelos por área.

## Fase 1 — Bugs críticos de datos (bloqueante: resuélvelo antes o en paralelo a la Fase 2; no tiene sentido pulir visualmente un dashboard si los números de debajo pueden estar corruptos)

1. **No se pueden borrar albaranes** — es lo más urgente: si algo se introduce mal, ahora mismo no hay forma de corregirlo y
   descuadra todo lo real (PMP, stock, escandallos). No lo resuelvas como un DELETE simple: al borrar/anular un albarán hay que
   revertir su efecto en el PMP (recalcular sin esa línea), revertir el movimiento de stock que generó, y avisar explícitamente si
   algún `coste_snapshot` de una venta ya se calculó con ese precio (para que el usuario sepa qué queda afectado antes de
   confirmar). Pide confirmación explícita — es una acción que toca datos históricos.
2. Corrige los descuadres de layout que hay en la pantalla de «hacer escandallo» — revisa alineación de columnas, inputs y
   totales; compáralo con el resto de la app para que sea consistente.
3. El tutorial de bienvenida no se ve con claridad y no está bien encajado visualmente con el resto — revísalo contra los tokens
   de marca (verde #1E3D2F / #3E8E6A / #14201A / #F5F6F3, tipografía Inter) y corrígelo para que se sienta parte de la misma app,
   no un añadido.

## Fase 2 — Renovación de interfaz (prioridad ahora mismo), empezando por el Dashboard

Objetivo: que la app entera se sienta como la herramienta de un equipo de software dedicado a contabilidad y analítica para
empresas — profesional, dinámica, con sensación de estar viva, no una colección de tarjetas estáticas. Usa `frontend-design`,
`ui-ux-pro-max` y `emilkowalski/skills` para esto.

Empieza por «Hoy» (el dashboard). Ya tiene una base sólida que no hay que tirar — gauge de food cost con objetivo,
margen/ventas/ticket medio/comensales con tendencia, aviso accionable arriba («Lubina fresca ha subido un 9 %…»), gráfico de
food cost de la carta, margen por familia, aportación por plato, stock que pide atención. Eleva eso, no lo sustituyas:

- Más jerarquía visual: que se note de un vistazo qué requiere atención hoy vs qué es solo información de fondo.
- Comparativas de periodo (vs mes anterior, vs objetivo) con indicadores claros de tendencia, no solo el número suelto.
- Animación con propósito: transiciones suaves en los gráficos al cambiar de mes, números que cuentan en vez de aparecer de
  golpe, skeleton states mientras carga — nunca animación decorativa sin motivo.
- Estados vacíos y de carga cuidados (un restaurante nuevo con pocos datos no debe ver una pantalla rota o vacía).
- Interactividad real: que los gráficos y tarjetas sean explorables (hover con detalle, clic para profundizar), no solo imágenes
  estáticas de datos.

Después de «Hoy», aplica el mismo criterio de forma consistente al resto: Carta, Escandallos, Compras, Proveedores, Inventario,
Rentabilidad, Inteligencia. No reinventes el lenguaje visual pantalla a pantalla — un único sistema de diseño coherente en toda
la app.

## Fase 3 — Roadmap completo (usa `writing-plans` antes de ejecutar y `subagent-driven-development` para repartir el trabajo)

Antes de picar código de esto, usa `writing-plans` para producir un plan por escrito que cubra:

1. **Terminar de pulir la V1 del producto funcional** — lo que ya está, más las Fases 1 y 2 de este prompt.
2. **Base de datos multi-restaurante** — ya está decidido en la arquitectura (PostgreSQL multi-tenant por fila con Row-Level
   Security, cada local como agente independiente con sus propios proveedores y precios). Esta fase es verificar que esté
   implementado de verdad, no solo diseñado, y que varios restaurantes puedan convivir sin fugas de datos entre tenants.
3. **Pasarela de pago y facturación** — Stripe (ya decidido en la arquitectura técnica). IMPORTANTE: el enfoque de pricing ha
   cambiado — ya NO hay programa de «socios fundadores» ni framing de «estamos empezando/beta». Antes de implementar los planes
   de cobro, confírmame los precios y nombres de plan definitivos (los 89 €/149 €/179 € de septiembre eran del programa de
   fundadores que ya se dejó atrás) — no asumas que siguen vigentes.
4. **Rediseño de la web de RESTORA (restoraapp.app)**, ahora enfocada a venta directa — ya no es una landing de validación con
   «primeros restaurantes fundadores», sino una web de producto terminado y de marca sólida. Esto incluye: imagen de marca y
   producto consolidada (coherente con la app ya construida: verde #1E3D2F/#3E8E6A/#14201A/#F5F6F3, Inter), y retomar +
   actualizar la auditoría de conversión ya hecha antes (sitemap, HTTPS, velocidad, chat, responsividad móvil, sección «Sobre
   nosotros», formulario de contacto, redes sociales reales, sellos de confianza verídicos, datos de contacto visibles, botón
   volver arriba, FAQs, políticas legales completas, newsletter con incentivo, botones de compartir, vídeo de presentación) —
   pero quita cualquier resto de lenguaje de «fundadores»/beta que quedara de la versión anterior.
5. **Promoción y publicidad** — plan de salida a mercado. Nota: la directriz vigente es sin publicidad hasta tener el MVP
   terminado (esto lo decidiste el 05/10) — planifica esta fase, pero no la actives todavía; dilo explícitamente en el plan.

Una vez tengas el plan escrito, repártelo con `subagent-driven-development`: un subagente por área (interfaz/producto, backend
multi-tenant, pagos y facturación, web de venta, marketing) trabajando en paralelo donde no haya dependencias entre ellos —
pero deja explícito en el plan qué bloquea a qué (por ejemplo, el multi-tenant real probablemente bloquea poder cobrar de
verdad). **Enséñame el plan completo antes de que los subagentes empiecen a ejecutar.**
