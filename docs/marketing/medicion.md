# Medición del embudo (Task 34 · E2)

> **Plan, no activado.** · 5/10/2026 · Todo lo de este documento está **APAGADO** hasta que se cumpla E4 ([condiciones de activación](condiciones-de-activacion.md)). La publicidad está **planificada, NO activada**: esto es solo el diseño para medirla cuando llegue el momento. Las consultas de la sección 4 se pueden ejecutar hoy, pero solo de lectura y cuando lo ordene el propietario.

## 1. Principios

- **Sin cookies ni seguimiento de personas.** Se cuentan visitas, altas y pasos del embudo, no individuos.
- **Los datos del producto salen de la propia base (Neon)**, con consultas de solo lectura. No se envía nada a plataformas de anuncios.
- **Un número, una definición.** Cada paso del embudo tiene una consulta; si cambia la definición, se cambia aquí.
- **Con pocas altas, las tasas bailan.** Se leen siempre junto a los recuentos, y no se comparan canales con menos de [n a fijar con los primeros datos] altas cada uno.

## 2. Convención de UTM

Los parámetros son los cinco que ya reconoce la web (`lib/analytics.ts`): `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` y `utm_term`.

**Reglas de formato** (para todos los valores)

- Minúsculas, sin espacios, sin tildes ni «ñ». Solo `a-z`, `0-9` y guion (`-`). Se valida con `^[a-z0-9-]{1,40}$`.
- Un valor, un significado. Nada de nombres de personas, correos, teléfonos ni nombres de restaurantes.
- Se enlaza siempre a `/es` o `/ca`, nunca a la raíz (la raíz redirige y no se ha comprobado que conserve los parámetros).
- No se ponen `utm_*` en enlaces internos de la web, en los correos de la prueba ni dentro de la app.

**`utm_source`: de dónde sale el enlace**

| Valor | Cuándo |
|---|---|
| `linkedin`, `instagram`, `facebook`, `youtube`, `tiktok`, `x` | Publicaciones o perfil en esa red (solo cuando el perfil exista) |
| `whatsapp` | Mensajes uno a uno por WhatsApp |
| `correo` | Correos uno a uno, o a una lista con permiso |
| `llamada` | Enlace que se manda después de una llamada |
| `gestoria`, `distribuidor` | Enlaces entregados a gestorías, asesorías o distribuidores |
| `comunidad` | Grupos, foros y comunidades de hostelería |
| `feria` | QR o enlace enseñado en una feria o jornada |
| `checklist` | Enlace dentro de la checklist u otro PDF |
| `google`, `meta` | **Reservados para anuncios. No se usan hasta firmar E4** |

**`utm_medium`: tipo de canal**

| Valor | Cuándo |
|---|---|
| `organico` | Publicación propia, sin pago |
| `mensaje` | Uno a uno: WhatsApp, correo o llamada |
| `referido` | Lo entrega un tercero: gestoría, distribuidor o cliente |
| `evento` | Feria o jornada |
| `pdf` | Dentro de un documento descargable |
| `pago` | **Reservado para anuncios. No se usa hasta firmar E4** |

**`utm_campaign`: `<tema>-<aaaa>-<mm>`**, con el mes en que se publica. Temas permitidos: `checklist`, `contenido`, `video`, `contacto-directo`, `gestorias`, `distribuidores`, `comunidades`, `feria-<nombre-corto>` y `caso-de-cliente` (solo con el permiso por escrito de la plantilla de caso).

**`utm_content`: `<idioma>-<pieza>`**, por ejemplo `es-casilla-03`, `ca-video` o `es-guion-a`. **`utm_term`** no se usa (queda para las palabras clave de anuncios de búsqueda, tras E4).

**Ejemplos de enlaces** (si la fecha de uso cambia, cambia el mes de la campaña)

