# Salida a mercado de RESTORA (Task 33 · E1)

> **Plan, no activado.** · 5/10/2026 · La publicidad está **planificada, NO activada** hasta que el propietario firme las [condiciones de activación](condiciones-de-activacion.md) (E4). Este documento no gasta nada ni contacta a nadie: dice a quién, con qué mensajes, por qué canales y cómo se medirá.

**Reglas de este plan**

- Todo lo que se dice del producto sale de lo que hace hoy ([`docs/AUDITORIA-CONVERSION.md`](../AUDITORIA-CONVERSION.md), [`producto/docs/DECISIONES.md`](../../producto/docs/DECISIONES.md)). Lo que no existe se dice como «hoy no».
- Los importes van como «[a decidir por el propietario]». Los objetivos numéricos, como «a fijar con los primeros datos» o con una fórmula. No hay precios ni nombres de plan (D1 pendiente).
- No hay cifras de ahorro, datos del sector, resultados ni nombres de clientes: todavía no existen y no se inventan.

## 1. Resumen

1. **A quién:** restaurante independiente con carta propia y compras recurrentes, de un solo local, que hoy controla costes en papel, Excel o de memoria.
2. **Qué se dice:** tres mensajes, cada uno atado a una función real que se puede enseñar en 30 segundos.
3. **Cómo:** orgánico primero (contenido útil, comunidades, prescriptores, ferias y SEO local), en un calendario de 13 semanas sin gasto.
4. **Cómo se sabe si funciona:** coste por alta, de prueba a pago y retención a 30 y 90 días, con la medición de [`medicion.md`](medicion.md).
5. **Cuándo se gasta:** nunca antes de firmar E4. Después, por tramos, y cada tramo solo si el anterior cumple sus criterios.

## 2. Cliente ideal

**Definición.** Restaurante independiente (o bar con cocina) con **carta propia** y **compras recurrentes** a proveedores. Un local. Una persona que decide (propietario/a, jefe/a de cocina o responsable de costes) y que hoy controla los costes en papel, en Excel o de memoria.

**Señales observables.** No llevan umbrales de tamaño: se afinan con las altas reales.

| Señal | Cómo se ve desde fuera | Cómo se confirma, en una pregunta | Por qué importa |
|---|---|---|---|
| Carta propia con platos de cocina | Carta online o en pizarra con platos elaborados, no solo bebidas ni producto ya hecho | «¿Los platos de la carta los cocináis vosotros?» | RESTORA calcula el coste de un plato a partir de sus ingredientes |
| La carta se mueve | Menú del día, sugerencias o platos de temporada | «¿Cada cuánto cambiáis platos?» | Cada plato nuevo pide un escandallo; las plantillas ayudan |
| Compras recurrentes a varios proveedores | Repartos a la puerta; proveedores nombrados en la carta o en redes | «¿A cuántos proveedores compráis cada semana?» | Hay albaranes que leer y precios que comparar |
| Control en papel, Excel o de memoria | No se ve ninguna herramienta | «¿Dónde apuntáis los albaranes?» (opciones del alta: Excel, papel, un programa, nada) | Es donde más se nota el cambio |
| Alguien que decide y usa el móvil | Propietario/a o jefe/a de cocina visible en la web o en redes | «¿Quién revisa los costes?» | La prueba es de autoservicio: la monta una persona |
| Un solo local | Un único establecimiento | «¿Cuántos locales llevas?» | Hoy es un local por cuenta |
| Un precio que se ha movido | Lo cuentan ellos | «¿Te ha subido algún proveedor este año? ¿Cómo te enteraste?» | Es la situación que resuelve el aviso de precio |

**Segmentos.** Prioridad: Restaurante y Bar o cafetería con cocina. Hotel o colectividades y Catering u obrador se aceptan si cumplen las señales, sin campañas propias hasta tener datos. El alta ya recoge el tipo de negocio.

**A quién no le encaja hoy** (se dice con franqueza)

- Quien necesita varios locales con vista conjunta: hoy es un local por cuenta (decisión D2 sin tomar).
- Quien espera conexión directa con el TPV: hoy se importa un CSV de ventas.
- Quien espera que la herramienta prediga ventas o compras: no lo hace.
- Quien quiere mandar los albaranes por correo o por WhatsApp: hoy, foto o PDF desde la app.
- Quien necesita exportación contable (A3, Sage, Holded), Verifactu o SII: fuera de alcance.
- Quien necesita la app en catalán, una app nativa o uso sin conexión: hoy, solo castellano y en el navegador.

