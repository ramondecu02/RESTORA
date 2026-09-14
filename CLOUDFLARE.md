# Desplegar la landing en Cloudflare Pages (enlace para el mailing)

Esto publica **solo la landing** (estática, bilingüe, claro/oscuro) con el
formulario de socio fundador guardando en **Cloudflare D1** y avisando por
**email** (Resend). El panel `/admin` y Postgres son aparte (Vercel).

Cómo funciona: `npm run build:cf` genera un export estático en `out/`
(reusando el mismo código de la web) y `functions/api/leads.js` atiende
`POST /api/leads` en Cloudflare.

## Ya está hecho
- **D1 creada**: `restora-leads` (id ya puesto en `wrangler.toml`).
- **Esquema aplicado** en esa base (tabla `leads`).

## Pasos para publicar (una vez)

```bash
# 0) Autenticar wrangler con tu cuenta Cloudflare (abre el navegador)
npx wrangler login

# 1) Generar la landing estática
npm run build:cf            # crea ./out

# 2) Primer deploy (crea el proyecto Pages "restora-web")
npx wrangler pages deploy   # usa wrangler.toml: out/ + functions/ + binding D1
```

Al terminar te da la URL pública, del tipo **`https://restora-web.pages.dev`**.
La raíz redirige a `/es` (ver `public/_redirects`).

**Enlace para el mailing:** `https://restora-web.pages.dev/es`
(o `/ca` para catalán). Si conectas un dominio propio: Pages → *Custom domains*.

## Email de aviso (opcional pero recomendado)

El formulario **funciona y guarda en D1 sin esto**; los secretos solo activan el
aviso por correo.

```bash
# Clave de https://resend.com (API Keys)
npx wrangler pages secret put RESEND_API_KEY
# Email donde quieres recibir los avisos
npx wrangler pages secret put LEAD_NOTIFY_TO
```

- Remitente: por defecto `onboarding@resend.dev` (en pruebas Resend solo entrega
  a tu propio email de la cuenta). Para enviar a cualquier dirección, verifica un
  dominio en Resend y descomenta `LEAD_NOTIFY_FROM` en `wrangler.toml`.

## Binding de la base de datos

`wrangler.toml` ya declara el binding `DB → restora-leads`, que se aplica al
desplegar. Si en el panel no apareciera: Pages → **restora-web** → Settings →
**Bindings** → D1 → `DB` = `restora-leads`.

## Ver / exportar los leads

```bash
# Listar
npx wrangler d1 execute restora-leads --remote \
  --command "SELECT created_at, restaurant, role, city, pos, lang, status FROM leads ORDER BY created_at DESC"

# Exportar a CSV
npx wrangler d1 execute restora-leads --remote --json \
  --command "SELECT * FROM leads ORDER BY created_at DESC" > leads.json
```

También desde el panel: **Cloudflare → Storage & Databases → D1 → restora-leads → Console**.

## Actualizar la web (redeploy)

```bash
npm run build:cf && npx wrangler pages deploy
```

## Alternativa: deploy desde GitHub
Cloudflare Pages → *Create project* → *Connect to Git* → repo `RESTORA`:
- **Build command:** `npm run build:cf`
- **Output directory:** `out`
- Añade el binding D1 y los secrets en Settings (como arriba).

## Notas
- Anti-spam: honeypot + límite de 5 envíos/60 s por IP (en la Function).
- La landing es 100% estática (rápida y barata); ideal para una campaña.
