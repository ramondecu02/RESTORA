# Decisiones de negocio pendientes de confirmar

Todo esto está implementado con un valor por defecto razonable. Cada punto dice qué hay ahora, por qué, y qué cambiar si decides otra cosa.

## 1. Coste de la lectura de albaranes

- **Ahora**: primera lectura con Claude Sonnet 5 (esfuerzo bajo). Si sale dudosa, repaso con Claude Opus 5. Sin límite mensual por negocio; solo un freno de 80 documentos por hora contra abusos.
- **Coste estimado**: ≈ 0,05 $ por albarán de media (0,03–0,05 $ sin repaso; 0,10–0,15 $ más si hay repaso). Un restaurante con 60 albaranes al mes: ≈ 3 $/mes. Con los precios actuales de la API (Sonnet 5: 2 $/10 $ por millón de tokens; Opus 5: 5 $/25 $). Hay que confirmarlo con documentos reales: la consulta está en `DESPLIEGUE.md`, paso 5.
- **A decidir**: ¿incluido sin límite en la cuota (como dice ahora Facturación: «sin límite razonable de uso») o con un tope por plan? Alternativas: Opus 5 siempre (más fiable, ≈ 2–3 veces más caro) o repasar menos (más barato, más líneas para revisar a mano). Se cambia con `OCR_MODEL`, `OCR_ESCALATE_MODEL` y `OCR_EFFORT`, sin tocar código.

## 2. Precio, prueba y qué pasa al terminarla

- **Ahora** (decidido en octubre de 2026): 14 días de prueba con todo incluido (`TRIAL_DAYS`), sin tarjeta. Al terminar la prueba sin suscripción, o con la suscripción cancelada, **la app se bloquea**: cualquier pantalla lleva a «/bloqueado» (suscribirse o, sin Stripe configurado, contacto para activarla) y solo quedan la cuenta (exportar datos, borrar el negocio, salir) y la facturación. Los tres últimos días de prueba hay aviso arriba. **Un cobro fallido no bloquea de golpe: se avisa desde el primer día (barra de arriba y Facturación, con los días que quedan) y a los 5 días de impago la app se bloquea** (decidido el 5/10/2026; `past_due_since` en `organizations`, `DIAS_DE_GRACIA` en `src/server/plan.ts`). Al pagar, vuelve al momento. El precio lo defines en Stripe (la web aún anuncia «desde 89 €/mes» y una oferta de fundador: se retira en la Task 26 del plan).
- **A decidir**: ¿Precio con o sin IVA en la pasarela (Stripe Tax)? ¿La oferta de fundador como cupón de Stripe? ¿Aviso por correo antes de que termine la prueba?

## 3. Capa anónima de precios de referencia

- **Ahora**: cada precio de un albarán **real** (nunca los de ejemplo) de un producto del catálogo se guarda sin nombre de negocio, con un identificador cifrado irreversible, la semana y la provincia (dos primeras cifras del código postal). La ficha del artículo muestra el rango que pagan otros restaurantes **solo si hay al menos 5 negocios distintos** en las últimas 12 semanas, sin contar el tuyo, y cada negocio pesa lo mismo.
- **A decidir**: está activa por defecto para todos. Hay que mencionarla en las condiciones y en la política de privacidad; si prefieres pedir permiso expreso, hace falta un interruptor en Cuenta (no está hecho).

## 4. Pedidos a proveedores

- **Ahora**: la app calcula el **pedido sugerido** (lo que falta para cubrir dos semanas con el consumo previsto) y lo agrupa por proveedor, pero **no envía nada**: el usuario lo manda él por WhatsApp o email con el texto ya preparado, o lo guarda. Cumple la regla de «nada se pide solo».
- **A decidir**: si algún día quieres envío directo (email desde la app al proveedor), es un cambio pequeño; lo dejamos fuera a propósito.

## 5. Roles

| | Propietario | Responsable de costes | Cocina |
| --- | --- | --- | --- |
| Compras, artículos, inventario, escandallos | ✓ | ✓ | ✓ |
| Editar proveedores | ✓ | ✓ | ver |
| Precios de carta, ventas y rentabilidad | ✓ | ✓ | — |
| Datos del local, equipo, facturación, datos de ejemplo, borrar el negocio | ✓ | — | — |

