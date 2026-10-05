# Correos de la prueba de 14 días (Task 35 · E3)

> **Plan, no activado.** · 5/10/2026 · **Hoy la app no envía ningún correo de la prueba.** Los únicos correos automáticos de la app son el código de verificación, la recuperación de la contraseña y las invitaciones (`producto/src/server/email.ts`). Estos son textos listos para enviar a mano desde `hola@restoraapp.com` o para automatizar más adelante. Van dirigidos solo a quien ya ha creado una cuenta de prueba. La publicidad está **planificada, NO activada** ([E4](../condiciones-de-activacion.md)): estos correos no son publicidad de pago.

**Lo que estos correos no prometen:** ningún precio ni cobro automático. Hoy no se pide tarjeta y la suscripción se activa escribiendo por WhatsApp o por correo. Tampoco usan prisas inventadas: lo único que cuenta el reloj es la fecha real de fin de la prueba.

## Cómo usarlos

1. **A quién y cuándo.** La consulta Q7 de [`medicion.md`](../medicion.md) da la lista del día: negocio, correo, día de prueba y si ya tiene albarán y escandallo. El día 0 es el del alta, con el correo ya verificado.
2. **Se saltan los que ya no hacen falta.** El del día 2 no se manda a quien ya ha confirmado un albarán. El del día 5, a quien ya tiene un plato con ingredientes. Los de los días 0, 10 y 13 van a todos los que siguen en prueba.
3. **Idioma.** Castellano por defecto, porque la app solo está en castellano. Catalán a quien escriba en catalán o llegue por la web catalana.
4. **Huecos a rellenar:** `[nombre]`, `[restaurante]`, `[tu nombre]` y `[fecha de fin de la prueba]` (el alta más 14 días; en Neon, `trial_ends_at`, en hora de Madrid).
5. **Enlaces.** Pasan por `entrar?next=` para que, si la persona no tiene la sesión abierta, llegue a la pantalla correcta después de entrar. No llevan `utm_*`: ya tienen cuenta, y el efecto de cada correo se mide en los pasos del embudo.
6. **Respuestas.** Se contestan en el plazo que confirme el propietario para el soporte (condición 4 de [E4](../condiciones-de-activacion.md)). Quien dice que no sigue: se le agradece, se le recuerda que puede descargar sus datos y no se insiste. Quien pide el precio: [a decidir por el propietario, D1].

**Antes de enviar el primero**

- Pie legal: razón social, NIF y domicilio siguen pendientes. Mientras no estén, el pie lleva el hueco marcado y los correos se envían a mano, de uno en uno; no se automatizan.
- La política de privacidad debe decir que se usan datos de uso de la cuenta (por ejemplo, si hay un albarán confirmado) para ayudar durante la prueba.
- Tres decisiones del propietario condicionan los textos: cuánto tiempo se conservan los datos tras la prueba (la pantalla de bloqueo solo dice que «siguen guardados» y estos correos no dan plazo), qué condiciones comunica a quien escribe para seguir y cuál es el plazo de respuesta.
- Cuando Stripe se encienda (C6), hay que revisar los correos de los días 10 y 13: hoy dicen que no hay cobro automático y que se activa escribiendo.

## Calendario

| Día | Para quién | Una sola acción | Enlace |
|---|---|---|---|
| 0 | Todos, con el correo ya verificado | Subir el primer albarán | `https://app.restoraapp.app/entrar?next=%2Fcompras%2Fsubir` |
| 2 | Quien aún no ha confirmado ningún albarán | Subir un albarán | El mismo |
| 5 | Quien aún no tiene un plato con ingredientes | Crear el primer escandallo | `https://app.restoraapp.app/entrar?next=%2Fescandallos%2Fnuevo` |
| 10 | Todos los que siguen en prueba | Responder con lo que falta o con ganas de seguir | Responder al correo |
| 13 | Todos los que siguen en prueba | Escribir para seguir o para preguntar | Responder al correo o WhatsApp |

**Pie común.** ES: «Te escribo porque creaste una cuenta de prueba en RESTORA. Si prefieres no recibir más correos sobre la prueba, respóndeme y dejo de escribirte.» CA: «T'escric perquè vas crear un compte de prova a RESTORA. Si prefereixes no rebre més correus sobre la prova, respon-me i deixo d'escriure't.» Debajo, el hueco `[Datos de la empresa (razón social, NIF y domicilio): pendientes de confirmar por el propietario]`.

---

## Día 0 · Bienvenida

**Castellano**

Asunto: `[nombre], empieza con el albarán de esta semana`

> Hola [nombre]:
>
> Ya tienes lista tu cuenta de RESTORA para [restaurante]. Son 14 días de prueba, sin tarjeta, hasta el [fecha de fin de la prueba].
>
> Para ver algo útil cuanto antes, empieza por lo más sencillo: haz una foto al último albarán de un proveedor, o sube su PDF. RESTORA lee el proveedor, la fecha, las líneas y los precios; tú revisas lo que no tenga claro y pulsas «Confirmar y guardar». Hasta que confirmas, no cambia ningún precio.
>
> Si la foto sale oscura o movida, la app te avisa. Con buena luz, el papel plano y el móvil quieto suele bastar.
>
> **Subir mi primer albarán:** [enlace]
>
> Si algo no sale como esperabas, responde a este correo y lo vemos.
>
> [tu nombre]
> RESTORA

