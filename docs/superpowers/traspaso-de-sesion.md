# Traspaso de sesión (6 de octubre de 2026)

> Para quien retome el trabajo en una sesión nueva. Léelo entero antes de tocar nada. Lo dejó la sesión anterior cuando su contexto pasó de la mitad.
> Es un documento vivo: quien lo use debe actualizarlo (o sustituirlo) cuando deje otro traspaso.

## 0. Primeros pasos en la sesión nueva, en este orden

1. `git fetch origin claude/new-session-c92ohx && git checkout claude/new-session-c92ohx && git pull --ff-only origin claude/new-session-c92ohx`, y `git log --oneline -8`. Tiene que estar el commit «Área B … (fusión de claude/roadmap-b)» y, encima, el que añade este traspaso.
2. Mirar si Vercel desplegó bien el último commit: `gh api repos/ramondecu02/RESTORA/commits/<sha>/status` (el estado debe ser `success`). Si el build falla con la auditoría de aislamiento, leer el registro: dice qué tabla le falta qué (ver `producto/docs/DECISIONES.md`, apartado 9).
3. Si hace falta Postgres local y está parado (pasa al reiniciarse la máquina): `service postgresql start` y `pg_lsclusters` (debe decir `online`).
4. Hacer la limpieza de la sección 6.
5. Solo entonces, lo de la sección 4 según lo que responda el propietario.

## 1. Reglas fijas

- **Idioma:** el propietario escribe en español: contestar en español. Sin suponer el género de nadie (usar «tú» y formas neutras).
- **Rama:** trabajar solo en `claude/new-session-c92ohx`. No abrir pull request salvo que lo pida. No empujar a ninguna otra rama. Cada `git add` con rutas explícitas, nunca `-A`.
- **Commits:** mensaje en español, estilo «Web: …», «Área B: …». Terminan con las dos líneas de atribución que indique el entorno (`Co-Authored-By` y `Claude-Session`). No poner identificadores de modelo en nada que se suba (código, docs, commits, PR).
- **Next.js de este repositorio no es el que conoces** (`AGENTS.md`): antes de escribir código de Next, leer la guía pertinente en `node_modules/next/dist/docs/` (en `producto/` y en la raíz hay un `node_modules` cada uno).
- **Solo con orden expresa del propietario:** publicar la web (`actualizar-restora.bat`, opción P: lo ejecuta él en su equipo), pasar Stripe a producción, activar publicidad (E4 está **planificada, NO activada**), gastar dinero o escribir a terceros.
- **Nunca inventar** precios, cifras de ahorro, nombres de plan, clientes, premios ni datos fiscales. Los precios 89/149/179 € **no** se dan por válidos (D1 sin decidir). `tests/web/no-founder.test.ts` y `tests/web/promesas.test.ts` vigilan lo que la web puede decir.

## 2. Dos productos en un repositorio

- **Web de marketing (raíz):** Next con exportación estática (`npm run build:cf` → `out/`) para Cloudflare Pages. La publica solo el propietario. Textos en `lib/site-copy.ts` y `lib/copy/*.ts` (castellano y catalán). Pruebas: `npm run test:web` (19). QA completa: `npm run build:cf && npm run qa:web` (`-- --rapido` para una pasada corta); mide desbordes, imágenes rotas, consola, axe y el contraste real de los textos sobre foto.
- **App (`producto/`):** Next 16 + React 19 + PostgreSQL 16 con RLS. Vercel la despliega sola con cada push a la rama (`npm run build` = migraciones + auditoría de aislamiento + `next build`). Neon, Blob privado y Resend en producción. Stripe está implementado pero **apagado**: la suscripción se activa a mano por WhatsApp o correo.

## 3. Estado del repositorio al dejar este traspaso

- Todo lo de la web, la hoja de ruta de marketing (solo documentos), Mi local y Más y el contraste está **subido**.
- La fusión del Área B (`claude/roadmap-b`, 4 commits de otro agente) se verificó en una base aparte, con la compilación final: `tsc` y `eslint` limpios, 409 pruebas unitarias con `REQUIRE_DB_TESTS=1`, `npm run build` completo (migración `0010` aplicada y auditoría de aislamiento en verde) y e2e: los 14 bloques anteriores pasaron en una pasada completa y, tras el último cambio (el texto de Facturación), se repitieron `plan`, `cuenta-ui`, `matriz` y `a11y`: todos en verde (los 15 bloques de `tests/e2e/run.mjs`).
- Lo último que cambió en código: `producto/src/app/(app)/cuenta/facturacion/page.tsx` ya no dice «sin límite razonable de uso»: enseña el tope mensual real (`MAX_LECTURAS_MES`) o que la lectura está desactivada.

### Lo hecho en esta sesión (resumen)

