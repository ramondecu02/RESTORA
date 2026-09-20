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

## Formularios: qué llega a D1

`POST /api/leads` acepta tres tipos (`kind`) desde la web:

| kind         | Origen                                   | Campos obligatorios                |
| ------------ | ---------------------------------------- | ---------------------------------- |
| `demo`       | Formulario de /contacto (por defecto)    | restaurant, role, city             |
| `mensaje`    | Contacto rápido del pie de página        | name, email, message               |
| `newsletter` | Bloque "checklist de food cost"          | email, consent                     |

Las filas usan las columnas `kind`, `name` y `email`. La Function las **añade
sola** la primera vez que las necesita (`ALTER TABLE`), pero puedes migrar a
mano si prefieres:

```bash
npx wrangler d1 execute restora-leads --remote --file=./cloudflare/migrations/0002_contact_kinds.sql
```

Para los tipos `mensaje` y `newsletter` las columnas antiguas obligatorias se
rellenan con marcadores legibles (`restaurant` = nombre o "Newsletter",
`city` = "—", `role` = el propio `kind`). El aviso por email lleva `reply_to`
con el correo del visitante para responder con un clic.

## HTTPS, cabeceras y caché

- **http → https**: lo hace Cloudflare en el borde. Comprueba que esté activo
  *SSL/TLS → Edge Certificates → Always Use HTTPS* (y el modo *Full (strict)*).
- **HSTS y cabeceras de seguridad**: `public/_headers` (se copia a `out/`)
  añade `Strict-Transport-Security`, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`, además de caché
  larga para `/_next/static/*` e imágenes. Cuando todos los subdominios sirvan
  HTTPS, añade `; preload` y registra el dominio en hstspreload.org.

## robots.txt y sitemap.xml

- `app/robots.ts` → `/robots.txt` (permite todo, bloquea `/marca`, `/admin` y
  `/api`, y referencia el sitemap).
- `app/sitemap.ts` → `/sitemap.xml` con todas las rutas públicas en `/es` y
  `/ca` y sus `hreflang`.
- El **robots.txt gestionado por Cloudflare** (bloque `Content-Signal` con las
  señales search / ai-input / ai-train) se antepone en el borde al fichero que
  sirve el origen. Tras desplegar, abre `https://restoraapp.app/robots.txt` y
  comprueba que aparecen **los dos bloques**; si solo saliera el de Cloudflare,
  desactiva "Managed robots.txt" en *AI Audit* y copia esas líneas en
  `app/robots.ts` (campo `other` de la regla `*`).
- Envía el sitemap en Google Search Console una vez publicado.

## Imágenes responsive

`npm run build:cf` ejecuta `scripts/gen-image-variants.mjs`, que genera
`public/images/_w/<nombre>-<ancho>.webp` (ignorado por git) y
`lib/image-loader.ts` sirve el tamaño adecuado a cada pantalla. No hace falta
tocar nada al añadir una foto: basta con dejarla en `public/images/*.webp`.

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
- Anti-spam: honeypot + límite de 5 envíos/60 s por IP (en la Function), para
  los tres formularios.
- `NEXT_PUBLIC_SITE_URL` no es necesaria en producción: por defecto la web usa
  `https://restoraapp.app` para canonical, hreflang, Open Graph y sitemap.
- La landing es 100% estática (rápida y barata); ideal para una campaña.