**Català**

Assumpte: `[nom], comença amb l'albarà d'aquesta setmana`

> Hola [nom]:
>
> Ja tens llest el teu compte de RESTORA per a [restaurant]. Són 14 dies de prova, sense targeta, fins al [data de fi de la prova].
>
> Per veure alguna cosa útil com abans, comença per la més senzilla: fes una foto a l'últim albarà d'un proveïdor, o puja'n el PDF. RESTORA en llegeix el proveïdor, la data, les línies i els preus; tu revises el que no tingui clar i prems «Confirmar y guardar». Fins que no confirmes, no canvia cap preu.
>
> Si la foto surt fosca o moguda, l'app t'avisa. Amb bona llum, el paper pla i el mòbil quiet sol bastar. Un avís: avui l'app només és en castellà.
>
> **Pujar el meu primer albarà:** [enllaç]
>
> Si alguna cosa no surt com esperaves, respon aquest correu i ho mirem.
>
> [el teu nom]
> RESTORA

---

## Día 2 · Un empujón con el primer albarán

Solo para quien aún no ha confirmado ningún albarán.

**Castellano**

Asunto: `¿Te echo una mano con el primer albarán?`

> Hola [nombre]:
>
> Han pasado dos días y todavía no hay ningún albarán confirmado en [restaurante]. Es normal: es el paso que más cuesta empezar.
>
> Dos atajos, si te ayudan:
>
> - Si no tienes un albarán a mano, en «Subir albarán» hay uno de ejemplo para ver la lectura y la pantalla de revisión sin usar el tuyo. Si lo descartas, no se guarda nada; si lo confirmas, se guarda en tu cuenta como cualquier otro y puedes borrarlo después.
> - Si prefieres no hacer foto, también puedes apuntar la compra a mano.
>
> **Subir un albarán:** [enlace]
>
> Si algo se atasca, responde a este correo con lo que ves y lo miramos.
>
> [tu nombre]
> RESTORA

**Català**

Assumpte: `Et dono un cop de mà amb el primer albarà?`

> Hola [nom]:
>
> Han passat dos dies i encara no hi ha cap albarà confirmat a [restaurant]. És normal: és el pas que més costa començar.
>
> Dues dreceres, si t'ajuden:
>
> - Si no tens un albarà a mà, a «Subir albarán» n'hi ha un d'exemple per veure'n la lectura i la pantalla de revisió sense fer servir el teu. Si el descartes, no es desa res; si el confirmes, es desa al teu compte com qualsevol altre i el pots esborrar després.
> - Si prefereixes no fer foto, també pots apuntar la compra a mà.
>
> **Pujar un albarà:** [enllaç]
>
> Si alguna cosa s'encalla, respon aquest correu amb el que veus i ho mirem.
>
> [el teu nom]
> RESTORA

---

## Día 5 · El primer escandallo

Solo para quien aún no tiene un plato con ingredientes.

**Castellano**

Asunto: `Ponle coste a un plato: tu primer escandallo`

> Hola [nombre]:
>
> Con los precios de tus albaranes, el siguiente paso es ver cuánto te cuesta un plato. Elige uno que vendas mucho y empieza desde una plantilla de platos habituales: ajustas las cantidades a tu receta y lo guardas. También puedes pedir una sugerencia de ingredientes; revisa siempre las cantidades.
>
> La ficha del plato te da el coste por ración y, cuando pones tu precio de carta, el food cost frente a tu objetivo. También te dice el precio de carta (PVP) que necesitarías para llegar a un food cost concreto. Los ingredientes que ya has comprado llevan tu precio; el resto se completa con tus próximos albaranes.
>
> **Crear mi primer escandallo:** [enlace]
>
> Si dudas con alguna cantidad o no encuentras un ingrediente, responde a este correo.
>
> [tu nombre]
> RESTORA

**Català**

Assumpte: `Posa-li cost a un plat: el teu primer escandall`

> Hola [nom]:
>
> Amb els preus dels teus albarans, el següent pas és veure quant et costa un plat. Tria'n un que venguis molt i comença des d'una plantilla de plats habituals: ajustes les quantitats a la teva recepta i el deses. També pots demanar un suggeriment d'ingredients; revisa sempre les quantitats.
>
> La fitxa del plat et dona el cost per ració i, quan hi poses el teu preu de carta, el food cost davant el teu objectiu. També et diu el preu de carta (PVP) que necessitaries per arribar a un food cost concret. Els ingredients que ja has comprat porten el teu preu; la resta es completa amb els teus propers albarans.
>
> **Crear el meu primer escandall:** [enllaç]
>
> Si dubtes amb alguna quantitat o no trobes un ingredient, respon aquest correu.
>
> [el teu nom]
> RESTORA

