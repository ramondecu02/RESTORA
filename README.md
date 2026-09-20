# RESTORA — web de presentación + captación de socios fundadores

Landing de una página, bilingüe (**ES / CA**) y con tema **claro/oscuro**, para
RESTORA: la capa de inteligencia de negocio y *food cost* para restaurantes
profesionalizados de Cataluña.

> Tesis de marca: **"Cada venta genera inteligencia de negocio."**
> Diferenciador: el **benchmark sectorial anónimo**.

Este repositorio es la implementación de producción del *design handoff*
(`RESTORA.dc.html`). Recrea la UI en alta fidelidad y añade la funcionalidad de
**captación de leads** con una **lista de próximos clientes** para el equipo.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tokens de diseño como variables CSS, tema claro/oscuro)
- **Prisma 6** + **PostgreSQL** (Vercel Postgres / Supabase / Neon)
- Fuentes autoalojadas con `next/font`: Inter (UI) e Instrument Serif (titulares)
- Desplegable en **Vercel**

## Qué incluye

- **Landing** (secciones 1–10): hero con tarjeta-instrumento, problema, escalera
  de valor (N1/N2/N3), por qué + franja *benchmark*, manifiesto, ICP, precios
  (3 planes + programa socio fundador), credibilidad y CTA final.
- **i18n por ruta**: `es` (por defecto) y `ca`; `/` redirige según cookie /
  `Accept-Language`. Todo el copy vive en `lib/dictionaries.ts`.
- **Tema claro/oscuro**: variables CSS + `data-theme`, persistido en
  `localStorage`, respeta `prefers-color-scheme` en la primera visita, sin
  parpadeo (script bloqueante).
- **Formulario de lead** que **persiste** en la base de datos (no solo estado de
  éxito): validación en cliente y servidor, *honeypot* anti-spam y rate-limit.
- **Panel de leads** protegido (`/<locale>/admin`): tabla ordenada por fecha,
  filtro por ciudad y estado, buscador por nombre, contadores (total y nuevos
  esta semana), **exportación CSV** y detalle con **notas editables** y **cambio
  de estado**.
- **Brand board** interno en `/<locale>/marca` (opcional para el público, según
  el handoff).
- Placeholders legales honestos en `/<locale>/legal/{privacidad,rgpd}`.

## Puesta en marcha (local)

Requisitos: Node 20+ y una base de datos PostgreSQL (incluida vía Docker).

```bash
# 1. Variables de entorno
cp .env.example .env
#    edita ADMIN_EMAIL, ADMIN_PASSWORD y AUTH_SECRET (openssl rand -base64 32)

# 2. Base de datos local (o apunta DATABASE_URL a la tuya)
docker compose up -d

# 3. Dependencias (genera el cliente de Prisma automáticamente)
npm install

# 4. Aplica migraciones
npm run db:deploy

# 5. (Opcional) datos de ejemplo
npm run db:seed

# 6. Arranca
npm run dev        # http://localhost:3000
```

## Variables de entorno

| Variable              | Descripción                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`        | Cadena de conexión PostgreSQL.                                     |
| `ADMIN_EMAIL`         | Email del único usuario admin.                                     |
| `ADMIN_PASSWORD`      | Contraseña del admin.                                              |
| `AUTH_SECRET`         | Secreto para firmar la cookie de sesión (mín. 16 car.; usa 32+).   |
| `NEXT_PUBLIC_SITE_URL`| URL pública del sitio (canonical / hreflang / OpenGraph / sitemap). Por defecto `https://restoraapp.app`. |

## Rutas

**Público**

- `GET /` → redirige a `/es` o `/ca`
- `GET /es`, `GET /ca` — home
- `GET /<locale>/{funcionalidades,como-funciona,precios,preguntas,sobre-nosotros,contacto}`
- `GET /<locale>/{aviso-legal,privacidad,cookies,rgpd}` — legales (datos de empresa pendientes, no inventados)
- `GET /<locale>/marca` — brand board interno (noindex)
- `GET /sitemap.xml`, `GET /robots.txt` — generados por `app/sitemap.ts` y `app/robots.ts`
- `GET /recursos/checklist-food-cost-{es,ca}.pdf` — lead magnet de la newsletter