**Web:** 7 de las 9 imágenes del carrusel colocadas y recortadas sin retocar el color (`docs/marketing/imagenes.md`); 2 descartadas (etiqueta con nombre y cargo de una persona; «RESTORA» rotulado en el local). Sin lenguaje de fundadores ni beta ni cifras de precio. 62 afirmaciones cruzadas con el producto y corregidas (`docs/AUDITORIA-CONVERSION.md`). Capturas reales de la app en la home y en Funcionalidades (`npm run capturas`). Datos estructurados, sitemap, canonical, hreflang y `utm_*` hasta el registro. Lighthouse móvil: home 93, Funcionalidades 98, Precios 98, Sobre nosotros 96, Contacto 97, y 100 en accesibilidad, buenas prácticas y SEO. Contraste AA en claro y oscuro: tokens `--up-ink`, `--down-ink`, `--earth-ink`, `--brand-deep` y velos `.scrim`, `.scrim-left`, `.veil-mobile` en `app/globals.css`. `playwright-core` y `axe-core` ya están en `devDependencies` de la raíz.

**App:** Mi local y Más con el sistema común (fichas, «Para dejarlo a punto», `estadoPlan()` en `producto/src/server/plan.ts`, bloque e2e `cuenta-ui.mjs`). Área B: B1 auditoría en cada build (`scripts/audit-tenancy.mjs`, salida de emergencia `SKIP_TENANCY_AUDIT=1`); B2 `tests/e2e/fugas.mjs` (678 comprobaciones; arregló una carrera entre borrar un albarán e importar ventas y dos errores 500); B3 copias y restauración **documentadas pero sin ensayar** (`producto/docs/COPIAS-Y-RESTAURACION.md`, `producto/scripts/restore-drill.md`) y tope mensual de lecturas con IA (`MAX_LECTURAS_MES`, 1.500 por defecto, 0 apaga la lectura); B7 rendimiento con 50 y 200 negocios sintéticos (`producto/docs/RENDIMIENTO.md`, migración `0010` con once índices: dar de baja un negocio pasa de 10,6 s a 0,25 s).

**Docs:** plan de marketing sin activar (`docs/marketing/salida-a-mercado.md`, `medicion.md`, `condiciones-de-activacion.md`, `materiales/`), estado de cada área en `docs/superpowers/plans/2026-10-05-restora-roadmap.md` y criterios en `docs/superpowers/mvp-terminado.md` (sin firmar).

## 4. Lo que queda

### Espera al propietario (no avanzar sin su respuesta)

- **D1, planes y precios.** Desbloquea la página de Precios (hoy sin cifras), Facturación, Stripe (Área C, migraciones `0011` y `0012` reservadas), los límites por plan y el presupuesto de marketing.
- **D2, varios locales.** Desbloquea B4–B6 (Tasks 15–17) y volver a prometer «varios locales» en la web.
- **Datos fiscales** (razón social, NIF, domicilio): las páginas legales siguen enseñando «Pendiente de completar». **Teléfono nuevo** (la web lleva el antiguo, +34 640 648 985). **Perfiles de redes.** **Vídeo** (hoy «Próximamente»).
- **Calidad y coste de la lectura de albaranes:** hacen falta albaranes reales, la `ANTHROPIC_API_KEY` como secreto del entorno y unos 5 $ de presupuesto. Estimación actual: ≈ 8 céntimos por albarán (rango 4–14 c); un Makro largo costó 12 c. El coste de salida (tokens que escribe el modelo, razonamiento incluido) pesa más que el de entrada. Ideas por medir con albaranes reales: modelo más barato primero y escalar solo si sale dudoso, texto del PDF cuando tenga capa de texto, menos razonamiento, salida más compacta. Sin datos no se prueba nada.
- **`MAX_LECTURAS_MES` (1.500 por defecto):** es un freno de emergencia, no un límite de plan. Con el coste por albarán de arriba, un negocio podría gastar hasta ~120–180 $ al mes antes de llegar al tope. Proponerle fijarlo más bajo en Vercel (por ejemplo 600) hasta que existan los planes.
- **Ensayar la restauración en Neon**, decidir si hay copia fuera de Neon y de Blob, y medir el rendimiento en Neon (procedimientos en `producto/docs/COPIAS-Y-RESTAURACION.md` y `producto/docs/RENDIMIENTO.md`).
- **Confirmar frases de la web:** «sin permanencia», «no cobramos alta», «Hecho en Cataluña» (también en el pie de la checklist en PDF), respuesta en 48 h, datos alojados en la UE (oculto), rangos de «A quién le encaja». Lista completa en `docs/AUDITORIA-CONVERSION.md`, apartado 3.
- **Firmar `docs/superpowers/mvp-terminado.md`** y decidir las cuestiones de `docs/marketing/salida-a-mercado.md`, apartado 9.
- **Pruebas de 14 días:** con Stripe apagado, las primeras caducarán unos 14 días después de los primeros registros y la suscripción se activa a mano. Avisarle si se acerca esa fecha.
- **Publicar la web:** `actualizar-restora.bat` → V para verla en local, P para publicar. Hoy se vería con páginas legales pendientes, teléfono antiguo, Precios sin cifras, vídeo «Próximamente» y sin redes. Lo decide él.