| Uso | Enlace |
|---|---|
| Publicación en LinkedIn sobre la casilla 3 de la checklist, en castellano | `https://restoraapp.app/es?utm_source=linkedin&utm_medium=organico&utm_campaign=checklist-2026-11&utm_content=es-casilla-03` |
| WhatsApp a un restaurante, en catalán | `https://restoraapp.app/ca?utm_source=whatsapp&utm_medium=mensaje&utm_campaign=contacto-directo-2026-11&utm_content=ca-guion-a` |
| Ficha para una gestoría | `https://restoraapp.app/es/funcionalidades?utm_source=gestoria&utm_medium=referido&utm_campaign=gestorias-2026-11&utm_content=es-ficha` |
| QR en una feria | `https://restoraapp.app/es?utm_source=feria&utm_medium=evento&utm_campaign=feria-sector-2027-03&utm_content=es-qr` |
| Descripción del vídeo en YouTube | `https://restoraapp.app/es?utm_source=youtube&utm_medium=organico&utm_campaign=video-2026-12&utm_content=es-descripcion` |
| Directo al alta, tras una llamada (la persona ya ha decidido) | `https://app.restoraapp.app/registro?utm_source=llamada&utm_medium=mensaje&utm_campaign=contacto-directo-2026-11&utm_content=es-seguimiento` |

Conviene enlazar a la web y no directamente a la app siempre que se quiera contar la visita: la medición de visitas solo ve la web.

## 3. Cómo viaja hoy el UTM

```
enlace con utm_*  →  página de restoraapp.app  →  los enlaces a app.restoraapp.app los llevan  →  /registro de la app  →  no se guardan
                     (lib/analytics.ts, components/site/utm-links.tsx; prueba: tests/web/utm-y-seo.test.ts)
```

- En la web, los `utm_*` de la visita se guardan **solo en memoria** y se añaden a los enlaces de la app («Probar gratis 14 días»). Nada va a cookies ni al navegador. Recargar la página, volver otro día o teclear la dirección de la app los pierde.
- **En la app no se guardan.** `registro/page.tsx` no lee la dirección y `registrar()` crea la cuenta sin ellos. Es el hueco principal (propuesta P1, sección 5).
- Los formularios de la web (demo, mensaje, checklist) tampoco guardan de qué enlace vienen (propuesta P2).

## 4. Eventos del embudo y consultas

Embudo: **visita → registro → primer albarán confirmado → primer escandallo → pago.**

| Paso | Evento | Definición | Dónde está el dato | Consulta | Qué falta |
|---|---|---|---|---|---|
| 1 | `visita` | Visita a una página de restoraapp.app | Cloudflare Web Analytics (apagado) | Panel de Cloudflare | Activarlo (sección 8). Comprobar si permite desglosar por `utm_*`; si no, la atribución por campaña empieza en el registro |
| 1b | `contacto_web` | Solicitud de demo, mensaje rápido o descarga de la checklist | D1 `leads` (`kind`: `demo`, `mensaje`, `newsletter`) | L1 | Guardar el origen en `leads` (P2) |
| 2 | `registro` | Negocio creado con el formulario de alta. `registro_verificado`: el correo del propietario está confirmado | `organizations`, `users` | Q1 | Guardar el `utm_*` (P1) |
| 3 | `primer_albaran` | Primer albarán o factura **confirmado** (estado `guardado`), no de ejemplo | `documentos` (`saved_at`) | Q1, Q2 | Nada para contar |
| 4 | `primer_escandallo` | Primer plato o menú, no archivado ni de ejemplo, **con al menos un ingrediente** | `recetas`, `receta_lineas` | Q1, Q2 | La hora exacta en que recibió ingredientes: hoy se usa la de creación del plato |
| 5 | `pago` | Suscripción activa (`plan_status = 'active'`). Hoy la activa el propietario a mano; con Stripe encendido, el webhook | `organizations` | Q1, Q3 | La fecha de activación y, con Stripe, el importe (P3) |

