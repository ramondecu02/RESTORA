# Condiciones para activar la publicidad (Task 36 · E4)

> **Plan, no activado.** · 5/10/2026 · La publicidad está **planificada, NO activada**. Esta lista debe cumplirse **entera** y firmarla el propietario antes de crear ninguna campaña o gastar nada.

Aquí «publicidad» es cualquier gasto para conseguir visitas o altas: anuncios en buscadores y redes, patrocinios, promociones de pago, entradas o stands de ferias, impresión de material y comisiones a prescriptores. El trabajo orgánico sin gasto (contenido, comunidades, contacto directo) sigue el [calendario de 90 días](salida-a-mercado.md#8-calendario-de-90-días), que tiene su propia puerta de arranque.

## Resumen a 5/10/2026

| # | Condición | Estado | Lo que más pesa |
|---|---|---|---|
| 1 | A11 · MVP terminado y firmado | Pendiente | P7 (lectura con albaranes reales), P9 (personas), S2–S4, V1–V4 |
| 2 | C6 · Cobro en producción verificado | Pendiente | Stripe apagado; D1 sin decidir; B1–B3 sin cerrar |
| 3 | D7 · Web publicada y verificada | Pendiente | Task 32 sin ejecutar; teléfono nuevo, datos legales, precios |
| 4 | Soporte atendido, con plazo confirmado | Pendiente | Plazo sin confirmar; teléfono nuevo sin facilitar |
| 5 | Medición lista (E2) | Pendiente | Documentada, no implementada; todo apagado |
| 6 | Presupuesto aprobado | Pendiente | Sin importes; sin datos de empresa; D1 |

**Ninguna condición está cumplida hoy.** Dependencias que bloquean varias a la vez: D1 (planes y precios), los datos de la empresa (razón social, NIF, domicilio), el teléfono nuevo y el cierre de B1–B3.

## 1. A11 · MVP terminado

**Se cumple cuando** [`docs/superpowers/mvp-terminado.md`](../superpowers/mvp-terminado.md) está firmado, con todas las filas de «Producto» en verde y las de «Seguridad» y «Para vender» con su respuesta.

**Cómo se comprueba**

1. P1 y P2, en `producto/`: `npx tsc --noEmit`, `npx eslint src`, `npx vitest run` y `node tests/e2e/run.mjs` (15 bloques), todo en verde.
2. P3 y P4: `matriz.mjs` y `a11y.mjs` dentro de `run.mjs`, más una prueba con un lector de pantalla real (VoiceOver, TalkBack o NVDA).
3. P7: `npm run eval:lectura` sobre 30 albaranes reales de al menos 5 proveedores (`producto/tests/eval/README.md`).
4. P8: Lighthouse móvil y Vercel Speed Insights sobre el dominio real.
5. P9: tres pruebas cronometradas con personas de restaurante, sin ayuda.
6. S2–S4: restauración de una copia de Neon ensayada, búsqueda de secretos en todo el historial y correos de la app probados con un buzón real.
7. V1–V4: cada fila con su respuesta (cobro, datos fiscales, web, marca y contacto).

**Estado hoy**

- Hecho: P1, P2, P3 (156/156), P5, P6 (6/6) y S1 (169 comprobaciones de RLS, 678 de fugas entre negocios y la auditoría de aislamiento en cada build). P4, en automático (0 violaciones).
- Parcial: P8 (medido en local; falta producción) y P10 (Facturación espera a D1).
- Pendiente: P4 con lector de pantalla, P7 (faltan los albaranes reales y aprobar el gasto de API), P9, S2, S3, S4 y V1 a V4.
- El documento está sin firmar.

**Firma:** propietario, en ese mismo documento (casilla «Aprobado por el propietario — fecha»).

## 2. C6 · Cobro en producción verificado

**Condiciones previas:** D1 decidido (planes y precios) y B1–B3 en verde. No se pasa Stripe a producción con fugas posibles o sin una copia probada (regla del plan).

**Cómo se comprueba**

1. `producto/docs/PASO-A-PRODUCCION-STRIPE.md` (Task 24) con todas sus casillas marcadas: claves de producción, secreto del webhook, ajustes de impuestos y un cobro real de importe mínimo con su reembolso.
2. `producto/tests/stripe/relojes.mjs` en verde: fin de la prueba, cobro correcto, cobro fallido, cambio de plan a mitad de ciclo sin doble cobro, cancelación y webhook repetido o desordenado.
3. En producción, una suscripción real de prueba deja el negocio en `active` por el webhook, no a mano. En Neon: `select plan_status, stripe_subscription_id from organizations where name = '…';` y `select type, received_at from stripe_events order by received_at desc limit 10;`.
4. Un cobro fallido muestra el aviso desde el primer día y bloquea a los 5 días; pagar desbloquea al momento (probado en local con datos simulados; falta con Stripe real).

**Estado hoy**

- Stripe está implementado y **apagado**: Checkout, portal y webhook con idempotencia, con un solo precio (`STRIPE_PRICE_ID`) y sin planes. La suscripción se activa a mano.
- Hecho: aviso y bloqueo a los 5 días de impago, probados en local.
- Pendiente: D1; Tasks 19 a 22 (planes, Stripe en modo prueba, elegir plan, datos fiscales) y 24 (relojes y paso a producción); el correo de cobro fallido y los reintentos propios (resto de la Task 23); B1–B3. `PASO-A-PRODUCCION-STRIPE.md` y `relojes.mjs` todavía no existen.

**Firma:** propietario. Pasar a producción exige su visto bueno expreso (Task 24, paso 4).

## 3. D7 · Web publicada y verificada

**Cómo se comprueba**

1. En la raíz del repositorio: `npm run test:web` en verde y `npm run build:cf` sin errores.
2. Publicación con `actualizar-restora.bat`, opción P, **solo con la aprobación expresa del propietario**.
3. Verificación en producción (Task 32): enlaces, formularios, castellano y catalán, cabeceras (HSTS), `sitemap.xml` y `robots.txt`; Lighthouse móvil sobre el dominio real; `RESEND_API_KEY` y `LEAD_NOTIFY_TO` puestos en Cloudflare, para que los formularios avisen por correo; nota de reversión en `CLOUDFLARE.md`.
4. Sin pendientes a la vista: teléfono nuevo (Task 31b), datos legales completos (V2 del MVP), página de precios coherente con D1 y ningún icono de red que no exista.

**Estado hoy**

- La web está corregida en el repositorio: sin el lenguaje ni las cifras de la versión anterior, sin promesas que el producto no cumple ([`docs/AUDITORIA-CONVERSION.md`](../AUDITORIA-CONVERSION.md)), con `utm_*` hasta el registro, SEO técnico y kit de marca.
- No consta que esa versión esté publicada: Task 32 sin ejecutar.
- Pendiente: teléfono nuevo, datos fiscales y textos legales («Pendiente de completar» a la vista), precios (D1), redes (las crea el propietario), imágenes y capturas en curso, vídeo («Próximamente»).

**Firma:** propietario.

## 4. Soporte atendido

**Cómo se comprueba**

1. El propietario rellena esta tabla (es lo que se compromete a cumplir):

   | Canal | Quién responde | Horario | Plazo de respuesta | Aviso fuera de horario |
   |---|---|---|---|---|
   | Correo `hola@restoraapp.com` | | | | |
   | WhatsApp (el de la web) | | | | |

2. Los canales funcionan: un correo desde fuera llega a `hola@restoraapp.com` y se puede contestar; las respuestas a los correos de la app llegan a ese buzón (pendiente en `producto/docs/HOJA-DE-RUTA.md`, apartado 6); el WhatsApp de la web contesta.
3. Prueba durante una semana laborable: mensajes de prueba por cada canal, anotando la hora de envío y la de respuesta. Todos dentro del plazo.
4. La web y los materiales dicen el mismo plazo. Hoy la web promete respuesta en 48 h y está sin confirmar: o lo confirma el propietario o se cambia el texto.

**Estado hoy:** pendiente. Plazo sin confirmar, reparto de quién atiende sin definir y teléfono nuevo sin facilitar.

**Firma:** propietario.

## 5. Medición lista (E2)

**Cómo se comprueba** (detalle en [`medicion.md`](medicion.md))

1. Cloudflare Web Analytics activado por el propietario y con visitas visibles; políticas de cookies y de privacidad actualizadas (hoy dicen que no hay analítica).
2. Los `utm_*` se guardan al crear la cuenta y en los formularios de la web: un registro de prueba con `?utm_source=…` deja el valor en la base (consulta Q9 de `medicion.md`).
3. Las consultas del embudo dan los mismos recuentos que un recorrido de prueba hecho a mano: registro, primer albarán, primer escandallo y pago.
4. La hoja del panel existe y cada dato tiene su responsable.
5. No hay ningún píxel de anuncios ni etiqueta de terceros en la web ni en la app.

**Estado hoy**

- Hecho: los enlaces de la web a la app arrastran los `utm_*` (solo en memoria, sin guardar nada; `tests/web/utm-y-seo.test.ts`).
- Pendiente, todo apagado: Cloudflare Web Analytics, guardar los `utm_*` en el alta y en los formularios, la fecha de activación del pago, el panel y la actualización de las políticas.

**Firma:** propietario.

## 6. Presupuesto aprobado

**Cómo se comprueba**

1. La tabla de tramos de [`salida-a-mercado.md`](salida-a-mercado.md#6-presupuesto-escalonado) con los importes escritos por el propietario, el techo de gasto, el criterio de parada y el criterio de paso entre tramos.
2. Medio de pago de las plataformas y datos de facturación de la empresa disponibles.
3. D1 decidido, para saber el margen por cliente y, con él, cuánto se puede pagar por cada alta.

**Estado hoy:** pendiente. Los importes figuran como «[a decidir por el propietario]»; razón social, NIF y domicilio siguen pendientes; D1 sin decidir.

**Firma:** propietario.

## Después de firmar

- Se autoriza solo el primer tramo del presupuesto. Cada tramo siguiente exige que se cumplan sus criterios de paso y una nueva aprobación por escrito.
- Cambiar de canal, de importe o de mensaje principal pide una aprobación nueva.
- Si una condición deja de cumplirse (la web no responde, el soporte se retrasa, el cobro falla), se pausan las campañas hasta resolverlo. El propietario puede pausar en cualquier momento.
- Si cambian el producto o los precios (D1) después de la firma, las condiciones 1, 3 y 6 se revisan y se vuelven a firmar.

## Firma

- [ ] A11 · MVP terminado — fecha: ____________
- [ ] C6 · Cobro en producción verificado — fecha: ____________
- [ ] D7 · Web publicada y verificada — fecha: ____________
- [ ] Soporte atendido — fecha: ____________
- [ ] Medición lista — fecha: ____________
- [ ] Presupuesto aprobado — fecha: ____________

**Aprobado por el propietario — fecha: ____________**

**Mientras no esté firmado no se crea ninguna campaña ni se gasta nada.**