### Se puede hacer sin esperar

- **Limpieza** (sección 6).
- **Optimizaciones medidas pero sin tocar** (decisión del propietario si compensan): el marco de transacción de `withTenant()` y `sys()` son 18 de las 35 sentencias de Hoy (en Neon cada una es un viaje, estimado ≈ 150 ms), y `efectoCambio()` recalcula todas las recetas por aviso (≈ 190 ms de procesador en un negocio grande). Detalle en `producto/docs/RENDIMIENTO.md`.
- **Facturación** (`producto/src/app/(app)/cuenta/facturacion/page.tsx`): completar con los planes cuando exista D1.
- **Pasar `npm run qa:web` completo** (sin `--rapido`, unos 12 minutos) después de cualquier cambio visual de la web: la pasada de contraste con píxeles solo se hizo a 390 y 1280 px.

## 5. Cómo probar sin pisar a nadie

**App en una base aparte** (no tocar `restora_dev`, que usan las pruebas de otros):

```bash
service postgresql start                       # si está parado
PGPASSWORD=restora psql -h localhost -U restora -d postgres -c "create database restora_a9"   # una vez
cd producto
export DATABASE_URL=postgres://restora:restora@localhost:5432/restora_a9   # manda sobre .env.local
npm run build                                   # migra, audita el aislamiento y compila (≈ 20 s)
ALLOW_DEV_MAILBOX=1 nohup npx next start --port 3101 > /tmp/a9.log 2>&1 &
E2E_BASE=http://localhost:3101 node tests/e2e/run.mjs                      # 15 bloques, ≈ 15 min
ONLY=plan,cuenta-ui E2E_BASE=http://localhost:3101 node tests/e2e/run.mjs  # solo algunos bloques
```

Antes de dar por buena una tarea de `producto/`: `npx tsc --noEmit`, `npx eslint src`, `REQUIRE_DB_TESTS=1 npx vitest run` (409 pruebas) y el e2e completo. Para parar tu servidor: `fuser -k 3101/tcp` (nunca matar todos los `next-server`: puede haber otros).

**Web:** `npm run test:web`, `npm run build:cf`, `npm run qa:web -- --rapido`. Lighthouse móvil: servir `out/` con compresión brotli o gzip como Cloudflare (sin ella, las cifras salen falsas; `qa-web.mjs` ya lo hace) y lanzar `lighthouse` con `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

**Al añadir código nuevo en `producto/`:**
- `tests/e2e/fugas.mjs` falla ante una acción de servidor nueva sin clasificar: añadirla a `CASOS` o a `SIN_IDS`.
- `tests/unit/carga-copias.test.ts` falla si cambian las consultas de Compras o las de sesión y negocio: actualizar las copias de `tests/carga/consultas-*.mjs`.
- Una tabla nueva con `tenant_id` necesita RLS activada y forzada con política `tenant_isolation`, o el build falla; una tabla sin `tenant_id` hay que justificarla en `GLOBALES` de `scripts/audit-tenancy.mjs`.
- Los nombres de migración siguen el orden (`0010` es la última); `0011` y `0012` son del Área C.

## 6. Limpieza del entorno (de la sesión anterior)

- Bases locales que sobran: `PGPASSWORD=restora psql -h localhost -U restora -d postgres -c "drop database restora_a9"` y lo mismo con `restora_carga` (1,2 GB; se rehace con `npm run carga:sembrar`). Dejar `restora`, `restora_dev` y `restora_test`.
- Servidores: el de `3101` (`fuser -k 3101/tcp`) y, si sigue vivo, el viejo de `3100` (compilación anterior contra `restora_dev`).
- La rama `claude/roadmap-b` ya está fusionada: quitar su copia de trabajo (`git worktree list`; `git worktree remove --force <ruta>`) y la rama local (`git branch -D claude/roadmap-b`). No se empujó nunca al remoto.

## 7. Trampas conocidas

- `pkill -f` y `ps | grep` con un patrón literal pueden encontrar la propia línea de órdenes y matar la consola (código 144): usar corchetes (`pgrep -f "[n]ext start"`) o matar por puerto con `fuser -k`.
- Turbopack falla con un `node_modules` enlazado simbólicamente desde fuera de la raíz: para una copia de trabajo, copiar con enlaces duros (`cp -al`).
- Una caché de servidor estático que no distinga por fecha del archivo sirve la compilación anterior tras reconstruir y da falsos suspensos (el de `qa-web.mjs` ya cuenta con ello).
- Un elemento que anima desde `opacity: 0` no cuenta para el LCP hasta que se repinta: las animaciones de la primera pantalla empiezan en `0.01` (ver `app/globals.css`).
- Con una consola o máquina reiniciada, Postgres local no arranca solo y las e2e fallan con `ECONNREFUSED 127.0.0.1:5432`: `service postgresql start`.
- Nada de crear cuentas ni lanzar e2e contra una base compartida mientras otro la usa.
