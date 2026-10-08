# Traspaso de sesión (8 de octubre de 2026)

> Para quien retome el trabajo en una sesión nueva. Léelo entero antes de tocar nada. Lo dejó la sesión «(RESTORA) Auditoría de aislamiento contra Neon» cuando su contexto pasó de la mitad.
> Es un documento vivo: quien lo use debe actualizarlo (o sustituirlo) cuando deje otro traspaso.

## 0. Primeros pasos en la sesión nueva, en este orden

1. `git fetch origin claude/new-session-c92ohx && git checkout claude/new-session-c92ohx && git pull --ff-only origin claude/new-session-c92ohx` y `git log --oneline -8`. Arriba tiene que estar «Facturación: sin Stripe se ven los tres planes y cada uno pide el plan por WhatsApp» (`552c57f`) o algo posterior.
2. **Comprobar el despliegue:** `gh api repos/ramondecu02/RESTORA/commits/<sha>/status` (`gh` funciona en este entorno; debe salir `success`). Vercel despliega esta rama en Producción con cada push. La migración `0013_planes.sql` (autorizada por el propietario el 8/10) se aplica sola en el build. El propietario dijo que en su pantalla de Facturación seguía saliendo la versión vieja («hasta 1.500 al mes», sin «Uso de este mes»): pedirle Ctrl+F5 y que confirme que ve los tres planes con botones «Pedir Premium/Pro/Max». Si sigue viejo, que mire en Vercel → Deployments que el último esté en Production «Ready» y que su registro diga «aplicada 0013_planes.sql».
3. **Pasar la batería completa de pruebas con la versión final** (la última pasada se hizo con el bloque `plan` desactualizado; ya está corregido): ver sección 5 (hace falta `AUTH_SECRET` y `OCR_PROVIDER=mock`, o fallan la ficha del artículo, los albaranes y la concurrencia sin que sea un fallo de la app). Mirar con navegador `/cuenta/facturacion` con Stripe apagado (3 planes + «Pedir …» a WhatsApp) y con Stripe de mentira (ver sección 5).
4. **Neon, tabla `playing_with_neon`:** la auditoría de aislamiento (`producto/scripts/audit-tenancy.mjs`) sigue en modo aviso (`--aviso` en el script `build` de `producto/package.json`) porque Neon tiene una tabla de ejemplo que no es nuestra. Está declarada en `GLOBALES`, pero en una base local el rol `restora_app` recibe permisos por defecto sobre ella y la auditoría estricta daría 8 fallos de privilegios. Solución sin migración: que el propietario ejecute en la consola SQL de Neon `drop table playing_with_neon;`. Después, quitar `--aviso`, comprobar que Vercel pasa en estricto (leer el registro con él si falla). Si prefiere migración, usar la `0014` (la `0011` y la `0012` son del Área C) y pedirle antes su visto bueno.
5. Solo entonces, lo de la sección 4 según lo que responda el propietario.

## 1. Reglas fijas

- **Título de cada conversación:** empieza por «(RESTORA)» y sigue con la función o tarea de ese chat, por ejemplo «(RESTORA) Planes, cobro y varios locales». Quien abra la conversación lo pone; la sesión puede renombrarse con `set_session_title`.
- **Traspaso:** cuando el contexto pase del 50 % (`get_session` → `context_usage`: usados frente a máximo), dejar este documento al día, subirlo y **abrir tú misma la conversación siguiente** (`create_session`, con título «(RESTORA) …» y su tarea). El propietario lo ha pedido así.
- **Idioma:** el propietario escribe en español: contestar en español, sin suponer el género de nadie (usar «tú» y formas neutras).
- **Rama:** trabajar solo en `claude/new-session-c92ohx`. No abrir pull request salvo que lo pida. No empujar a ninguna otra rama. Cada `git add` con rutas explícitas, nunca `-A`. El hook de parada exige dejar todo confirmado y subido: no dejar cambios sin commit ni commits sin empujar al terminar un turno.
- **Commits:** mensaje en español, estilo «Web: …», «Área B: …», «Artículos: …». Terminan con las dos líneas de atribución que indique el entorno (`Co-Authored-By` y `Claude-Session`). No poner identificadores de modelo en nada que se suba.
- **Next.js de este repositorio no es el que conoces** (`AGENTS.md`): antes de escribir código de Next, leer la guía pertinente en `node_modules/next/dist/docs/` (en `producto/` y en la raíz hay un `node_modules` cada uno; hacen falta `npm ci` en ambos en un contenedor nuevo).
- **Solo con orden expresa del propietario:** publicar la web (`actualizar-restora.bat`, opción P: lo ejecuta él en su equipo), pasar Stripe a producción, activar publicidad, gastar dinero o escribir a terceros. **Migraciones nuevas:** el despliegue las aplica solo a producción; pedir antes su visto bueno (la `0013` ya está autorizada y aplicada).
- **Nunca inventar** precios, cifras de ahorro, límites, nombres de plan, clientes, premios ni datos fiscales. Lo decidido por el propietario está en la sección 3. `tests/web/no-founder.test.ts`, `tests/web/promesas.test.ts` y `tests/web/precios.test.ts` vigilan lo que la web puede decir (varios locales solo puede salir «en desarrollo» hasta que exista).
- **Asesor fiscal:** no soy asesor; en temas de alta de autónomo, IVA, facturas, sociedades en el extranjero, recomendar al gestor y citar fuentes.