**Cómo ejecutarlas.** En Neon, *SQL Editor*, con el rol de administración de la cadena de conexión de la app, que no queda sujeto a la seguridad por filas (RLS). Un rol sujeto a RLS vería vacías las tablas de negocio, y la solución nunca es desactivar RLS. Solo `select`. Los resultados incluyen datos de clientes (nombre del negocio y correo en Q7): no se exportan ni se pegan en herramientas externas. Cada consulta se pega **detrás del bloque común**.

**Definiciones que usa el bloque común**

- **Alta** = un negocio nuevo (`organizations`) con su propietario. Las personas invitadas a un negocio que ya existe no cuentan: el alta es el negocio, no cada usuario. Una persona que se quedó sin negocio y crea otro cuenta como alta nueva; es poco frecuente.
- **Primer albarán real** = `kind` albarán o factura, `status = 'guardado'`, `demo = false`, y `ocr_model` distinto de `ejemplo` y `mock` (el albarán de ejemplo de la pantalla de subida no cuenta). Deja fuera lo mismo que la capa anónima de precios (ejemplos y datos de prueba), pero cuenta también las compras apuntadas a mano.
- **Primer escandallo** = receta de tipo plato o menú (no «elaboración»), no archivada, no de ejemplo, con al menos una línea de ingrediente. Es la regla de la lista de primeros pasos de Hoy, más la exclusión de los ejemplos.
- **Han pagado** = `plan_status` en `active`, `past_due` o `canceled`. Con Stripe apagado solo aparece `active`.
- **Cuentas internas**: la línea marcada del bloque común excluye las del propietario y las de prueba; hay que poner sus patrones.

### Bloque común

```sql
with cuentas as (
  select o.id as org_id, o.name as negocio, u.email,
         o.created_at as alta_at,
         date_trunc('week', o.created_at at time zone 'Europe/Madrid')::date as semana,
         o.trial_ends_at, o.plan_status,
         coalesce(u.email_verified_at is not null, false) as verificado,
         o.onboarding_done_at is not null as alta_guiada,
         o.plan_status in ('active', 'past_due', 'canceled') as ha_pagado
  from organizations o
  left join lateral (
    select m.user_id from memberships m
    where m.org_id = o.id and m.role = 'propietario'
    order by m.created_at limit 1
  ) p on true
  left join users u on u.id = p.user_id
  where not coalesce(u.email ilike any (array['%@ejemplo-interno.invalid']), false)  -- cuentas internas y de prueba: ajusta la lista
),
albaran as (
  select d.tenant_id as org_id, min(d.saved_at) as primer_albaran_at, bool_or(d.source = 'ocr') as usa_foto
  from documentos d
  where d.status = 'guardado' and d.kind in ('albaran', 'factura') and not d.demo
    and coalesce(d.ocr_model, '') not in ('ejemplo', 'mock')
  group by d.tenant_id
),
escandallo as (
  select r.tenant_id as org_id, min(r.created_at) as primer_escandallo_at
  from recetas r
  where r.tipo <> 'elaboracion' and not r.archived and not r.demo
    and exists (select 1 from receta_lineas rl where rl.receta_id = r.id)
  group by r.tenant_id
)
```

### Q1 · Embudo por semana de alta (la consulta del panel)

```sql
select c.semana,
       count(*)                                         as registros,
       count(*) filter (where c.verificado)             as verificados,
       count(*) filter (where c.alta_guiada)            as alta_guiada_terminada,
       count(a.org_id)                                  as con_primer_albaran,
       count(*) filter (where a.usa_foto)               as con_lectura_por_foto_o_pdf,
       count(e.org_id)                                  as con_primer_escandallo,
       count(*) filter (where c.ha_pagado)              as han_pagado,
       count(*) filter (where c.plan_status = 'active') as pagan_hoy
from cuentas c
left join albaran a on a.org_id = c.org_id
left join escandallo e on e.org_id = c.org_id
group by c.semana
order by c.semana desc;
```