- **A decidir**: ¿la cocina debe ver el coste de cada plato (escandallos)? Ahora sí, porque es quien los mantiene. Se cambia en `src/server/rbac.ts`.

## 6. Catálogo e IVA de compra

- **Ahora**: 283 productos habituales con su tipo de IVA por categoría (4 %, 10 %, 21 %), incluido el 21 % de los refrescos con azúcar o edulcorantes desde 2021. En cada línea del albarán la app compara el IVA impreso con el esperado; si no coinciden, pregunta, y lo que confirmes se queda en el artículo.
- **A decidir**: que un asesor fiscal revise el catálogo (casos frontera: zumos con o sin azúcar, cerveza sin alcohol, productos preparados).

## 7. Datos y privacidad

- **Ahora**: cada negocio puede descargar sus datos en CSV (Cuenta → Tus datos) y borrar el negocio entero con sus archivos. Siguiendo la guía, los datos viven en la UE (Neon y funciones de Vercel en Frankfurt); las fotos se envían a la API de Claude para leerlas (según las condiciones comerciales de Anthropic, los datos de la API no se usan para entrenar modelos).
- **A decidir**: texto de la política de privacidad (encargados: Vercel, Neon, Anthropic, Resend, Stripe) y cuánto tiempo guardar las fotos de los albaranes (ahora, hasta que el usuario borre el albarán o el negocio).

## 8. Decisiones del propietario (5 de octubre de 2026)

Respuestas a las decisiones D1–D6 del plan (`docs/superpowers/plans/2026-10-05-restora-roadmap.md`), con sus palabras:

- **Precios (D1) — pendiente.** «Para el tema de precios como producto hay que calcular qué comisión se llevaría Stripe por los cobros mensuales, y el coste por local
  aproximado sobre la API de Claude y la inteligencia.» → Hecho en [`PRECIOS-Y-COSTES.md`](PRECIOS-Y-COSTES.md) (Stripe ≈ 2,8–3,8 % del precio sin IVA al mes; IA ≈ 5 € por local y mes
  en un restaurante típico, 1,5–20 € según volumen). Faltan la elección de planes, nombres y precios.
- **Prueba gratuita (D3):** se mantienen los **14 días**.
- **Impago (D4):** se **bloquea a los 5 días de impago** (no 7). **Hecho**: el aviso empieza el primer día y a los 5 días la app lleva a «No hemos podido cobrar tu suscripción» (pagar, descargar los datos o salir). Faltan los correos de cobro fallido y los reintentos propios (Task 23 del plan).
- **«Inteligencia» (D6):** se hace lo propuesto: **«Avisos» pasa a ser el centro de inteligencia** (priorizado por impacto en euros, con acción directa). Hoy no usa IA; si se le añade
  un modelo de lenguaje, el coste es ~0,45 € por local y mes.
  Los avisos se pueden **dar por resueltos o ignorar** (con «Deshacer» y una pestaña de cerrados para reabrirlos): dejan de contar en el menú, en Hoy y en la lista de abiertos, y **se reabren solos si el precio de ese artículo vuelve a cambiar** (el aviso es el último cambio de precio; tabla `avisos_estado`, migración `0009`).
- **Marca y redes (D5):** «redes sociales e imagen de marca se tienen que crear»: **no existen todavía**. La web no debe enseñar enlaces a redes hasta que existan; se prepara un kit
  de marca (avatar, portadas, imagen para compartir) para crearlas.
- **Web:** cambiar el teléfono (falta el número nuevo) y **rellenar la web con imágenes generadas**. Las imágenes generadas se usan como ambientación y producto, nunca como retratos de
  clientes o de equipo («testimonios» con caras inventadas) ni sellos de confianza.

## 9. Aislamiento entre negocios: revisión de los usos de `sys()` (5 de octubre de 2026)

