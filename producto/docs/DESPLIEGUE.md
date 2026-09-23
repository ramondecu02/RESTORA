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
4. Copias de seguridad: Neon guarda el historial para restaurar a un momento dado; el periodo depende del plan. Elige uno con al menos 7 días.

Qué hacen las migraciones (`db/migrations`, se aplican solas y en orden):
- `0001` tablas, índices y políticas RLS en las 17 tablas de negocio;
- `0002` catálogo de categorías y artículos (IVA por tipo de producto);
- `0003` rol `restora_app` sin privilegios (`NOLOGIN`, `NOBYPASSRLS`): la app cambia a él en cada transacción de negocio, así que el aislamiento funciona aunque el usuario de Neon pueda saltarse RLS;
- `0004` comprobación diferida de referencias (para borrar conjuntos de recetas y el negocio completo);
- `0005` el rol de la app no puede leer tablas globales (contraseñas, sesiones, códigos, invitaciones).

## 3. Archivos: Vercel Blob

Vercel → **Storage → Create → Blob** → conéctalo al proyecto. Añade `BLOB_READ_WRITE_TOKEN`. Los archivos se guardan como privados y solo se sirven a usuarios del negocio al que pertenecen (`/api/archivos/…`). Sin este token, en Vercel la subida falla con un error claro.

## 4. Correo: Resend

1. En resend.com, **Domains → Add domain**: `restoraapp.app` (o un subdominio como `mail.restoraapp.app`).
2. Añade en tu DNS los registros que indica (SPF y DKIM; recomendable también DMARC) y espera a que aparezca como verificado.
3. **API Keys → Create** con permiso de envío.
4. Variables: `RESEND_API_KEY`, `EMAIL_PROVIDER=resend`, `EMAIL_FROM=RESTORA <hola@restoraapp.app>` (el remitente debe ser del dominio verificado).

Con un proveedor real la app no guarda el cuerpo de los correos (llevan códigos y enlaces de un solo uso), solo destinatario, asunto y estado.

## 5. Lectura de documentos: API de Claude

1. console.anthropic.com → **API Keys → Create key**. Pon un **límite de gasto mensual** en *Limits* desde el primer día.
2. Variables: `ANTHROPIC_API_KEY`, `OCR_PROVIDER=anthropic`, `OCR_MODEL=claude-sonnet-5`, `OCR_ESCALATE_MODEL=claude-opus-5`.
3. Cómo lee: primero Claude Sonnet 5 con esfuerzo bajo; si la lectura sale dudosa (muchas líneas con poca confianza o totales que no cuadran) repasa con Claude Opus 5 y se queda con esa. Cada documento guarda modelo, tokens, coste y tiempo (`documentos.ocr_*`).
4. Sin clave, en producción la lectura queda desactivada: el documento muestra «La lectura automática no está disponible todavía» y se puede apuntar a mano. Nunca se usan datos inventados con documentos reales. Los albaranes y la carta **de ejemplo** se reconocen por su huella y se leen siempre sin llamar a la API.

Coste estimado por albarán (precios de API vigentes: Sonnet 5, 2 $/10 $ por millón de tokens de entrada/salida; Opus 5, 5 $/25 $): una foto de 10–15 líneas son unos 4–5 mil tokens de entrada y 2–3 mil de salida, **≈ 0,03–0,05 $**; si necesita repaso con Opus, **≈ 0,10–0,15 $** más. Con un 15 % de repasos, **≈ 0,05 $ de media**: un restaurante con 60 albaranes al mes gasta unos **3 $ al mes** en lectura. Compruébalo con los primeros usuarios reales:

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
| `TRIAL_DAYS` | `14` (días de prueba de cada negocio nuevo). |
| `PG_POOL_MAX` | `5` |

La lista completa, comentada, está en `producto/.env.example`.

## 7. Dominio app.restoraapp.app

1. Vercel → **Settings → Domains → Add** `app.restoraapp.app`. Vercel te dará el registro a crear, normalmente un **CNAME `app` → `cname.vercel-dns.com`**.
2. Si el DNS de `restoraapp.app` está en Cloudflare (donde está la web pública), crea el CNAME con el proxy **desactivado** («DNS only», nube gris) para que Vercel emita el certificado.
3. Espera a que el dominio aparezca como válido y con certificado. Despliega (Deployments → Redeploy) para que `APP_URL` quede aplicada.
4. En la web pública, apunta los botones «Entrar» y «Probar gratis» a `https://app.restoraapp.app/entrar` y `https://app.restoraapp.app/registro`.

## 8. Cobros con Stripe (cuando quieras cobrar)

Mientras no configures Stripe, la app no muestra avisos de pago ni bloquea nada: la sección Facturación dice que aún no se puede pagar desde ahí.

1. dashboard.stripe.com → **Products → Add product** «RESTORA» con un precio recurrente mensual. Copia el `price_…`.
2. **Developers → API keys**: la clave secreta (`sk_live_…`; empieza con la de pruebas `sk_test_…`).
3. **Developers → Webhooks → Add endpoint**: `https://app.restoraapp.app/api/stripe/webhook`, eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copia el secreto de firma `whsec_…`.
4. **Settings → Billing → Customer portal**: actívalo (cambiar tarjeta, facturas, cancelar).
5. Variables: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`. Redespliega.
6. Prueba en modo test con la tarjeta `4242 4242 4242 4242`: Cuenta → Facturación → Suscribirme; al volver, el plan debe verse «Suscripción activa».

El webhook es idempotente (cada evento se aplica una sola vez) y atómico (si algo falla, Stripe lo reintenta). Cuando termina la prueba o falla un cobro, la app muestra una barra de aviso **sin bloquear** el uso; ver `docs/DECISIONES.md`.

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
- **Pruebas antes de publicar**: `npm run lint && npm run typecheck && npm test`, y `npm run e2e` contra una copia local o de preview (ver README).
- **Privacidad**: en la política de privacidad de la web pública deben figurar como encargados Vercel, Neon, Anthropic, Resend y Stripe, y la capa anónima de precios (ver `docs/DECISIONES.md`). Borrar el negocio desde Cuenta elimina sus datos y archivos.