Cada fila es una cohorte: las personas que se dieron de alta esa semana, vistas hoy. Las semanas recientes siempre parecen peores porque aún no han tenido tiempo.

### Q2 · Cuánto tardan en llegar al primer albarán y al primer escandallo

```sql
select count(a.org_id) as con_primer_albaran,
       round((percentile_cont(0.5) within group (order by extract(epoch from a.primer_albaran_at - c.alta_at) / 3600))::numeric, 1) as horas_mediana_hasta_primer_albaran,
       count(e.org_id) as con_primer_escandallo,
       round((percentile_cont(0.5) within group (order by extract(epoch from e.primer_escandallo_at - c.alta_at) / 3600))::numeric, 1) as horas_mediana_hasta_primer_escandallo
from cuentas c
left join albaran a on a.org_id = c.org_id
left join escandallo e on e.org_id = c.org_id;
```

### Q3 · De prueba a pago

```sql
select count(*) filter (where c.trial_ends_at <= now())                            as pruebas_terminadas,
       count(*) filter (where c.trial_ends_at <= now() and c.ha_pagado)            as han_pagado,
       count(*) filter (where c.trial_ends_at <= now() and c.plan_status = 'active') as pagan_hoy
from cuentas c;
```

Solo cuentan las altas cuya prueba ya ha terminado; las demás todavía pueden decidir. Si se alarga la prueba a un negocio a mano, no entra hasta que termine la ampliada.

### Q4 · Retención de uso a 30 y 90 días

```sql
select v.n as dia,
       count(*) as cohorte,
       count(*) filter (where exists (
         select 1 from documentos d
         where d.tenant_id = c.org_id and d.status = 'guardado' and d.kind in ('albaran', 'factura') and not d.demo
           and coalesce(d.ocr_model, '') not in ('ejemplo', 'mock')
           and d.saved_at >= c.alta_at + make_interval(days => v.n - 13)
           and d.saved_at <  c.alta_at + make_interval(days => v.n + 1))) as activos
from cuentas c
cross join (values (30), (90)) as v(n)
where c.alta_at <= now() - make_interval(days => v.n)
group by v.n
order by v.n;
```

«Activa a los N días» = ha confirmado al menos un albarán en las dos semanas que terminan en el día N. Un restaurante compra de forma recurrente, así que dos semanas sin ningún albarán confirmado son una señal clara de que ha dejado de usarlo. La ventana de 14 días es una propuesta y se puede cambiar.

### Q5 · Retención de pago a 30 y 90 días (aproximación)

```sql
select v.n as dia,
       count(*) as cohorte_de_pago,
       count(*) filter (where c.plan_status = 'active') as siguen_pagando
from cuentas c
cross join (values (30), (90)) as v(n)
where c.ha_pagado and c.trial_ends_at + make_interval(days => v.n) <= now()
group by v.n
order by v.n;
```

Mientras no exista la fecha de activación (P3), se usa el fin de la prueba como inicio del pago. Es una aproximación válida si la suscripción se activa al terminar la prueba.

### Q6 · Coste de IA de la prueba, por semana de alta

```sql
select c.semana,
       count(distinct c.org_id) as registros,
       round(coalesce(sum(d.ocr_cost_usd), 0)::numeric, 2) as coste_ia_usd_en_la_prueba
from cuentas c
left join documentos d on d.tenant_id = c.org_id and d.created_at <= c.trial_ends_at
group by c.semana
order by c.semana desc;
```

Lo que cuesta leer los albaranes de quienes prueban (en dólares, como lo factura la API). Se suma al coste por alta de los KPI.

### Q7 · A quién escribir hoy (correos de la prueba)