**Qué es `sys()`.** `withTenant()` (`src/server/db.ts`) es la única vía para consultar datos de un negocio: abre una transacción, cambia al rol `restora_app` (sin `BYPASSRLS`) y fija `app.tenant_id`, así que las políticas RLS filtran por negocio aunque una consulta olvide su `WHERE`. `sys()` es la transacción **sin** ese rol ni filtro, para lo que no pertenece a un negocio: cuentas, sesiones, códigos, invitaciones, el propio negocio, el catálogo y los contadores. Cada uso de `sys()` es, por tanto, un sitio donde el aislamiento depende del código y no de la base de datos, y por eso se ha revisado uno por uno.

**Cuántos hay.** 56 llamadas fuera de `db.ts` (el plan decía 54; se contaron de nuevo con el analizador de `scripts/audit-tenancy.mjs`). Ninguna toca una tabla con `tenant_id`.

| Categoría (clasificación automática) | Usos | Qué son |
| --- | --- | --- |
| Solo tablas globales sin datos de negocio | 4 | Catálogo base (`getCatalog`), contadores de límite (`rateLimit`), registro de correos enviados (`sendEmail`) y el buzón de pruebas `/dev/correo` |
| Filtrado por la sesión | 35 | Cuentas y negocios acotados por `ctx.tenantId`, `ctx.userId` o `s.userId` (o por un parámetro que los llamadores sacan de ahí) |
| Por credencial o dato público, antes de tener sesión | 17 | Entrar, registrarse, códigos de verificación, restablecer contraseña, token de invitación, cookie de sesión y eventos de Stripe firmados |
| Otros / tablas de negocio | 0 | — |

**Revisión a mano** (la clasificación automática es una ayuda; esta es la comprobación de verdad):

| Archivo | Usos | Qué hace y por qué no cruza negocios |
| --- | --- | --- |
| `server/session.ts` | 7 | Sesiones por el **hash del token de la cookie** (leer, renovar, cerrar), por `userId` (cerrar las de una persona: lo llaman `cambiarPassword` y `cerrarOtrasSesiones` con `ctx.userId`, y el restablecer con un código ya validado) y `setSessionOrg`, que solo llaman `cambiarNegocio` (tras comprobar que es miembro), `crearNegocio` (negocio recién creado) y `aceptarInvitacion` (invitación válida de su email). `pickOrg` elige entre las membresías de esa persona |
| `server/ctx.ts` | 2 | `getOrg` busca el negocio por **membresía del usuario de la sesión**; `sessions.org_id` solo sirve para ordenar: aunque apuntara a un negocio ajeno no se devolvería (`fugas.mjs` lo fuerza en la base y lo comprueba). `userOrgs` lista los negocios de esa persona |
| `server/ratelimit.ts`, `server/email.ts`, `server/queries/catalog.ts` | 3 | Tablas globales sin datos de negocio |
| `server/queries/invitations.ts` | 1 | `findInvitation(token)`: por hash del token. Devuelve el nombre del negocio a quien tiene el token, que es lo previsto |
| `server/billing.ts` | 8 | Siete por `orgId`, que pasan `irAPagar`, `irAPortal` y `eliminarNegocio` con `ctx.tenantId` (propietario). El webhook (`handleWebhook`) solo actúa sobre eventos con firma de Stripe válida y vuelve a leer el estado en Stripe; la pista `org_id` del evento solo adopta un negocio que aún no tiene cliente |
| `(auth)/actions.ts` | 13 | Alta pública (crea persona, negocio y membresía propietario), códigos de la persona (`issueCode`, `checkCode`), entrar y recuperar por email, restablecer con código, cambiar el email de una cuenta aún sin verificar (`s.userId`), `crearNegocio` (solo si la persona no tiene ninguno; bloquea su fila) y `cambiarNegocio` (comprueba la membresía) |
| `(auth)/invitacion/*` | 4 | Aceptar una invitación exige el **token** y que el email de la sesión sea el invitado (`fugas.mjs` prueba que un usuario de otro negocio no puede aceptarla, ni reenviando el formulario de otra persona). Nueva cuenta: se crea con el email de la invitación |
| `(app)/cuenta/actions.ts` | 10 | Todo con `ctx.tenantId` o `ctx.userId` y el permiso `usuarios`, `facturacion` o `local:editar`: equipo (`org_id = ctx.tenantId` también al revocar, cambiar rol y quitar; el equipo se bloquea para que nunca se quede sin propietario), contraseña y perfil, y borrar el negocio (exige ser propietario y escribir su nombre) |
| `(app)/cuenta/usuarios/page.tsx`, `(app)/hoy/page.tsx` | 2 | Miembros e invitaciones con `org_id = ctx.tenantId` |
| `(app)/prefs-actions.ts` | 2 | Preferencias del usuario de la sesión |
| `(onb)/actions.ts` | 3 | Briefing, nombre y fin del alta del negocio de la sesión (`requireOnboarding`) |
| `dev/correo/page.tsx` | 1 | Lee los correos de **todos** los negocios: solo existe con `EMAIL_PROVIDER=dev` y, en producción, con `ALLOW_DEV_MAILBOX=1`; si no, 404. Ver la observación 1 |