## 2. Dos productos en un repositorio

- **Web de marketing (raíz):** Next con exportación estática (`npm run build:cf` → `out/`) para Cloudflare Pages. La publica solo el propietario con el `.bat`. Textos en `lib/site-copy.ts` y `lib/copy/*.ts` (castellano y catalán). Pruebas: `npm run test:web` (21). QA: `npm run build:cf && npm run qa:web -- --rapido`.
- **App (`producto/`):** Next 16 + React 19 + PostgreSQL 16 con RLS. Vercel la despliega con cada push (`npm run build` = migraciones + auditoría de aislamiento + `next build`). Neon, Blob privado y Resend en producción. **Stripe implementado pero apagado**: sin las variables, la suscripción se activa a mano.

## 3. Estado al dejar este traspaso

### Decisiones del propietario de esta sesión
- **Planes (8/10/2026), precios SIN IVA (el IVA se cobra aparte):** Premium 49,90 €/mes (1 local) · Pro 89,90 €/mes (2 locales) · Max 149,90 €/mes (5 locales). **Anual:** 490,90 / 839,90 / 1.390,90 €. **Cupo de lecturas con IA al mes**, compartido por los locales del plan: 80 / 250 / 450, con aviso al 80 %. Prueba gratuita de 14 días con cupo de 100 lecturas. Detalle y márgenes: `producto/docs/PRECIOS-Y-COSTES.md` (apartado 6) y `producto/docs/DECISIONES.md` (puntos 12 y 13).
- **Margen siempre sobre la base imponible (sin IVA).** El precio de venta se escribe sin IVA.
- **No tiene alta de autónomo ni empresa todavía**: Stripe real, cobros y factura no se activan hasta entonces. Se le explicó que una OÜ o LTD no le evita el problema si vive y trabaja en España, y que RevenueCat no aporta para una web B2B; la vía más sencilla es autónomo con tarifa plana (confirmar con gestor).

### Hecho en esta sesión (todo subido y desplegado en Producción salvo lo que indica la sección 0)
- **Artículos** (`producto/src/app/(app)/articulos/`): lista interactiva en cliente (`lista.tsx`): búsqueda y orden al momento, pestañas Cocina/Bebidas/Otros, desplegable de tipo, filtros rápidos, grupos plegables y «mostrar más». **Margen de productos que se venden tal cual** (vino, cerveza, licor, bebida, refresco; `src/lib/venta-articulo.ts`): editor de PVP sin IVA y margen enlazados en la propia fila; crea/actualiza una receta `reventa` enlazada (`fijarVentaArticulo`), por lo que sale en Ventas y Carta; cajas y barriles repartidos entre sus ventas (`raciones`).
- **Planes y cobro** (`producto/src/lib/planes.ts`, `server/billing.ts`, `server/ratelimit.ts`): migración `0013` (`organizations.plan_tier`, `plan_interval`); cupo en `topeDeLecturas(tenantId, org)`; Facturación con selector mensual/anual, uso del mes y locales; sin Stripe, los planes llevan a WhatsApp («Pedir Premium/Pro/Max») y se activan a mano con el SQL de `DESPLIEGUE.md`; con Stripe, un precio por plan y periodo en variables `STRIPE_PRICE_<PLAN>_<MONTH|YEAR>` (el antiguo `STRIPE_PRICE_ID` vale como Premium mensual); el webhook guarda el plan según el precio cobrado; el cambio de plan se hace desde el portal de Stripe.
- **Web:** página de Precios con los tres planes (cupos, locales «en desarrollo», precio anual, «+ IVA»). `wrangler.toml` apunta ya a la base D1 `restora-leads` con id `c957c4ed-9ef4-4b8c-9fde-16b56b9319fd`. **El propietario aún tiene que publicar la web** (`.bat` → V para verla, P para publicar) y, después, comprobar la tabla `leads` en D1 (`npx wrangler d1 execute restora-leads --remote --command "SELECT name FROM sqlite_master WHERE type='table'"`; si no sale, `--file=./cloudflare/schema.sql`), añadir el dominio `restoraapp.app` en Pages → Custom domains y volver a poner los secretos `RESEND_API_KEY` y `LEAD_NOTIFY_TO`. Hizo falta usar `cmd` o `npx.cmd` porque PowerShell bloquea `npx.ps1`.
- **Auditoría de aislamiento:** `playing_with_neon` declarada en `GLOBALES` (commit `6a46bb2`), pendiente lo de la sección 0.4.