```sql
select c.negocio, c.email,
       ((now() at time zone 'Europe/Madrid')::date - (c.alta_at at time zone 'Europe/Madrid')::date) as dia_de_prueba,
       a.org_id is not null as tiene_albaran,
       e.org_id is not null as tiene_escandallo
from cuentas c
left join albaran a on a.org_id = c.org_id
left join escandallo e on e.org_id = c.org_id
where c.plan_status = 'trial' and c.verificado
  and ((now() at time zone 'Europe/Madrid')::date - (c.alta_at at time zone 'Europe/Madrid')::date) in (0, 2, 5, 10, 13)
order by dia_de_prueba, c.negocio;
```

Decide qué correo toca de la [secuencia de la prueba](materiales/correos-prueba-14-dias.md) y a quién se salta. Es una lista operativa: se usa para escribir y no se guarda.

### Q8 · Perfil de las altas (briefing)

```sql
select coalesce(o.briefing ->> 'tipo', '(sin responder)')    as tipo_de_negocio,
       coalesce(o.briefing ->> 'compras', '(sin responder)') as como_controla_las_compras,
       count(*)        as registros,
       count(a.org_id) as con_primer_albaran,
       count(e.org_id) as con_primer_escandallo
from cuentas c
join organizations o on o.id = c.org_id
left join albaran a on a.org_id = c.org_id
left join escandallo e on e.org_id = c.org_id
group by 1, 2
order by registros desc;
```