**Cómo se mantiene.** `node scripts/audit-tenancy.mjs` (también `npm run audit:tenancy`) se ejecuta en cada `npm run build` justo después de las migraciones y **falla el despliegue** si una tabla con `tenant_id` no tiene RLS activada y forzada con políticas que filtren por `app.tenant_id` en leer, crear, cambiar y borrar; si una tabla sin `tenant_id` no está en la lista `GLOBALES` del script (con su motivo); si `restora_app` salta RLS o puede tocar las tablas sensibles; si una vista, una vista materializada o una función `SECURITY DEFINER` se salta RLS sobre tablas de negocio; o si un `sys()` toca una tabla de negocio. Un `sys()` que no encaja en ninguna categoría no rompe el build pero sale marcado «otros» y `tests/unit/tenancy-audit.test.ts` falla hasta que se revise y se clasifique: toda consulta nueva fuera de `withTenant()` pasa por una revisión como la de arriba. Salida de emergencia, deliberada y ruidosa: `SKIP_TENANCY_AUDIT=1`.

**Observaciones de la revisión** (ninguna es una fuga hoy; se dejan anotadas):

1. **`/dev/correo`** enseña los correos, con sus códigos, de todos los negocios. Está cerrado en producción salvo que se active a propósito (`ALLOW_DEV_MAILBOX=1` con `EMAIL_PROVIDER=dev`); la auditoría avisa en el build si eso ocurre en producción de Vercel. La comprobación del paso 9 de `DESPLIEGUE.md` («devuelve 404») sigue siendo obligatoria.
2. **Las claves foráneas no pasan por RLS** (PostgreSQL comprueba la integridad referencial sin aplicar las políticas): con el contexto del negocio A se puede insertar una fila propia que referencie el id de un artículo del negocio B, y la fila de B quedaría protegida contra su borrado. Requiere conocer un UUID aleatorio de B, que nunca se muestra a otros negocios, y el código valida que cada id pertenezca al local antes de usarlo, así que no es explotable desde la app; el cierre de fondo sería usar claves foráneas compuestas `(tenant_id, id)` (cambio grande, para hacerlo junto con la RLS por local del punto B5 del plan).
3. **`restora_app` conserva escritura sobre `catalog_categories`, `catalog_items` y `bench_price_obs`**: la migración 0003 dio permisos a todas las tablas y la 0005 solo retiró los de las sensibles. `bench_price_obs` la necesita (capa anónima); el catálogo no (se rellena con migraciones). Una migración que revoque `insert, update, delete` sobre el catálogo lo cerraría; no se ha hecho aquí.

## Fuera de alcance en esta versión

- Integración directa con TPV (se importan ventas en CSV, que exportan casi todos).
- Envío automático de pedidos a proveedores (a propósito, ver punto 4).
- Varios locales por negocio en la interfaz (la base de datos ya lo admite).
- Recibir albaranes por email reenviado o desde WhatsApp.
- Exportación contable (A3, Sage, Holded), Verifactu o SII.
- App nativa y modo sin conexión (es una web que funciona en el móvil con la cámara).
- Borrar la propia cuenta de usuario sin borrar el negocio (se hace por soporte).
- Interruptor para no participar en la capa anónima (punto 3).