## 4. Lo que queda

### Siguiente trabajo de producto (sin esperar al propietario)
1. **Varios locales (B4–B6, Tasks 15–17 de `docs/superpowers/plans/2026-10-05-restora-roadmap.md`)**: la app gestiona un local por negocio (`loadLocal` toma el primero). Pro permite 2 y Max 5: construir alta de locales con el límite de `localesDe(org)`, selector de local activo, panel conjunto y aislamiento (RLS por negocio ya existe; revisar `sys()` y `tests/e2e/fugas.mjs`). Mientras no exista, la web y Facturación lo marcan «próximamente / en desarrollo».
2. **Funcionalidades de Pro y Max** (a decidir con el propietario, propuesta en `PRECIOS-Y-COSTES.md`): comparador de proveedores con propuesta de pedido, informe mensual PDF, previsión de compras, exportación contable y API, roles por local. Hoy los tres planes tienen las mismas funciones y solo cambian cupo y locales.
3. **Botón de administración** para activar un plan sin SQL (opcional; lo ofrecí).
4. IVA de venta por producto de reventa: hoy el local tiene un solo `iva_venta`; el margen ya no depende de él, pero el PVP con IVA que se guarda para carta es aproximado en alcohol (21 %). Ofrecer resolverlo.

### Espera al propietario (no avanzar sin su respuesta)
- **Alta de autónomo** (o sociedad) y datos fiscales (razón social, NIF, domicilio; las páginas legales dicen «Pendiente de completar»), **teléfono nuevo** (la web lleva +34 640 648 985), perfiles de redes, vídeo. Con el alta: cuenta de Stripe, 3 productos y 6 precios sin IVA, webhook, variables y prueba con `4242 4242 4242 4242` (`DESPLIEGUE.md`, sección 8). Preguntas pendientes: Stripe Tax o IVA fijo del 21 %; SEPA desde el principio (no contestó); cómo facturar (Stripe no emite facturas válidas en España).
- Calidad y coste de la lectura de albaranes con albaranes reales y `ANTHROPIC_API_KEY` (≈ 8 céntimos por albarán). `MAX_LECTURAS_MES` ya solo es freno de emergencia.
- Ensayar la restauración en Neon y la copia fuera de Neon/Blob (`producto/docs/COPIAS-Y-RESTAURACION.md`, `RENDIMIENTO.md`).
- Confirmar frases de la web (`docs/AUDITORIA-CONVERSION.md`, apartado 3), firmar `docs/superpowers/mvp-terminado.md`, publicar la web.
- Las pruebas de 14 días de los primeros negocios caducan unos 14 días después de registrarse (hay uno que acaba el 13 de octubre): hace falta poder activar su plan a mano o tener Stripe. Avisarle si se acerca.

## 5. Cómo probar sin pisar a nadie

**Postgres de pruebas.** Si `service postgresql start` y las credenciales `restora:restora` no valen (en la sesión anterior no valían, y entrar como `postgres` fue bloqueado por permisos), crear un clúster propio, que sí funciona: usuario del sistema sin privilegios, `initdb` en `/var/lib/scratchpg` (no en `/tmp/claude-0`: el entorno le cambia los permisos y el clúster muere), puerto 5544:

```bash
useradd -M -s /bin/bash scratchpg; mkdir -p /var/lib/scratchpg && chown scratchpg /var/lib/scratchpg
runuser -u scratchpg -- /usr/lib/postgresql/16/bin/initdb -D /var/lib/scratchpg/data -U restora --auth=trust
runuser -u scratchpg -- /usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/scratchpg/data -o "-p 5544 -k /var/lib/scratchpg -c listen_addresses=127.0.0.1 -c max_connections=300" -l /var/lib/scratchpg/log start
psql -h 127.0.0.1 -p 5544 -U restora -d postgres -c "create database restora_a10"
```