Sirve para comprobar si quien llega coincide con el [cliente ideal](salida-a-mercado.md#2-cliente-ideal). El briefing guarda `tipo`, `platos`, `compras`, `tpv`, `rol` y `objetivo` (opciones en `producto/src/lib/briefing.ts`). En `compras`: `excel`, `papel`, `programa` o `nada`.

### Q9 · Por canal (PENDIENTE: no se puede ejecutar hasta aplicar P1)

Añadir `o.utm` al `select` de `cuentas` y pegar esto detrás del bloque común:

```sql
select coalesce(c.utm ->> 'utm_source', '(sin dato)')   as origen,
       coalesce(c.utm ->> 'utm_medium', '(sin dato)')   as medio,
       coalesce(c.utm ->> 'utm_campaign', '(sin dato)') as campana,
       count(*)                             as registros,
       count(*) filter (where c.verificado) as verificados,
       count(a.org_id)                      as con_primer_albaran,
       count(e.org_id)                      as con_primer_escandallo,
       count(*) filter (where c.ha_pagado)  as han_pagado
from cuentas c
left join albaran a on a.org_id = c.org_id
left join escandallo e on e.org_id = c.org_id
group by 1, 2, 3
order by registros desc;
```

### L1 · Contactos de la web (Cloudflare D1, SQLite)

```sql
select strftime('%Y-%W', created_at) as semana, kind, lang, count(*) as n
from leads
group by 1, 2, 3
order by 1 desc, 2, 3;
```

Se lanza como en `CLOUDFLARE.md`: `npx wrangler d1 execute restora-leads --remote --command "…"`. `kind` es `demo`, `mensaje` o `newsletter` (descarga de la checklist).

*Las consultas Q1 a Q8 y L1 se han probado contra una base temporal con el esquema real (todas las migraciones de `producto/db/migrations` hasta la 0009) y negocios sintéticos: con el albarán de ejemplo, solo con datos de ejemplo, con un plato sin ingredientes, con una elaboración, cancelados y una cuenta interna. Q9 se probó añadiendo la columna solo en esa base temporal.*

## 5. Pendientes con propuesta mínima (NO escritas)

Ninguna de las tres está escrita ni aplicada. Se escribirían tras el visto bueno del propietario, como migraciones aditivas e idempotentes, y se desplegarían con las pruebas en verde (regla del plan).

| | Qué falta | Propuesta mínima |
|---|---|---|
| **P1** | La app no guarda los `utm_*` al crear la cuenta | **Datos:** una columna opcional `utm` (jsonb, nula por defecto) en `organizations`, que guarda solo las cinco claves conocidas, en minúsculas y de hasta 100 caracteres, una sola vez al crear la cuenta. Sin RLS: la tabla es global. El número de migración se asigna al escribirla. **Código:** `producto/src/app/(auth)/registro/page.tsx` lee la dirección y pasa los valores al formulario como campos ocultos; `registrar()` (`producto/src/app/(auth)/actions.ts`) los valida y los guarda en la misma transacción que crea el negocio; prueba e2e con y sin `utm_*`. **Sin cookies ni almacenamiento del navegador.** **Privacidad:** mencionarlo en la política («de qué enlace llegaste») antes de activarlo. **Límite:** si el registro se abre sin parámetros, queda sin dato |
| **P2** | Los formularios de la web no guardan su origen | Una columna `utm` (texto JSON) en la tabla `leads` de D1 (`schema.sql` y un `alter table` en la base remota); `lead-form.tsx`, `quick-contact.tsx` y `newsletter.tsx` envían los `utm_*` que ya lee `lib/analytics.ts`; `functions/api/leads.js` los valida y recorta igual que la app. Mientras tanto, el origen de un contacto se apunta a mano al responderle («cómo nos conoció») |
| **P3** | No se guarda cuándo empieza el pago | Una columna `activated_at` (timestamptz, nula) en `organizations`, que se rellena la primera vez que `plan_status` pasa a `active` (webhook de Stripe y, mientras sea a mano, la misma orden de `producto/docs/HOJA-DE-RUTA.md` ampliada con la fecha). **Hasta entonces**, el propietario apunta fecha y negocio de cada activación manual en una hoja: es el único dato que no se puede reconstruir después |

## 6. Panel propuesto

Una **hoja de cálculo privada del propietario**, sin código. Solo lleva recuentos: ni nombres de negocio ni correos.

| Pestaña | Contenido |
|---|---|
| **Embudo** | Una fila por semana, con las columnas de abajo |
| **Canales** | Q9 más el gasto por canal. Pendiente de P1 y de E4 |
| **Retención** | Q4 y Q5 |
| **Gasto** | Vacía hasta firmar E4 |

**Columnas de «Embudo»**

| Columna | De dónde | Fórmula |
|---|---|---|
| Semana, registros, verificados, con primer albarán, con primer escandallo, han pagado | Q1 | — |
| Visitas | Cloudflare Web Analytics, a mano | — |
| Contactos web | L1 | demo + mensaje + descargas de la checklist |
| Visita → registro | | registros ÷ visitas |
| Registro → primer albarán | | con primer albarán ÷ verificados |
| Primer albarán → primer escandallo | | con primer escandallo ÷ con primer albarán |
| Prueba → pago | Q3 | han pagado ÷ pruebas terminadas |

**Rutina de los lunes (15 minutos).** 1) Ejecutar Q1 a Q5 en Neon. 2) Pegar los resultados. 3) Copiar las visitas de la semana. 4) Mirar tres cosas: quién se queda en el registro sin subir un albarán, cuánto tardan y cuántos pasan de prueba a pago. 5) Apuntar una decisión para la semana.

## 7. Quién es el dueño de cada dato

| Dato | Dónde vive | Quién lo alimenta | Dueño | Quién lo ve | Privacidad |
|---|---|---|---|---|---|
| Visitas y páginas | Cloudflare Web Analytics | Cloudflare, sin cookies | Propietario | Propietario | Agregado. Cloudflare actúa como encargado |
| Contactos de la web | Cloudflare D1, `leads` | Quien rellena el formulario | Propietario | Propietario | Nombre, correo e IP son datos personales. Plazo de conservación por decidir; se borra a petición |
| Altas y origen (`utm`) | Neon, `organizations` y `users` | La app, al registrarse | Propietario | Propietario, con consultas | El `utm` no identifica a nadie por sí solo, pero se asocia a una cuenta |
| Primer albarán y primer escandallo | Neon, `documentos`, `recetas`, `receta_lineas` | Los clientes, al usar la app | Propietario (el contenido es del cliente) | Solo recuentos y fechas, nunca el contenido | Se mide un hecho («hay un albarán confirmado»), no lo que dice |
| Pago | `organizations.plan_status` y, con Stripe, Stripe | Propietario (a mano) o el webhook | Propietario | Propietario | Los datos fiscales van aparte |
| Coste de IA | `documentos.ocr_cost_usd` | La app | Propietario | Propietario | Solo agregado |
| Gasto de marketing | Facturas y paneles de las plataformas | Propietario | Propietario | Propietario | No existe hasta E4 |
| Panel | Hoja privada del propietario | Propietario | Propietario | Quien él autorice | Solo recuentos |