**API**

- `POST /api/leads` — **público**. Valida, inserta, responde `201`. Honeypot + rate-limit.
- `GET /api/leads` — **protegido**. Lista con filtros `?city=&status=&q=`.
- `PATCH /api/leads/:id` — **protegido**. Cambia `status` / `notes`.
- `GET /api/leads/export.csv` — **protegido**. Exporta (respeta los filtros).

**Admin** (protegido por sesión)

- `GET /<locale>/admin/login`
- `GET /<locale>/admin/leads`
- `GET /<locale>/admin/leads/:id`

## Acceso al panel

Ve a `/es/admin` e inicia sesión con `ADMIN_EMAIL` / `ADMIN_PASSWORD`. La sesión
es una cookie `httpOnly` firmada (HMAC-SHA256 con `AUTH_SECRET`), válida 7 días.
No hay gestión de usuarios: un solo admin, según el handoff.

## Modelo de datos (`leads`)

| Columna      | Tipo        | Notas                                     |
| ------------ | ----------- | ----------------------------------------- |
| `id`         | uuid (pk)   | `gen` en la app                           |
| `created_at` | timestamptz | por defecto ahora                         |
| `restaurant` | text        | requerido                                 |
| `role`       | text        | `jefe_cocina` \| `gestor` \| `propietario`|
| `city`       | text        | requerido                                 |
| `pos`        | text?       | TPV actual (nullable)                      |
| `lang`       | text        | `es` \| `ca`                              |
| `status`     | text        | `nuevo` \| `contactado` \| `descartado`   |
| `notes`      | text?       | notas internas                            |
| `source`     | text        | por defecto `landing`                     |

Los valores permitidos se validan en la capa de aplicación
(`lib/validation.ts`, `lib/types.ts`), como indica el handoff (columnas `text`).

## Scripts

| Script             | Acción                                    |
| ------------------ | ----------------------------------------- |
| `npm run dev`      | Desarrollo (http://localhost:3000)        |
| `npm run build`    | Build de producción                       |
| `npm run start`    | Sirve el build                            |
| `npm run lint`     | ESLint                                     |
| `npm run db:deploy`| Aplica migraciones (`prisma migrate deploy`) |
| `npm run db:migrate`| Crea/aplica migración en dev             |
| `npm run db:seed`  | Inserta leads de ejemplo                   |
| `npm run db:studio`| Prisma Studio                              |

## Despliegue (Vercel)

1. Configura las variables de entorno (`DATABASE_URL` a Vercel Postgres / Neon /
   Supabase, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`,
   `NEXT_PUBLIC_SITE_URL`).
2. `npm install` ejecuta `prisma generate` (hook `postinstall`).
3. Aplica migraciones contra la BD de producción: `npx prisma migrate deploy`.
4. `next build` genera estáticamente la landing y deja admin/API como dinámicos.

> `proxy.ts` (antes *middleware*) corre en el runtime de Node.js y se encarga
> del redirect de idioma en `/` y de proteger `/<locale>/admin`.

## Notas de diseño (fidelidad)

- Tokens de color, tipografía, radios y sombras tomados del handoff
  (`lib/dictionaries.ts` para el copy, `app/globals.css` para los tokens).
- **Big Shoulders Display** se sirve como **Big Shoulders**: Google consolidó la
  familia y esta es su equivalente actual.
- El **brand board** se movió a `/marca` (interno), como sugiere el handoff.
- **Placeholders honestos**: no se inventan logos, reseñas ni cifras de clientes.

## Estructura

```
app/
  [locale]/            # layout raíz (html lang, fuentes, tema) + landing
    marca/             # brand board interno
    legal/[slug]/      # legales (placeholder)
    admin/             # login, leads, detalle + server actions
  api/leads/           # POST público, GET/PATCH/export protegidos
components/            # nav, footer, secciones, formulario, admin
lib/                   # dictionaries, types, db, leads, auth, session, csv…
prisma/                # schema, migraciones, seed
proxy.ts               # redirect de idioma + guard de admin
```