---

## Día 10 · Qué mirar antes del final

Para todos los que siguen en prueba.

**Castellano**

Asunto: `Tu prueba termina el [fecha de fin de la prueba]`

> Hola [nombre]:
>
> Tu prueba de RESTORA en [restaurante] termina el [fecha de fin de la prueba]. Antes de que llegue, merece la pena mirar tres cosas:
>
> 1. **Hoy:** lo que pide tu atención.
> 2. **Avisos:** cuando un producto cambia de precio entre dos compras, qué platos afecta y cuánto suma al mes.
> 3. **Platos y márgenes:** qué platos están fuera de tu objetivo de food cost (cada plato necesita su precio de carta).
>
> Si te falta algo por ver o algo no te encaja, cuéntamelo y lo miramos. Si ya sabes que quieres seguir, la suscripción se activa escribiéndonos.
>
> **Responde a este correo,** o escríbenos por WhatsApp: [enlace de WhatsApp de la web].
>
> [tu nombre]
> RESTORA

**Català**

Assumpte: `La teva prova acaba el [data de fi de la prova]`

> Hola [nom]:
>
> La teva prova de RESTORA a [restaurant] acaba el [data de fi de la prova]. Abans que arribi, val la pena mirar tres coses (els noms són els del menú de l'app, que és en castellà):
>
> 1. **Hoy:** el que demana la teva atenció.
> 2. **Avisos:** quan un producte canvia de preu entre dues compres, quins plats afecta i quant suma al mes.
> 3. **Platos y márgenes:** quins plats queden fora del teu objectiu de food cost (cada plat necessita el seu preu de carta).
>
> Si et falta alguna cosa per veure o alguna cosa no t'encaixa, explica-m'ho i ho mirem. Si ja saps que vols continuar, la subscripció s'activa escrivint-nos.
>
> **Respon aquest correu,** o escriu-nos per WhatsApp: [enllaç de WhatsApp de la web].
>
> [el teu nom]
> RESTORA

---

## Día 13 · Mañana termina

Para todos los que siguen en prueba. Se envía el día 13.

**Castellano**

Asunto: `Tu prueba termina mañana`

> Hola [nombre]:
>
> Mañana, [fecha de fin de la prueba], termina la prueba de RESTORA en [restaurante]. Esto es lo que pasa después:
>
> - La app se bloquea: no podrás subir ni consultar nada, salvo descargar tus datos y activar la suscripción.
> - Tus datos siguen guardados. Desde «Mi local» puedes descargar en CSV tus artículos, proveedores, compras, escandallos y ventas.
> - No te hemos pedido tarjeta, así que no habrá ningún cobro automático.
> - Si quieres seguir, escríbenos y activamos tu suscripción mensual. Cuando nos escribas, te contamos las condiciones.
>
> Si todavía te queda algo por ver, dímelo hoy y lo miramos.
>
> **Escríbenos para seguir, o para preguntar lo que necesites:** responde a este correo o usa WhatsApp ([enlace de WhatsApp de la web]).
>
> [tu nombre]
> RESTORA

**Català**

Assumpte: `La teva prova acaba demà`

> Hola [nom]:
>
> Demà, [data de fi de la prova], acaba la prova de RESTORA a [restaurant]. Això és el que passa després:
>
> - L'app es bloqueja: no podràs pujar ni consultar res, tret de descarregar les teves dades i activar la subscripció.
> - Les teves dades continuen desades. Des de «Mi local» pots descarregar en CSV els teus articles, proveïdors, compres, escandalls i vendes.
> - No t'hem demanat targeta, així que no hi haurà cap cobrament automàtic.
> - Si vols continuar, escriu-nos i activem la teva subscripció mensual. Quan ens escriguis, t'expliquem les condicions.
>
> Si encara et queda alguna cosa per veure, digues-m'ho avui i ho mirem.
>
> **Escriu-nos per continuar, o per preguntar el que necessitis:** respon aquest correu o fes servir WhatsApp ([enllaç de WhatsApp de la web]).
>
> [el teu nom]
> RESTORA

---

## Para automatizarlos más adelante (no se hace ahora)

- Un envío programado por día de prueba desde el servidor, con estos textos como plantillas. Resend ya es el proveedor de correo de la app.
- La fecha de fin sale de `organizations.trial_ends_at`; las reglas de salto («tiene albarán», «tiene escandallo») son las de la consulta Q7.
- Hace falta un registro de a quién se ha enviado cada correo y una forma de darse de baja de ellos.
- La app ya avisa dentro, en la barra superior, durante los tres últimos días de prueba. El aviso por correo antes del final figura en los pendientes de `producto/docs/HOJA-DE-RUTA.md` (apartado 6). El correo de cobro fallido es otra tarea (Task 23).
- Es un cambio de código: se hace con el visto bueno del propietario.
