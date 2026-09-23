# RESTORA · app de producto

Control de costes para cocinas: el restaurante sube una foto de sus albaranes, la app los lee con Claude, actualiza los precios de sus artículos y, con los escandallos, le dice cuánto le cuesta cada plato, qué subidas de precio le afectan y qué platos le hacen ganar o perder dinero.

Esta carpeta es la app (Next.js). La web pública está en la raíz del repositorio y se despliega por separado.

## Qué hace

| Área | Pantallas | Lo esencial |
| --- | --- | --- |
| Alta | Registro, verificación por código, bienvenida, briefing (3 pasos), local, proveedores, tour | Multi-negocio desde el primer día: cada cuenta crea su negocio y su local. |
| Hoy | Panel, avisos | Food cost de la carta, tarjetas con tendencia, subidas de precio con su impacto en € y en food cost, stock bajo mínimo, margen por familia, aportación por plato, primeros pasos. |
| Compras | Albaranes y facturas, subir, apuntar a mano, revisar | Lectura con Claude (Sonnet 5 y repaso con Opus 5 si la lectura sale dudosa), revisión por nivel de confianza, cruce de IVA, coincidencia aproximada con tus artículos, detección de duplicados, borrar un albarán deshace precios y stock. |
| Artículos | Lista, ficha, nuevo | Precio medio ponderado, historial de precio, comparativa de proveedores con impacto en el food cost, precio de referencia anónimo de otros restaurantes (mínimo 5), dónde se usa. |
| Proveedores | Comparativa, ficha | Ahorro posible por cambiar de proveedor, contacto directo (WhatsApp, email). |
| Inventario | Almacén, pedidos | Stock, consumo y mínimo editables en línea, cobertura en días, pedido sugerido por proveedor (lo envías tú por WhatsApp o email), recibir pedido o registrarlo como factura, mermas. |
| Escandallos | Platos, elaboraciones, ficha | Recetas con sub-recetas, merma por ingrediente, borrador con «Aceptar cambios» y valoración antes/después, PVP sugerido por food cost objetivo, reventa (coste ⇄ margen ⇄ PVP), menús. |
| Carta | Rejilla visual, subir carta, carta imprimible | Fotos de plato, lectura de la carta con Claude, carta en PDF desde el navegador. |
| Ventas | Rentabilidad, importar CSV | Ingeniería de menú (estrellas, caballos de batalla, enigmas, perros), importación de ventas del TPV con memoria de nombres, descuento de inventario. |
| Cuenta | Mi local, equipo, facturación, más | Roles (propietario, responsable de costes, cocina), invitaciones, Stripe opcional, datos de ejemplo, borrar el negocio. |

## Técnica

- **Next.js 16** (App Router, server actions, `proxy.ts`) y **React 19**. Sin librería de componentes: CSS propio con tokens, modo claro/oscuro y consultas de contenedor.
- **PostgreSQL** (Neon en producción) con **Row Level Security** en las 17 tablas de negocio. Toda consulta de datos de un negocio pasa por `withTenant()` (`src/server/db.ts`): transacción, rol sin privilegios `restora_app` (sin `BYPASSRLS`) y `app.tenant_id`. Aunque una consulta olvide un `WHERE`, la base de datos no devuelve datos de otro negocio.
- **Claude** (`@anthropic-ai/sdk`) para leer albaranes y cartas con salida estructurada (Zod). Se registra modelo, tokens, coste y tiempo de cada lectura.
- **Vercel Blob** (privado) para fotos y PDF; en local, disco (`.storage/`). Los archivos se sirven por `/api/archivos/…` comprobando el negocio.
- **Resend** para el correo; en local los correos se guardan en la base y se ven en `/dev/correo`.
- **Stripe** opcional (Checkout, portal del cliente y webhook idempotente).

```
db/migrations/        SQL versionado (se aplica con npm run migrate y en cada build)
scripts/              migraciones, catálogo, documentos de ejemplo
src/app/(auth)        registro, entrada, verificación, contraseña, invitaciones
src/app/(onb)         alta guiada
src/app/(app)         la app (Hoy, Compras, Artículos, Proveedores, Inventario, Escandallos, Carta, Ventas, Cuenta)
src/app/(print)       carta imprimible
src/app/api           subida de documentos, archivos, búsqueda, fotos, webhook de Stripe
src/server            base de datos, sesión, permisos, correo, archivos, OCR, dominio (costes, compras, avisos…)
src/lib               cálculo puro (costes, PMP, unidades, coincidencias, CSV, formato) — probado con Vitest
tests/unit            pruebas unitarias
tests/e2e             pruebas de extremo a extremo con Playwright + comprobaciones en la base de datos
docs/                 despliegue, decisiones pendientes y fricciones
```

## En local

Requisitos: Node 20.9 o superior y PostgreSQL 16.

```bash
cd producto
npm install
cp .env.example .env.local      # y ajusta:
#   DATABASE_URL=postgres://usuario:clave@localhost:5432/restora_dev
#   AUTH_SECRET=<openssl rand -hex 32>
#   APP_URL=http://localhost:3100
#   EMAIL_PROVIDER=dev           (los correos se ven en /dev/correo)
#   OCR_PROVIDER=mock            (lecturas de ejemplo; pon ANTHROPIC_API_KEY para leer de verdad)
npm run migrate
npm run dev                     # http://localhost:3100
```

Para explorar sin subir nada: Cuenta → **Cargar datos de ejemplo** (seis meses de compras, platos con foto, inventario y ventas). Se quitan igual y lo que hayas creado tú se queda.

## Pruebas

```bash
npm run lint && npm run typecheck && npm test     # lint, tipos y 44 pruebas unitarias
npm run e2e                                       # con la app arrancada (dev o build + start)
```

`npm run e2e` ejecuta, contra `E2E_BASE` (por defecto `http://localhost:3100`):

1. **Alta y primer albarán** — registro, código, briefing, local, tour y lectura del albarán de ejemplo con sus decisiones.
2. **Recorrido** — las 26 pantallas con datos de ejemplo en móvil (390 px) y escritorio (1280 px): respuesta 200, sin errores de consola y sin desbordamiento horizontal. Guarda capturas en `tests/e2e/shots/`.
3. **Flujos** — editar stock, preparar pedido, aceptar cambios en un escandallo, subir carta, importar ventas, borrar un albarán (revierte stock), invitar a cocina y comprobar sus permisos, quitar datos de ejemplo y eliminar el negocio; cada paso se comprueba en la base de datos.
4. **Aislamiento (RLS)** — crea dos negocios reales y verifica 161 casos: en las 17 tablas, el negocio A no puede leer, cambiar, borrar ni crear filas del negocio B; sin contexto no se ve nada; el rol de la app no accede a contraseñas ni sesiones; y por HTTP las páginas y archivos de B devuelven 404 a A.

Necesitan Chromium (Playwright) y acceso a la base de datos (`DATABASE_URL`) para leer los códigos de verificación del buzón de pruebas.

## Despliegue

Ver [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md). Decisiones de negocio pendientes en [docs/DECISIONES.md](docs/DECISIONES.md) y fricciones detectadas en [docs/FRICCIONES.md](docs/FRICCIONES.md).