**Cómo se comprueba que el perfil es el correcto.** Cada alta responde unas preguntas (tipo, cómo lleva las compras, TPV, rol, objetivo). La consulta Q8 de [`medicion.md`](medicion.md) las cruza con quién llega al primer albarán. Tras las primeras altas se revisa si coinciden con este perfil y se ajusta.

## 3. Propuesta de valor y tres mensajes

**Propuesta de valor**

- ES: «RESTORA lee los albaranes de tu restaurante y te dice cuánto cuesta de verdad cada plato y cuándo un proveedor te sube el precio.»
- CA: «RESTORA llegeix els albarans del teu restaurant i et diu quant costa de debò cada plat i quan un proveïdor et puja el preu.»

Lema de marca, ya publicado: «El control inteligente de tu restaurante.» / «El control intel·ligent del teu restaurant.»

**Los tres mensajes**

| # | Mensaje | Función real y ruta en la app | Qué se enseña en 30 segundos | Límite que se dice sin que pregunten |
|---|---|---|---|---|
| 1 | ES: «Haz una foto al albarán y los precios quedan al día. Tú solo confirmas.» CA: «Fes una foto a l'albarà i els preus queden al dia. Tu només confirmes.» | Subir albarán, lectura, «Revisa el albarán» y «Confirmar y guardar». Rutas: `/compras/subir`, `/compras/[id]` | El albarán de ejemplo de la pantalla de subida, hasta «Albarán guardado» | Foto o PDF (hasta 10 archivos por subida), no por correo ni WhatsApp. Hasta confirmar no cambia ningún precio |
| 2 | ES: «Cuánto te cuesta de verdad cada plato, con tus precios de compra.» CA: «Quant et costa de debò cada plat, amb els teus preus de compra.» | Escandallos: coste por ración, merma por ingrediente, food cost frente a tu objetivo, plantillas, sugerencia de ingredientes y «PVP para un food cost del X %». Rutas: `/escandallos`, `/escandallos/nuevo`, `/escandallos/[id]` | La ficha de un plato: ingredientes, coste por ración, food cost y el PVP para un food cost concreto | Montar los escandallos es lo que más tiempo lleva: plantillas y sugerencias lo acortan, pero las cantidades las revisa la persona. El PVP lo pone la persona. El coste se recalcula al confirmar cada albarán |
| 3 | ES: «Entérate cuando un proveedor te sube el precio y qué platos lo notan.» CA: «Assabenta't quan un proveïdor et puja el preu i quins plats ho noten.» | Avisos de subida frente a la compra anterior, con platos afectados, coste extra al mes, food cost de la carta antes y después y proveedor alternativo más barato. Se pueden resolver o ignorar. Comparativa de proveedores por artículo. Rutas: `/hoy/avisos`, `/proveedores`, `/articulos/[id]` | Un aviso abierto, con «Valorar [plato]» y «Ver alternativas» | Compara con la compra anterior del artículo, no detecta tendencias. Hacen falta dos compras del mismo artículo. Los avisos se ven en la app, no llegan por correo |

**Pruebas de apoyo** (no son titulares)

- Inventario y pedidos (`/inventario`, `/inventario/pedidos`): stock, mínimo y consumo semanal, que escribe la persona; cobertura en días; aviso de «bajo mínimo»; pedido sugerido por proveedor, que envía la persona por WhatsApp o correo.
- Ventas (`/ventas`, `/ventas/importar`): importación del CSV del TPV y mapa de rentabilidad de los platos.
- Carta imprimible (`/carta`), equipo con tres roles (`/cuenta/usuarios`) y descarga de los datos en CSV (`/cuenta`).

**Qué se dice y qué no**

