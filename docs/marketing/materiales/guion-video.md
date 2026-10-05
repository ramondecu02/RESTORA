# Guion del vídeo de presentación (45 a 60 s)

> **Plan, no activado.** · 5/10/2026 · Guion para una grabación de pantalla de la app con datos de ejemplo. No se graba, publica ni sube a ninguna plataforma hasta que el propietario lo apruebe. Hoy la web enseña la miniatura con «Próximamente» (`VIDEO_EMBED_URL` vacío en `lib/site.ts`). La publicidad está **planificada, NO activada**: el vídeo no se usa en anuncios hasta firmar [E4](../condiciones-de-activacion.md).

## Ficha

| | |
|---|---|
| Duración | 59 s (rango permitido: 45 a 60 s) |
| Formato | 16:9, 1920×1080, como la miniatura de la web |
| Sonido | Sin voz en off. Se entiende sin sonido. Música: opcional y libre de derechos, a decidir por el propietario |
| Idiomas | Subtítulos en castellano y catalán, como pistas separadas y como dos versiones con el texto incrustado. La interfaz de la app se ve en castellano en las dos, porque la app solo está en castellano |
| Datos | De ejemplo, con la etiqueta «Datos de ejemplo» / «Dades d'exemple» visible en todo el vídeo |
| Personas, logotipos de terceros, datos reales | Ninguno |
| Cómo se graba | Playwright con `recordVideo` sobre cuentas de prueba, reproducible (ver [`imagenes.md`](../imagenes.md)) |

## Reglas

- Cada plano es una pantalla de la app que existe hoy. Si la app cambia, se regraba ese plano.
- No se enseña nada que el producto no haga: conexión con el TPV, predicción, varios locales, pedidos automáticos.
- Ninguna cifra se presenta como resultado: las del vídeo son de la cuenta de ejemplo y lo dice la etiqueta.
- No se enseñan Facturación ni pantallas de pago (Stripe está apagado), ni correos, ni datos reales.

## Plano a plano

| # | Tiempo | Pantalla de la app | Qué se ve y qué hace el cursor | Texto en pantalla (ES) | Texto en pantalla (CA) |
|---|---|---|---|---|---|
| 1 | 0:00–0:04 | Tarjeta de título: fondo de marca `#1E3D2F`, símbolo y logotipo del kit de [`marca.md`](../marca.md) | Logotipo y lema. Aparece la etiqueta «Datos de ejemplo» abajo a la izquierda y se queda hasta el final | El control inteligente de tu restaurante. | El control intel·ligent del teu restaurant. |
| 2 | 0:04–0:11 | «Subir albarán» (`/compras/subir`) | El cursor pulsa «Probar con un albarán de ejemplo» (Distribuciones Martínez · 12 líneas) y empieza la subida | Haz una foto al albarán o sube el PDF. | Fes una foto a l'albarà o puja el PDF. |
| 3 | 0:11–0:16 | «Leyendo el albarán» (`/compras/[id]`) | Se ven los pasos: «Leyendo proveedor, fecha y líneas», «Contrastando el IVA con el desglose», «Emparejando con tus artículos» y «Comprobando que los totales cuadran» | RESTORA lee proveedor, fecha, líneas y precios. | RESTORA llegeix proveïdor, data, línies i preus. |
| 4 | 0:16–0:25 | «Revisa el albarán» (`/compras/[id]`) | Líneas leídas con sus etiquetas (por ejemplo «IVA 10 % · coincide»). Se resuelve con un clic cada decisión que pida la pantalla y se pulsa «Confirmar y guardar» | Tú revisas y confirmas. Hasta entonces no cambia ningún precio. | Tu revises i confirmes. Fins llavors no canvia cap preu. |
| 5 | 0:25–0:32 | «Albarán guardado» (`/compras/[id]` tras guardar) | La tarjeta de resumen: «Ojo con esto» con la subida de un producto y «Ver el impacto» o, si no hay subidas, «Tu primer dato útil» con platos habituales y su coste | Al guardar, los precios quedan al día. | En desar, els preus queden al dia. |
| 6 | 0:32–0:40 | Ficha de un plato (`/escandallos/[id]`), en la cuenta con datos de ejemplo | Ingredientes con sus cantidades, coste por ración, «Food cost objetivo» y «PVP para un food cost del X %». El cursor recorre la ficha de arriba abajo | Cada plato, con su coste real y su food cost. | Cada plat, amb el seu cost real i el seu food cost. |
| 7 | 0:40–0:48 | «Avisos» (`/hoy/avisos`) | El primer aviso abierto: producto y proveedor, platos afectados, «Coste extra al mes» y «Food cost de la carta» antes y después. Se ven «Valorar [plato]» y «Ver alternativas» (hay que elegir un aviso que tenga proveedor alternativo) | Si un proveedor sube el precio, ves qué platos afecta y cuánto suma al mes. | Si un proveïdor puja el preu, veus quins plats afecta i quant suma al mes. |
| 8 | 0:48–0:54 | «Hoy» (`/hoy`) | «Requiere tu atención» y el panel «Cómo va el mes». Recorrido lento, sin pulsar nada | Y cada mañana, en Hoy, lo que pide tu atención. | I cada matí, a la pantalla Hoy, el que demana la teva atenció. |
| 9 | 0:54–0:59 | Tarjeta final | Símbolo y dirección. En la versión catalana, un último subtítulo: «L'app és en castellà.» | Pruébalo 14 días, sin tarjeta. restoraapp.app | Prova-ho 14 dies, sense targeta. restoraapp.app |

**Dos notas de producción**

