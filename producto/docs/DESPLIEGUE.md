# Puesta en marcha en producción

Objetivo: la app funcionando en **https://app.restoraapp.app** con base de datos, archivos, correo, lectura de albaranes y, cuando quieras, cobros.

| Pieza | Servicio | Para qué |
| --- | --- | --- |
| Hosting | Vercel (plan Pro) | La app Next.js. El plan Hobby es solo para uso personal no comercial. |
| Base de datos | Neon (Postgres), región Frankfurt | Datos de cada negocio, aislados con RLS. |
| Archivos | Vercel Blob (privado) | Fotos y PDF de albaranes, cartas y platos. |
| Correo | Resend | Códigos de verificación, contraseñas, invitaciones. |
| Lectura | API de Claude (Anthropic) | Leer albaranes, facturas y cartas. |
| Cobros | Stripe (opcional al principio) | Suscripción con prueba gratuita. |

Tiempo estimado: una tarde. El orden importa: base de datos antes del primer despliegue (las migraciones se aplican en cada build).

---

## 1. Proyecto en Vercel

1. Vercel → **Add New… → Project** → importa el repositorio `ramondecu02/RESTORA`.
2. **Root Directory: `producto`**. Framework: Next.js (se detecta solo). Deja el comando de build por defecto (`npm run build`: aplica migraciones y compila).
3. No despliegues todavía: primero conecta la base de datos (paso 2). Si ya se desplegó, fallará el build por falta de `DATABASE_URL`; no pasa nada.
4. La región de las funciones queda fijada en Frankfurt (`fra1`) por `producto/vercel.json`, junto a la base de datos.

## 2. Base de datos: Neon

1. En el proyecto de Vercel → **Storage → Create → Neon** (o crea el proyecto en neon.tech y conéctalo). Región: **AWS Europe Central 1 (Frankfurt)**.
2. La integración añade `DATABASE_URL` (con pooler) y `DATABASE_URL_UNPOOLED` (directa). La app usa la primera; las migraciones, la segunda.
3. **Entornos de vista previa**: en la integración, activa una rama de Neon por despliegue de vista previa (o define otra `DATABASE_URL` para Preview). Si no, cada vista previa aplicaría migraciones sobre la base de producción.
4. Copias de seguridad: Neon guarda el historial para restaurar a un momento dado; el periodo depende del plan. Elige uno con al menos 7 días. El procedimiento paso a paso (recuperar un albarán borrado en una rama, sin tocar producción), el RPO/RTO y el ensayo que falta están en `docs/COPIAS-Y-RESTAURACION.md` y `scripts/restore-drill.md`: **pendiente de ensayar con tu cuenta de Neon antes de pasar Stripe a producción**. Los archivos de Blob no tienen copia.

Qué hacen las migraciones (`db/migrations`, se aplican solas y en orden):
- `0001` tablas, índices y políticas RLS en las 17 tablas de negocio;
- `0002` catálogo de categorías y artículos (IVA por tipo de producto);
- `0003` rol `restora_app` sin privilegios (`NOLOGIN`, `NOBYPASSRLS`): la app cambia a él en cada transacción de negocio, así que el aislamiento funciona aunque el usuario de Neon pueda saltarse RLS;
- `0004` comprobación diferida de referencias (para borrar conjuntos de recetas y el negocio completo);
- `0005` el rol de la app no puede leer tablas globales (contraseñas, sesiones, códigos, invitaciones).
- Las siguientes se explican en su propio archivo. `0010_indices_rendimiento.sql` solo crea índices (los que faltaban según `docs/RENDIMIENTO.md`); va sin `concurrently` porque cada migración se aplica dentro de una transacción, y con las tablas de hoy bloquea las escrituras unos milisegundos. Si alguna tabla llegara a pesar millones de filas, créese el índice antes de desplegar con `create index concurrently if not exists …` (la migración lo dará por hecho).

> **Estado actual (6/10/2026): la auditoría arranca en modo aviso** (`--aviso` en el script `build` de `package.json`). Con la opción estricta, el primer despliegue de la fusión del Área B falló en Vercel y con `--aviso` pasó, así que contra Neon la auditoría da algún problema (o no puede conectar) que aún no se ha leído: **mira el informe en Vercel → Deployments → el último → Build Logs, apartado «Auditoría de aislamiento entre negocios»**, arregla lo que diga y quita `--aviso` del script `build` para que vuelva a bloquear. Mientras tanto no bloquea nada, pero sigue sin garantizar el aislamiento en producción.