**App en una base aparte** (no tocar `restora_dev`):

```bash
cd producto && npm ci
export DATABASE_URL=postgres://restora@127.0.0.1:5544/restora_a10 AUTH_SECRET=$(openssl rand -hex 32) OCR_PROVIDER=mock
npm run build                                   # migra, audita y compila
ALLOW_DEV_MAILBOX=1 nohup npx next start --port 3101 > /var/lib/scratchpg/next.log 2>&1 &
E2E_BASE=http://localhost:3101 node tests/e2e/run.mjs                      # 15 bloques, ≈ 15 min
ONLY=plan,cuenta-ui E2E_BASE=http://localhost:3101 node tests/e2e/run.mjs  # solo algunos bloques
```

**Sin `AUTH_SECRET`** la ficha del artículo da 500 y fallan fugas; **sin `OCR_PROVIDER=mock`** fallan los bloques de albaranes (`calidad`) y la concurrencia. Para ver Facturación con pagos «activos» (sin cobrar nada): arrancar además con `STRIPE_SECRET_KEY=sk_test_fake` y los `STRIPE_PRICE_*` inventados.

Antes de dar por buena una tarea de `producto/`: `npx tsc --noEmit`, `npx eslint src`, `REQUIRE_DB_TESTS=1 npx vitest run` (428 pruebas) y el e2e completo (la sesión anterior solo vio fallos esperados de `plan` por el cambio de cupo; ya corregidos en `tests/e2e/plan.mjs`). Para parar tu servidor: `fuser -k 3101/tcp`.

**Web:** `npm ci` en la raíz, `npm run test:web` (21), `npm run build:cf`, `npm run qa:web -- --rapido`. Para una captura de `out/` hay que servirla con la ruta `/es/precios.html` y hacer scroll para que salgan los bloques con animación.

**Al añadir código nuevo en `producto/`:**
- `tests/e2e/fugas.mjs` falla ante una acción de servidor nueva sin clasificar: añadirla a `CASOS` o a `SIN_IDS`.
- `tests/unit/carga-copias.test.ts` falla si cambian las consultas de Compras o las de sesión y negocio: actualizar las copias de `tests/carga/consultas-*.mjs` (se hizo con la consulta de `getOrg`).
- Una tabla nueva con `tenant_id` necesita RLS activada y forzada con política `tenant_isolation`; una tabla sin `tenant_id` hay que justificarla en `GLOBALES`.
- Los nombres de migración siguen el orden (`0013` es la última); `0011` y `0012` son del Área C.

## 6. Limpieza del entorno

El clúster de pruebas, el servidor del puerto 3101 y el usuario `scratchpg` son del contenedor y desaparecen con él. Queda por limpiar las copias de trabajo de ramas `fix/*` antiguas (`git worktree list`).

## 7. Trampas conocidas

- `pkill -f` y `ps | grep` con un patrón literal pueden encontrar la propia línea de órdenes y matar la consola (código 144): usar corchetes (`pgrep -f "[n]ext start"`) o matar por puerto con `fuser -k`. No lanzar `pkill` junto con otras órdenes en la misma línea.
- No reconstruir (`npm run build`) mientras una batería e2e usa el servidor: se rompe a mitad. Esperar o usar otro puerto.
- Turbopack falla con un `node_modules` enlazado simbólicamente desde fuera de la raíz: para una copia de trabajo, copiar con enlaces duros (`cp -al`).
- Una caché de servidor estático que no distinga por fecha del archivo sirve la compilación anterior tras reconstruir.
- Un elemento que anima desde `opacity: 0` no cuenta para el LCP hasta que se repinta: las animaciones de la primera pantalla empiezan en `0.01` (`app/globals.css`).
- El componente `Icon` pisa su clase `ic` si se le pasa `className`: pasar `className="ic otra"`.
- Nada de crear cuentas ni lanzar e2e contra una base compartida mientras otro la usa.

## 8. Siguiente conversación

- **Título:** «(RESTORA) Planes, cobro y varios locales».
- **Primer mensaje:** «Lee docs/superpowers/traspaso-de-sesion.md entero y empieza por la sección 0 (comprobar el despliegue de Facturación y pasar la batería completa). Después seguimos con varios locales (Pro 2, Max 5) y las funcionalidades de Pro y Max.»
- Las siguientes, según lo que decida el propietario: «(RESTORA) Activar Stripe y primer cobro» (cuando tenga el alta), «(RESTORA) Publicar la web», «(RESTORA) Coste y calidad de la lectura de albaranes».