- **El plano 5 depende de los datos.** Con el primer albarán de una cuenta nueva sale «Tu primer dato útil»; si el albarán trae una subida de precio, sale «Ojo con esto». El subtítulo vale para las dos. La subida de precio se enseña de todos modos en el plano 7.
- **El plano 3 es una espera.** Con el albarán de ejemplo apenas dura un segundo; con una foto real dura lo que tarde la lectura. Se muestra unos 5 s: si una espera real se acorta o se alarga en el montaje, se pone la etiqueta «Acelerado» en pantalla.

## Subtítulos

**Castellano (`.srt`)**

```
1
00:00:00,500 --> 00:00:03,800
El control inteligente
de tu restaurante.

2
00:00:04,300 --> 00:00:10,700
Haz una foto al albarán
o sube el PDF.

3
00:00:11,200 --> 00:00:15,700
RESTORA lee proveedor, fecha,
líneas y precios.

4
00:00:16,200 --> 00:00:24,700
Tú revisas y confirmas.
Hasta entonces no cambia ningún precio.

5
00:00:25,200 --> 00:00:31,700
Al guardar, los precios
quedan al día.

6
00:00:32,200 --> 00:00:39,700
Cada plato, con su coste real
y su food cost.

7
00:00:40,200 --> 00:00:47,700
Si un proveedor sube el precio, ves qué
platos afecta y cuánto suma al mes.

8
00:00:48,200 --> 00:00:53,700
Y cada mañana, en Hoy,
lo que pide tu atención.

9
00:00:54,200 --> 00:00:58,700
Pruébalo 14 días, sin tarjeta.
restoraapp.app
```

**Català (`.srt`)**

```
1
00:00:00,500 --> 00:00:03,800
El control intel·ligent
del teu restaurant.

2
00:00:04,300 --> 00:00:10,700
Fes una foto a l'albarà
o puja el PDF.

3
00:00:11,200 --> 00:00:15,700
RESTORA llegeix proveïdor, data,
línies i preus.

4
00:00:16,200 --> 00:00:24,700
Tu revises i confirmes.
Fins llavors no canvia cap preu.

5
00:00:25,200 --> 00:00:31,700
En desar, els preus
queden al dia.

6
00:00:32,200 --> 00:00:39,700
Cada plat, amb el seu cost real
i el seu food cost.

7
00:00:40,200 --> 00:00:47,700
Si un proveïdor puja el preu, veus quins
plats afecta i quant suma al mes.

8
00:00:48,200 --> 00:00:53,700
I cada matí, a la pantalla Hoy,
el que demana la teva atenció.

9
00:00:54,200 --> 00:00:56,700
Prova-ho 14 dies, sense targeta.
restoraapp.app

10
00:00:56,800 --> 00:00:58,800
L'app és en castellà.
```

## Preparación y grabación

1. **Dos cuentas de prueba nuevas**, con correos del propietario o de un dominio de pruebas y sin ningún dato real.
   - **Cuenta A**, recién creada y sin datos de ejemplo: planos 2 a 5.
   - **Cuenta B**, con «Mi local» → «Cargar datos de ejemplo»: planos 6 a 8. Hoy y Avisos necesitan datos para tener algo que enseñar.
2. **Antes de grabar:** descartar los recorridos guiados de las pantallas que se graban, para que no tapen nada; ensayar el recorrido una vez; tema claro; ventana de 1920×1080. Playwright no dibuja el cursor: se superpone un punto que se mueve de forma animada.
3. **La lectura.** El albarán de ejemplo de la app lleva su lectura guardada: es la misma pantalla y el mismo flujo que con una foto real, pero no llama a la IA. Si el propietario prefiere una lectura de verdad, se graban los planos 3 y 4 con un albarán de prueba inventado, sin datos de ningún proveedor real, y se anota en la ficha técnica.
4. **Ficha técnica.** Se guardan el vídeo, las pistas de subtítulos y una nota con la fecha de grabación, la versión de la app y las cuentas usadas, para poder regrabar un plano cuando cambie la pantalla.

## Dónde se publica (cuando el propietario lo apruebe)

- **Web.** Se pone la dirección del vídeo en `VIDEO_EMBED_URL` (`lib/site.ts`). Hoy está vacío y la home enseña la miniatura con «Próximamente». Es un cambio de la web (Área D) y se publica con su aprobación.
- **Descripción (ES):** «Así funciona RESTORA con datos de ejemplo: de la foto de un albarán al coste de tus platos y a los avisos de precio. Pruébalo 14 días, sin tarjeta: [enlace con utm]. La app está en castellano; la web, en castellano y catalán.»
- **Descripció (CA):** «Així funciona RESTORA amb dades d'exemple: de la foto d'un albarà al cost dels teus plats i als avisos de preu. Prova-ho 14 dies, sense targeta: [enllaç amb utm]. L'app és en castellà; el web, en castellà i en català.»
- **Enlace de la descripción:** `utm_source=youtube`, `utm_medium=organico`, `utm_campaign=video-aaaa-mm`, `utm_content=es-descripcion` o `ca-descripcion` ([`medicion.md`](../medicion.md#2-convención-de-utm)).
- No se sube a ninguna plataforma de anuncios hasta firmar E4.

## Comprobación antes de darlo por bueno

- [ ] Cada plano coincide con la pantalla de la app el día de la grabación.
- [ ] La etiqueta «Datos de ejemplo» se ve en todos los planos.
- [ ] No sale ningún dato real, correo, teléfono ni cliente.
- [ ] No se menciona nada que el producto no haga.
- [ ] Los subtítulos en castellano y catalán se leen enteros sin prisa.
- [ ] La versión catalana avisa de que la app es en castellano.
- [ ] Dura entre 45 y 60 s.