| Se dice | No se dice (el producto no lo hace hoy) |
|---|---|
| Haces una foto o subes el PDF y tú confirmas lo que ha leído | «Entra solo», «sin teclear nada», «sin intervención» |
| Compara con tu compra anterior | Detecta tendencias, rachas o anomalías; predice precios o ventas |
| Un local por cuenta | Varios locales o vista de grupo |
| Importas las ventas con el CSV de tu TPV | Se conecta a tu TPV; importa tus Excel |
| Te sugiere el pedido y lo envías tú por WhatsApp o correo | Pide solo al proveedor |
| Los avisos los ves dentro de la app | Te avisa por correo o con notificaciones |
| Montas tus escandallos con plantillas y sugerencias | Se actualiza sin que nadie confirme nada |
| 14 días de prueba, sin tarjeta | Escasez, urgencia o ofertas por tiempo limitado inventadas |
| Los ejemplos van etiquetados como «ejemplo» | Cifras de ahorro, medias del sector, resultados o nombres de clientes |
| La web está en castellano y catalán; la app, en castellano | App en catalán, app nativa o sin conexión |

## 4. Canales orgánicos primero

Orden de prioridad: contenido útil, comunidades, prescriptores, ferias y SEO local. Cada canal usa su `utm_*` ([`medicion.md`](medicion.md#2-convención-de-utm)).

### 4.1 Contenido útil

- **Para qué:** dar algo útil primero y recoger contactos con permiso, con la descarga de la checklist.
- **Activo que ya existe:** la checklist semanal de food cost (PDF de una página, doce casillas, en castellano y catalán), que la web entrega a cambio del correo. Fuente: `scripts/checklist.mjs` y `public/recursos/`.
- **Qué se publica:** una pieza corta por casilla. Las casillas de compras, escandallos, food cost y margen (1 a 4, 10 y 11) enlazan de forma natural con RESTORA. Las de recuento, mermas, caducidad y revisión de PVP se enseñan como buena práctica, sin vender RESTORA como solución.
- **Cada semana:**
  1. Lunes: elegir la casilla.
  2. Martes: escribir la pieza en castellano y en catalán (texto corto y, si hace falta, un ejemplo etiquetado «ejemplo»).
  3. Miércoles: publicar con enlace con `utm_*`.
  4. Viernes: responder comentarios y anotar alcance, clics y descargas.
- **Se mide con:** `utm_medium=organico`, `utm_campaign=checklist-aaaa-mm`; descargas de la checklist (`leads`, `kind = newsletter`).
- **Depende de:** perfiles creados por el propietario (kit en [`marca.md`](marca.md)); web publicada (D7) para que el enlace funcione; si algún día hay boletín, un sistema de envío y de baja (hoy no existe).
- **Cuidado:** sin cifras del sector ni ahorros prometidos. El pie del PDF dice «Hecho en Cataluña», un dato que el propietario aún no ha confirmado: debe confirmarlo antes de difundirlo.

### 4.2 Comunidades de hostelería

- **Para qué:** estar donde ya se habla de costes y aprender qué preguntan, sin vender.
- **Dónde:** grupos y foros de hostelería en redes y mensajería, asociaciones y gremios de restauración de la zona, escuelas de hostelería y comunidades de cocineros. La lista concreta (nombre, enlace, normas) se arma en las semanas 2 y 3; este plan no nombra ninguna.
- **Cada semana:**
  1. Buscar una conversación donde ya se pregunte por escandallos, food cost o precios de proveedores y aportar una respuesta útil, sin enlace salvo que las normas lo permitan.
  2. Una vez al mes, y solo si las normas lo permiten, compartir la checklist presentándote con claridad («hago una herramienta para esto»).
  3. Anotar en la hoja: comunidad, normas, fecha y resultado.
- **Se mide con:** `utm_source=comunidad`, `utm_medium=organico`, y contactos que llegan por mensaje directo.
- **Cuidado:** cumplir las normas de cada grupo, no abrir hilos de venta y no usar cuentas falsas ni reseñas inventadas.

### 4.3 Distribuidores y gestorías (prescriptores)

- **Para qué:** llegar a muchos restaurantes a través de quien ya los atiende.
- **Hipótesis a comprobar, no hechos:** una gestoría o asesoría gana si las compras de su cliente llegan ordenadas. Un distribuidor puede ver con recelo una herramienta que compara proveedores, así que con él se habla del control de costes del cliente y se empieza por quienes valoren que sus clientes entiendan lo que compran.
- **Qué se ofrece:** la checklist para sus clientes, una ficha de una página ([página comercial](materiales/pagina-comercial.md)) y, si el propietario lo ofrece, una demostración corta (el vídeo puede hacer ese papel). Sin comisiones ni pagos: cualquier incentivo es gasto y entra en el presupuesto de E4.
- **Cada semana:**
  1. Identificar [n] prescriptores nuevos, por zona y tipo de cliente.
  2. Contactar a [n] con un mensaje corto y personalizado.
  3. Seguir a los que han respondido y anotar cuántos de sus clientes acaban probando.
- **Se mide con:** `utm_source=gestoria` o `utm_source=distribuidor`, y `utm_medium=referido`.
- **Cuidado:** no hablar en nombre de nadie ni citar a un prescriptor sin su permiso por escrito.

### 4.4 Ferias y jornadas del sector

- **Para qué:** conocer a quien decide y conseguir conversaciones, no solo contactos.
- **En los 90 días solo se prepara:** lista de ferias y jornadas de hostelería (nombre, fecha, ciudad, a quién van y si la entrada es gratuita para profesionales); elegir como máximo [n a decidir por el propietario] y calendarizarlas; preparar el material digital (página comercial, QR con `utm_source=feria`, vídeo). No se compran entradas, stands ni material impreso hasta E4.
- **Cuándo:** semana 3, armar la lista; semana 9, elegir y calendarizar las que interesen; semana 10, confirmar fechas y acceso. En las demás semanas no hay trabajo de feria.
- **Cuidado:** este plan no nombra ninguna feria ni fecha. Se confirman en la web oficial de cada una.

### 4.5 SEO local

- **Para qué:** que quien busca «escandallo», «food cost» o «control de costes de un restaurante», en castellano o catalán, encuentre la web.
- **Qué ya hay:** sitemap con los dos idiomas, metadatos por página, datos estructurados y preguntas frecuentes (Task 31). Funciona cuando la web esté publicada (D7).
- **Cada semana:** revisar en Google Search Console (gratuito) qué consultas dan impresiones y clics; anotar las preguntas reales; convertir una en pregunta frecuente o en pieza de contenido, en castellano y catalán; comprobar que las páginas nuevas están en el sitemap.
- **Pendiente (Área D, con aprobación del propietario):** un sitio donde publicar piezas largas (hoy la web no tiene blog) y, si interesa, páginas por zona. La ficha de Google Business Profile puede necesitar datos de la empresa que siguen pendientes.
- **Cuidado:** es lento y depende de la web publicada. No se promete posición ni plazo.

## 5. Contacto en frío

**Antes del primer mensaje** (no es asesoramiento legal)

- **Correo y WhatsApp.** Según la LSSI (art. 21), el correo y los medios equivalentes, como WhatsApp, exigen en general consentimiento previo, salvo relación contractual previa. Hasta que el asesor legal lo valide, esos dos guiones se usan **solo con quien ya ha pedido algo**: descargó la checklist, escribió por el formulario o aceptó que le escribieras al conocernos. En frío: llamada o visita.
- **Cualquier contacto:** decir quién eres y de dónde sacaste el dato, ofrecer una salida en cada mensaje y apuntar a quien pide que no se le escriba más (derecho de oposición del RGPD).
- **Pie legal de los correos:** razón social, NIF y domicilio siguen pendientes. Sin ellos no sale ningún correo.
- Llamar entre servicios, no en horas de servicio ni en las semanas de más trabajo del local. No grabar ninguna llamada sin avisar.
- **Personalizar con un dato verdadero y observable** sobre su local. Si no hay, se quita esa frase. Nunca se inventa un dato.

### A · WhatsApp

**Castellano**

> Hola [nombre], soy [tu nombre], de RESTORA. Hacemos una herramienta para restaurantes: haces una foto al albarán y te dice cuánto cuesta de verdad cada plato y cuándo un proveedor te sube el precio.
>
> [Una frase verdadera sobre su local: «He visto que tenéis menú del día y carta de temporada».]
>
> ¿Te paso una checklist de food cost de una página? Es gratuita y no te compromete a nada. Si prefieres que no te escriba más, dímelo y no vuelvo a hacerlo.

**Català**

> Hola [nom], sóc [el teu nom], de RESTORA. Fem una eina per a restaurants: fas una foto a l'albarà i et diu quant costa de debò cada plat i quan un proveïdor et puja el preu.
>
> [Una frase certa sobre el seu local: «He vist que teniu menú del dia i carta de temporada».]
>
> Et passo una checklist de food cost d'una pàgina? És gratuïta i no et compromet a res. Si prefereixes que no t'escrigui més, digues-m'ho i no ho tornaré a fer.

**Si responde que sí.** ES: «Aquí la tienes: [archivo o enlace]. Si algún día quieres probar la herramienta: 14 días sin tarjeta, con tus propios albaranes → [enlace con utm]. Cualquier duda, por aquí.» CA: «Aquí la tens: [fitxer o enllaç]. Si algun dia vols provar l'eina: 14 dies sense targeta, amb els teus propis albarans → [enllaç amb utm]. Qualsevol dubte, per aquí.»

### B · Correo

**Castellano.** Asunto: «Una checklist de food cost de una página»

> Hola [nombre]:
>
> Soy [tu nombre], de RESTORA (restoraapp.app). Te escribo porque [motivo verdadero y concreto: «vi vuestra carta de temporada» / «nos conocimos en …» / «pediste la checklist»].
>
> RESTORA es una herramienta para restaurantes: haces una foto al albarán, la app lee los precios (tú confirmas) y te calcula lo que cuesta cada plato y cuándo un proveedor te sube el precio.
>
> No te pido una reunión. Si te interesa, te envío la checklist de food cost (una página, doce comprobaciones para revisar cada semana) y, si un día quieres probar la herramienta, son 14 días sin tarjeta.
>
> ¿Te la envío? Con responder «sí» basta. Si prefieres que no te escriba más, dímelo y no vuelvo a hacerlo.
>
> [tu nombre] · RESTORA · hola@restoraapp.com
> [Datos de la empresa: pendientes de confirmar por el propietario]

**Català.** Assumpte: «Una checklist de food cost d'una pàgina»

> Hola [nom]:
>
> Sóc [el teu nom], de RESTORA (restoraapp.app). T'escric perquè [motiu veritable i concret: «he vist la vostra carta de temporada» / «ens vam conèixer a …» / «vas demanar la checklist»].
>
> RESTORA és una eina per a restaurants: fas una foto a l'albarà, l'app en llegeix els preus (tu confirmes) i et calcula el que costa cada plat i quan un proveïdor et puja el preu.
>
> No et demano cap reunió. Si t'interessa, t'envio la checklist de food cost (una pàgina, dotze comprovacions per revisar cada setmana) i, si algun dia vols provar l'eina, són 14 dies sense targeta.
>
> Te l'envio? Amb respondre «sí» n'hi ha prou. Si prefereixes que no t'escrigui més, digues-m'ho i no ho tornaré a fer.
>
> [el teu nom] · RESTORA · hola@restoraapp.com
> [Dades de l'empresa: pendents de confirmar pel propietari]

### C · Llamada (30 a 40 segundos de apertura)

**Castellano**

1. **Apertura:** «Buenas, ¿hablo con [nombre]? Soy [tu nombre], de RESTORA. Te robo solo un minuto; si es mal momento, dime cuándo te viene mejor.»
2. **Motivo:** «Hacemos una herramienta para restaurantes: haces una foto al albarán y te dice cuánto cuesta cada plato y cuándo un proveedor te sube el precio. Te llamo porque [motivo verdadero].»
3. **Dos preguntas:** «¿Cómo lleváis hoy los albaranes: Excel, papel, un programa o de memoria?» «¿Quién se encarga de revisar los costes?» Se escucha y se apunta.
4. **Una propuesta:** «Si quieres, te mando por WhatsApp o por correo una checklist de food cost de una página y un enlace para probarlo 14 días sin tarjeta. ¿Cuál prefieres?»
5. **Cierre:** «Gracias por el rato. Si más adelante no quieres recibir nada nuestro, dímelo y lo apunto.»

**Català**

1. **Obertura:** «Bones, parlo amb [nom]? Sóc [el teu nom], de RESTORA. Et robo només un minut; si és mal moment, digue'm quan et va millor.»
2. **Motiu:** «Fem una eina per a restaurants: fas una foto a l'albarà i et diu quant costa cada plat i quan un proveïdor et puja el preu. Et truco perquè [motiu veritable].»
3. **Dues preguntes:** «Com porteu avui els albarans: Excel, paper, un programa o de memòria?» «Qui s'encarrega de revisar els costos?» S'escolta i s'apunta.
4. **Una proposta:** «Si vols, t'envio per WhatsApp o per correu una checklist de food cost d'una pàgina i un enllaç per provar-ho 14 dies sense targeta. Quin prefereixes?»
5. **Tancament:** «Gràcies pel temps. Si més endavant no vols rebre res nostre, digues-m'ho i ho apunto.»

**Después de cada llamada (2 minutos).** Apuntar en la hoja: fecha, canal, idioma, rol de la persona, cómo lleva hoy las compras, resultado, siguiente paso con fecha y si ha dado permiso para escribirle.

**Enlaces de los guiones.** `utm_source` = `whatsapp`, `correo` o `llamada`; `utm_medium=mensaje`; `utm_campaign=contacto-directo-aaaa-mm`; `utm_content` = `es-guion-a`, `ca-guion-b`… (idioma y guion).

### Preguntas que van a salir

| Pregunta | Respuesta honesta |
|---|---|
| ¿Cuánto cuesta? | 14 días de prueba sin tarjeta. El precio de la suscripción: [a decidir por el propietario, D1]. Hoy la web dice que se publicará y que se puede preguntar antes de empezar |
| ¿Tengo que cambiar de TPV? | No. Hoy se importan las ventas con un CSV del TPV; no hay conexión directa |
| ¿Funciona con varios locales? | Hoy, un local por cuenta, sin vista conjunta |
| ¿Está en catalán? | La web, sí. La app, hoy en castellano |
| ¿Quién me lo monta? | [A decidir por el propietario: arranque asistido.] La app no importa Excel; trae plantillas de platos y sugerencia de ingredientes |
| ¿Qué hacéis con mis fotos y mis datos? | La foto se envía al proveedor de IA que la lee. Los datos son del restaurante: puede descargarlos en CSV y borrar el negocio. [El texto legal lo valida el propietario o su asesor] |
| ¿Me avisa por correo? | Los avisos se ven dentro de la app |

## 6. Presupuesto escalonado

Es la estructura para cuando se active. **Ningún importe está fijado**: todos son «[a decidir por el propietario]». Los porcentajes son una propuesta de partida, sin datos propios detrás, y se revisan con los primeros resultados.

**Tramos**

| Tramo | Para qué | Importe | Se libera cuando | Parte del total |
|---|---|---|---|---|
| T0 · Orgánico | El calendario de 90 días | Sin gasto | Puerta de arranque del calendario | — |
| T1 · Prueba | Aprender qué canal y qué mensaje traen altas que llegan al primer albarán | [a decidir por el propietario] | E4 firmado | 20 % |
| T2 · Ampliar | Reforzar lo que funcionó en T1 | [a decidir por el propietario] | Criterios de paso cumplidos y nueva aprobación por escrito | 30 % |
| T3 · Escalar | Subir el ritmo con lo ya probado | [a decidir por el propietario] | Criterios de paso cumplidos y nueva aprobación por escrito | 40 % |
| Reserva | Imprevistos o repetir una prueba | [a decidir por el propietario] | Solo con aprobación expresa en cada uso | 10 % |
| **Total** | | [a decidir por el propietario] | | 100 % |

**Reparto dentro de cada tramo** (propuesta de partida)

| Concepto | Parte | Qué incluye |
|---|---|---|
| Búsqueda | 35 % | Anuncios para quien ya busca una solución, en castellano y catalán |
| Redes | 25 % | Anuncios en las redes donde existan los perfiles |
| Creatividades y páginas de destino | 20 % | Vídeo, imágenes y pruebas de la página a la que llega el anuncio |
| Prescriptores y eventos | 10 % | Entradas a ferias, material impreso y acciones con gestorías |
| Medición y pruebas | 10 % | Herramientas y cambios para medir mejor |

**Criterios de paso de un tramo al siguiente.** Se cumplen todos, medidos en las cohortes del tramo con la prueba ya terminada:

1. Coste por alta ≤ [umbral a fijar con los primeros datos].
2. De prueba a pago ≥ [umbral a fijar con los primeros datos], con al menos [n a fijar con los primeros datos] pruebas terminadas.
3. Retención de uso a 30 días ≥ [umbral a fijar con los primeros datos].
4. Soporte: respuestas dentro del plazo confirmado en al menos [porcentaje a decidir por el propietario] de los mensajes.
5. Recuperación: `coste por alta ÷ margen mensual por cliente ≤ [meses a decidir por el propietario]`, con `margen mensual por cliente = precio mensual sin IVA − comisión de cobro − coste de IA por local`. Los valores salen de D1 y de [`producto/docs/PRECIOS-Y-COSTES.md`](../../producto/docs/PRECIOS-Y-COSTES.md).

**Techo y parada**

- Techo de gasto por tramo y por mes: [a decidir por el propietario].
- Si el coste por alta supera [umbral a fijar con los primeros datos] durante [periodo a decidir por el propietario], se pausa la campaña y se revisa.
- Nada se gasta en un tramo hasta que el propietario apruebe por escrito su importe.

## 7. KPI

| KPI | Fórmula | De dónde sale el dato | Objetivo |
|---|---|---|---|
| **Coste por alta** | (gasto de marketing del periodo + coste de IA de las pruebas del periodo) ÷ altas verificadas del periodo | Gasto: facturas y paneles de las plataformas (no existe hasta E4). Coste de IA: Q6, en dólares: se pasa a euros con el tipo de la factura. Altas: Q1, y por canal con Q9 cuando exista P1. En orgánico, el gasto es [horas dedicadas × valor de la hora: a decidir por el propietario] | A fijar con los primeros datos |
| **De prueba a pago** | altas con la prueba terminada que han pagado ÷ altas con la prueba terminada | Q3 (`organizations`: `plan_status` y `trial_ends_at`). Por cohorte semanal | A fijar con los primeros datos |
| **Retención a 30 y 90 días, de uso** | activas a los N días ÷ altas con N días de vida | Q4 | A fijar con los primeros datos |
| **Retención a 30 y 90 días, de pago** | siguen pagando a los N días ÷ negocios que han pagado y tienen N días | Q5 (aproximación hasta P3) | A fijar con los primeros datos |
| Activación | altas verificadas con primer albarán ÷ altas verificadas | Q1 | A fijar con los primeros datos |
| Tiempo hasta el primer albarán y el primer escandallo | mediana de horas | Q2 | A fijar con los primeros datos |
| Contactos web por visita | (demo + mensaje + descargas) ÷ visitas | L1 y Cloudflare Web Analytics | A fijar con los primeros datos |

Los cuatro primeros son los que decide el presupuesto. Los tres últimos son indicadores adelantados: avisan antes de que haya pagos que medir. **Ningún KPI se interpreta con menos de [n a fijar con los primeros datos] altas en la cohorte.**

## 8. Calendario de 90 días

13 semanas, solo acciones orgánicas y preparatorias, **sin gasto**. La semana 1 es la que ordene el propietario.

**Puerta de arranque (recomendación, decisión 1 de la sección 9):** las semanas 1 y 2 solo preparan: no se publica ni se contacta a nadie. La salida (publicaciones desde la semana 3 y contacto directo desde la 4) empieza con A11 firmado, D7 hecho y el soporte atendido. El gasto publicitario sigue exigiendo E4 entero.

| Semana | Foco | Acciones | Entregable |
|---|---|---|---|
| S1 | Puesta a punto | Confirmar plazo de soporte y quién atiende. Crear la hoja del panel. Armar la lista de contactos con las señales del cliente ideal. Crear los perfiles de redes con el kit de marca (propietario) | Hoja y lista listas; perfiles creados |
| S2 | Contenido | Decidir qué casilla va cada semana. Escribir las tres primeras piezas en castellano y catalán. Revisar el PDF de la checklist | Tres piezas listas |
| S3 | Materiales | Cerrar con el propietario la página comercial y el guion del vídeo; grabar el vídeo. Preparar la plantilla de caso de cliente. Listas de comunidades, prescriptores y ferias, con normas y fechas. Publicar la primera pieza | Materiales aprobados; primera pieza |
| S4 | Salir | Pieza de la semana. Primeras aportaciones en comunidades. Primeros prescriptores. Contacto directo por llamada o visita (por mensaje, solo con permiso) | Primeras conversaciones apuntadas |
| S5 | Salir | Pieza de la semana. Vídeo en los perfiles y, con aprobación, en la web. Seguimiento de lo contactado | Vídeo publicado |
| S6 | Primer repaso | Pieza de la semana. Revisar Q1, Q2 y Q8 con los primeros datos. Ajustar guiones y mensajes | Notas de ajuste |
| S7 | Salir | Pieza de la semana. Segunda tanda de prescriptores. Search Console y una pregunta frecuente nueva | |
| S8 | Salir | Pieza de la semana. Si hay usuarios que cumplan los criterios de la plantilla, proponer un caso de cliente | |
| S9 | Repaso de mitad | Pieza de la semana. Q9 y KPI por canal, si P1 está aplicado. Decidir qué canal se refuerza y cuál se deja. Elegir las ferias que se preparan | Decisión por canal |
| S10 | Reforzar | Pieza de la semana. Más tiempo al canal elegido. Ferias: confirmar fechas y acceso de las elegidas | |
| S11 | Reforzar | Pieza de la semana. Seguimiento a todo lo que sigue abierto | |
| S12 | Cierre | Última pieza nueva. Cerrar los resultados por canal con los KPI | Informe de aprendizaje |
| S13 | Decisión | Repetir la pieza que mejor funcionó. Borrador de la propuesta del tramo T1 con datos reales. Decide el propietario: seguir en orgánico, ajustar o preparar E4 | Propuesta de T1 |

**Ritmo semanal fijo (desde S4):** lunes, panel de 15 minutos y pieza de la semana. Martes y miércoles, publicar y una aportación útil en una comunidad. Jueves, bloque de contactos y un prescriptor. Viernes, responder, anotar lo aprendido y preparar la semana. El tiempo semanal lo fija el propietario: [horas a la semana: a decidir por el propietario].

## 9. Decisiones del propietario

1. **Puerta de arranque del calendario orgánico.** La recomendación está en la sección 8. Puede preferir otra.
2. **Contacto en frío.** Validar con su asesor legal el correo y el WhatsApp (LSSI y RGPD). Sin datos de empresa para el pie, no sale correo.
3. **Presupuesto.** Importes, tramos, reparto, techo y criterios de paso (sección 6).
4. **Qué se responde a «¿cuánto cuesta?»** mientras D1 siga pendiente.
5. **Arranque asistido.** Si se ofrece ayuda para cargar recetas y proveedores (la web lo dice y el producto no tiene importador) y qué incluye. Condiciona el mensaje 2 y los guiones.
6. **Tiempo semanal** para el calendario y valor de la hora para el coste por alta orgánico.
7. **Soporte:** quién atiende y plazo (E4).
8. **Frases de la web sin confirmar**, que estos materiales evitan: «sin permanencia», «no cobramos alta», «Hecho en Cataluña», datos en la UE, cumplimiento del RGPD, la respuesta en 48 h y los rangos de comensales de «A quién le encaja» (apartado 3 de [`docs/AUDITORIA-CONVERSION.md`](../AUDITORIA-CONVERSION.md)).
9. **Perfiles de redes y teléfono nuevo:** los crea y facilita él.

## Fuentes

[`docs/superpowers/plans/2026-10-05-restora-roadmap.md`](../superpowers/plans/2026-10-05-restora-roadmap.md) (Área E) · [`docs/AUDITORIA-CONVERSION.md`](../AUDITORIA-CONVERSION.md) · [`docs/superpowers/mvp-terminado.md`](../superpowers/mvp-terminado.md) · [`producto/docs/DECISIONES.md`](../../producto/docs/DECISIONES.md) · [`marca.md`](marca.md) · [`imagenes.md`](imagenes.md) · [`medicion.md`](medicion.md) · [`condiciones-de-activacion.md`](condiciones-de-activacion.md). Materiales: [correos de la prueba](materiales/correos-prueba-14-dias.md), [página comercial](materiales/pagina-comercial.md), [plantilla de caso de cliente](materiales/caso-de-exito-plantilla.md) y [guion del vídeo](materiales/guion-video.md).