## 8. Qué se activa y qué no

**Estado: todo APAGADO.**

| Elemento | Estado hoy | Quién lo activa y cuándo |
|---|---|---|
| Enlaces de la web a la app con `utm_*` | En el código; no hace nada si el enlace no trae `utm_*`. La web con este cambio aún no está publicada (D7) | Se publica con la web, con la aprobación del propietario |
| **Cloudflare Web Analytics (sin cookies)** | Apagado | **El propietario**, desde su panel de Cloudflare, al preparar E4. Antes: actualizar las políticas de cookies y de privacidad (hoy dicen que no hay analítica). Comprobar en el panel qué opciones de alta ofrece hoy y si permite desglosar por `utm_*` |
| Consultas de Neon (solo lectura) | Disponibles | El propietario, cuando las necesite; no cambian nada |
| Guardar `utm` en el alta y en los formularios (P1, P2) y fecha de pago (P3) | No escritos | Tras el visto bueno del propietario |
| Panel (hoja) | No creado | Al preparar E4 |

Sobre la frase «sin cookies»: Cloudflare presenta esta medición como sin cookies. El propietario debe confirmarlo en su documentación vigente antes de mantener «sin cookies de rastreo» en la web.

**Qué NO se activa nunca sin consentimiento**

- Píxeles y etiquetas de anuncios: Meta, Google (Ads y etiquetas de terceros), LinkedIn Insight, TikTok y X.
- Grabación de sesiones y mapas de calor (Hotjar, Clarity y similares), huella digital del dispositivo y cookies de terceros.
- Conversiones enviadas desde el servidor a plataformas de anuncios (envían datos de personas).
- Consentimiento significa: aviso de cookies con rechazar tan fácil como aceptar, que no carga nada antes de aceptar, política de cookies actualizada y E4 firmado.
- **Propuesta de regla, a confirmar por el propietario:** dentro de la app (`app.restoraapp.app`) no entra ningún script de terceros de marketing, con o sin consentimiento. Allí están los albaranes y los precios de los clientes.

## 9. Cómo se comprueba que la medición está lista (para E4)

Con una cuenta de prueba nueva y los pasos en este orden:

1. Abrir un enlace con `utm_*` a la web, pulsar «Probar gratis 14 días» y crear la cuenta. Resultado esperado: en Neon, `organizations.utm` lleva los valores (Q9). Hoy **no** pasa: falta P1.
2. Enviar un mensaje desde el formulario de la web con un enlace con `utm_*`. Resultado esperado: la fila de `leads` guarda el origen (falta P2).
3. Confirmar el correo, subir un albarán de verdad, confirmarlo y crear un plato con ingredientes. Resultado esperado: Q1 suma uno en registro, verificado, primer albarán y primer escandallo.
4. Activar la suscripción de esa cuenta a mano y apuntar la fecha. Resultado esperado: Q1 la cuenta en «han pagado» y «pagan hoy». Q3 también, cuando su prueba haya terminado (en la cuenta de prueba se puede adelantar `trial_ends_at`).
5. Comprobar que Cloudflare Web Analytics registra la visita del paso 1.
6. Revisar que no hay ningún píxel ni etiqueta de terceros en la web ni en la app.