Justo después de las migraciones, `npm run build` ejecuta la **auditoría de aislamiento** (`scripts/audit-tenancy.mjs`, con la misma conexión que las migraciones). Si una tabla con `tenant_id` no tiene RLS activada y forzada con sus políticas, si una tabla nueva sin `tenant_id` no está justificada como global, si el rol de la app puede saltarse RLS o tocar las cuentas, o si un `sys()` del código toca una tabla de negocio, **el despliegue falla antes de publicar** y el registro del build dice qué tabla es y qué le falta. Qué comprueba y la revisión de los usos de `sys()`: `docs/DECISIONES.md`, apartado 9. Para ejecutarla a mano: `npm run audit:tenancy`.

## 3. Archivos: Vercel Blob

Vercel → **Storage → Create → Blob** con acceso **Private** (no se puede cambiar después) → conéctalo al proyecto. La conexión añade `BLOB_STORE_ID` y el SDK se autentica con el OIDC de Vercel, sin token fijo; los stores conectados a la antigua usan `BLOB_READ_WRITE_TOKEN`, que también vale. Los archivos se guardan como privados y solo se sirven a usuarios del negocio al que pertenecen (`/api/archivos/…`). Sin Blob conectado, en Vercel la subida falla con un error claro.

## 4. Correo: Resend

1. En resend.com, **Domains → Add domain**: `restoraapp.app` (o un subdominio como `mail.restoraapp.app`).
2. Añade en tu DNS los registros que indica (SPF y DKIM; recomendable también DMARC) y espera a que aparezca como verificado.
3. **API Keys → Create** con permiso de envío.
4. Variables: `RESEND_API_KEY` y `EMAIL_FROM=RESTORA <hola@restoraapp.app>` (el remitente debe ser del dominio verificado). Con la clave puesta, `EMAIL_PROVIDER` ya vale `resend`. Sin `EMAIL_FROM` se usa `onboarding@resend.dev`, que solo envía al email de la cuenta de Resend.

Con un proveedor real la app no guarda el cuerpo de los correos (llevan códigos y enlaces de un solo uso), solo destinatario, asunto y estado.

## 5. Lectura de documentos: API de Claude

1. console.anthropic.com → **API Keys → Create key**. Pon un **límite de gasto mensual** en *Limits* desde el primer día.
2. Variables: `ANTHROPIC_API_KEY` y `OCR_PROVIDER=anthropic`. **Deja vacías** `OCR_MODEL`, `OCR_ESCALATE_MODEL` y `OCR_EFFORT`: así se usan los valores que lleva la app (Sonnet 5.5 con esfuerzo medio y, si la lectura sale dudosa, repaso con Opus 5.5 con esfuerzo alto). Si en Vercel las tienes con valores de una versión anterior de esta guía (`claude-sonnet-5`, `claude-opus-5`, `OCR_EFFORT=low`), bórralas: son más caras o leen peor.
3. Cómo lee: primero Claude Sonnet 5.5 con esfuerzo medio; si la lectura sale dudosa (muchas líneas con poca confianza o totales que no cuadran) repasa con Claude Opus 5.5 con esfuerzo alto y se queda con esa. Cada documento guarda modelo, tokens, coste y tiempo (`documentos.ocr_*`).
4. Sin clave, en producción la lectura queda desactivada: el documento muestra «La lectura automática no está disponible todavía» y se puede apuntar a mano. Nunca se usan datos inventados con documentos reales. Los albaranes y la carta **de ejemplo** se reconocen por su huella y se leen siempre sin llamar a la API.

**Tope mensual de lecturas (freno contra un gasto desbocado).** Además del límite de gasto de la clave en Anthropic, cada negocio tiene un tope de lecturas con IA por mes natural (hora de Madrid): `MAX_LECTURAS_MES`, **1500 si no se define**, muy por encima del uso normal (unos 60 albaranes al mes). Cuentan los albaranes, facturas y cartas subidos para leer con Claude más los reintentos de «Volver a leer»; no cuentan los documentos de ejemplo, lo apuntado a mano ni los datos de ejemplo. Al llegar al tope, la pantalla de subida (albaranes y carta) deja de ofrecer subir y dice «Has llegado al máximo de lecturas automáticas de este mes (…); puedes seguir apuntando a mano tus albaranes y tus platos; si necesitas leer más, escribe a hola@restoraapp.com», y la API de subida responde 429 con ese mismo mensaje. El contador vuelve a cero el día 1. **Apuntar a mano nunca se limita.** Para bajarlo, pon la variable (un número entero) y redespliega; `0` apaga la lectura con IA para todos los negocios (interruptor de emergencia). El tope es el mismo para todos: no hay cifras por plan. Como es un freno y no una factura, puede pasarse por unas pocas lecturas si llegan varias a la vez. Quién va más lento o más cerca del tope este mes:

```sql
select o.name, count(*) as lecturas
from documentos d join organizations o on o.id = d.tenant_id
where d.source = 'ocr' and not d.demo and (d.ocr_model is null or d.ocr_model not in ('ejemplo', 'mock'))
  and d.created_at >= date_trunc('month', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'
group by 1 order by 2 desc limit 20;
```

Coste estimado por albarán (precios de API vigentes: Sonnet 5.5, 2 $/10 $ por millón de tokens de entrada/salida; Opus 5.5, 4 $/20 $; el cálculo por local está en `PRECIOS-Y-COSTES.md`): una foto de 10–15 líneas son unos 4–5 mil tokens de entrada y 2–3 mil de salida, **≈ 0,03–0,05 $**; si necesita repaso con Opus, **≈ 0,10–0,15 $** más. Con un 15 % de repasos, **≈ 0,05 $ de media**: un restaurante con 60 albaranes al mes gasta unos **3 $ al mes** en lectura. Compruébalo con los primeros usuarios reales:

```sql
select date_trunc('month', created_at) as mes, count(*) as documentos,
       round(avg(ocr_cost_usd)::numeric, 4) as coste_medio_usd, round(sum(ocr_cost_usd)::numeric, 2) as total_usd,
       count(*) filter (where ocr_model like '%repaso%') as repasos
from documentos where ocr_model is not null and ocr_model not in ('mock', 'ejemplo') group by 1 order by 1 desc;
```

## 6. Resto de variables

En Vercel → **Settings → Environment Variables** (entorno Production; Preview con sus propios valores):

| Variable | Valor |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -hex 32`. Firma la capa anónima de precios; no la cambies sin motivo (al cambiarla, durante 12 semanas cada negocio contaría como dos contribuyentes distintos). |
| `APP_URL` | `https://app.restoraapp.app` (sin barra final). Con `https`, las cookies de sesión son `Secure`. |
| `TRIAL_DAYS` | Días de prueba de cada negocio nuevo. Sin ella, `14`. Al terminar sin suscripción la app se bloquea: solo quedan facturación, la cuenta (exportar datos, borrar el negocio) y salir. |
| `PG_POOL_MAX` | `5` |
| `MAX_LECTURAS_MES` | Tope mensual de lecturas con IA por negocio. Sin ella, `1500`. Ver el paso 5. |

La lista completa, comentada, está en `producto/.env.example`.

## 7. Dominio app.restoraapp.app

1. Vercel → **Settings → Domains → Add** `app.restoraapp.app`. Vercel te dará el registro a crear, normalmente un **CNAME `app` → `cname.vercel-dns.com`**.
2. Si el DNS de `restoraapp.app` está en Cloudflare (donde está la web pública), crea el CNAME con el proxy **desactivado** («DNS only», nube gris) para que Vercel emita el certificado.
3. Espera a que el dominio aparezca como válido y con certificado. Despliega (Deployments → Redeploy) para que `APP_URL` quede aplicada.
4. En la web pública, apunta los botones «Entrar» y «Probar gratis» a `https://app.restoraapp.app/entrar` y `https://app.restoraapp.app/registro`.

## 8. Cobros con Stripe (cuando quieras cobrar)

**Hazlo antes de que terminen las primeras pruebas (14 días).** Al terminar la prueba sin suscripción la app se bloquea; mientras no haya Stripe, la pantalla de bloqueo y Facturación dan el WhatsApp y el email para activar la suscripción a mano (ver `docs/HOJA-DE-RUTA.md`).

1. dashboard.stripe.com → **Products → Add product**: crea **tres productos** («RESTORA Premium», «RESTORA Pro» y «RESTORA Max») y a cada uno **dos precios recurrentes, sin IVA**, en euros:

   | Producto | Mensual | Anual |
   |---|---:|---:|
   | Premium | 49,90 € | 490,90 € |
   | Pro | 89,90 € | 839,90 € |
   | Max | 149,90 € | 1.390,90 € |

   Copia los seis `price_…`. Pon **«Impuesto: no incluido» (exclusive)** en los seis: el IVA se añade aparte al cobrar (con Stripe Tax o con un tipo fijo del 21 %; lo decide el gestor).
2. **Developers → API keys**: la clave secreta (`sk_live_…`; empieza con la de pruebas `sk_test_…`).
3. **Developers → Webhooks → Add endpoint**: `https://app.restoraapp.app/api/stripe/webhook`, eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copia el secreto de firma `whsec_…`.
4. **Settings → Billing → Customer portal**: actívalo (cambiar tarjeta, facturas, cancelar) y permite **cambiar de plan** entre los seis precios (así se sube o baja de Premium a Pro o Max sin programar nada más).
5. Variables en Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y los seis precios: `STRIPE_PRICE_PREMIUM_MONTH`, `STRIPE_PRICE_PREMIUM_YEAR`, `STRIPE_PRICE_PRO_MONTH`, `STRIPE_PRICE_PRO_YEAR`, `STRIPE_PRICE_MAX_MONTH`, `STRIPE_PRICE_MAX_YEAR`. Solo se ofrecen en Facturación los que tengan variable. Redespliega. (El antiguo `STRIPE_PRICE_ID` sigue valiendo como Premium mensual.) **Comprueba también tus tarifas reales** en *Settings → Pricing*: `PRECIOS-Y-COSTES.md` usa las de la tarifa estándar.
6. Prueba en modo test con la tarjeta `4242 4242 4242 4242`: Cuenta → Facturación → elige un plan; al volver, debe verse «Suscripción activa» con el nombre del plan, y el cupo de lecturas del mes cambia al del plan (Premium 80, Pro 250, Max 450). Prueba también un cambio de plan desde el portal y una tarjeta que falle (`4000 0000 0000 0341`).

El webhook es idempotente (cada evento se aplica una sola vez) y atómico (si algo falla, Stripe lo reintenta). Cuando termina la prueba sin suscripción la app se bloquea; si falla un cobro, solo avisa mientras Stripe reintenta. Ver `docs/DECISIONES.md`.

### Activar un plan a mano (mientras no haya Stripe)

Facturación enseña los tres planes y cada botón abre WhatsApp con el mensaje escrito. Cuando el cliente pague por otra vía, en la consola SQL de Neon:

```sql
update organizations set plan_status = 'active', plan_tier = 'pro', plan_interval = 'month' where id = '<id del negocio>';
-- plan_tier: premium | pro | max · plan_interval: month | year · para quitarlo: plan_status = 'canceled'
```

El cupo de lecturas pasa al del plan al momento. Un negocio activado a mano sin `plan_tier` se trata como Premium (80 lecturas).

## 9. Comprobación después del primer despliegue

- [ ] `https://app.restoraapp.app/registro`: crea tu cuenta, llega el código por correo, completas el alta.
- [ ] Compras → Subir → «Probar con un albarán de ejemplo»: se lee al momento y el tutorial de revisión funciona.
- [ ] Sube un albarán real tuyo: se lee, revisas lo dudoso, guardas. Mira su coste con la consulta del paso 5.
- [ ] Cuenta → Cargar datos de ejemplo → revisa Hoy, Escandallos, Carta y Ventas → Quitar datos de ejemplo.
- [ ] Cuenta → Usuarios: invita a otro email tuyo con rol Cocina; comprueba que no ve Ventas ni Usuarios.
- [ ] `https://app.restoraapp.app/dev/correo` devuelve 404.
- [ ] Si configuraste Stripe: pago de prueba y cancelación desde el portal.

## 10. Operación

- **Logs**: Vercel → Logs. Prefijos útiles: `[accion]` (error inesperado en una acción), `[ocr]` (lectura fallida), `[correo]` (envío fallido), `[subida]`, `[archivos]`, `[db]`.
- **Actualizar**: cada push a la rama de producción despliega y aplica las migraciones nuevas. Las migraciones son solo hacia delante; para deshacer, una migración nueva.
- **Si la auditoría de aislamiento bloquea un despliegue urgente**: arregla lo que dice el registro (casi siempre, una tabla nueva sin RLS). Solo en una emergencia, y sabiendo que ese despliegue sale sin comprobar el aislamiento, se puede saltar con la variable `SKIP_TENANCY_AUDIT=1` en el despliegue (el build lo deja escrito en el registro); quítala después.
- **Pruebas antes de publicar**: `npm run lint && npm run typecheck && npm test`, y `npm run e2e` contra una copia local o de preview (ver README).
- **Privacidad**: en la política de privacidad de la web pública deben figurar como encargados Vercel, Neon, Anthropic, Resend y Stripe, y la capa anónima de precios (ver `docs/DECISIONES.md`). Borrar el negocio desde Cuenta elimina sus datos y archivos.
