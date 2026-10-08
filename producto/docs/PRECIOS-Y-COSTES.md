# Precios y costes por local — para decidir los planes (D1)

> Preparado el 5 de octubre de 2026 a petición del propietario: «calcular qué comisión se llevaría Stripe por los cobros mensuales
> y el coste por local aproximado sobre la API de Claude y la inteligencia». **No propone precios**: da los números para elegirlos.
> Se recalcula con `node scripts/economia-por-local.mjs [precios…]` (los supuestos están arriba del script).

## Resumen

1. **Stripe se lleva entre el 2,8 % y el 3,8 % del precio sin IVA en un cobro mensual con tarjeta** (de 1,3 € a 5,9 € según el plan).
   Pesan tres cosas: la comisión de la tarjeta (1,5 % + 0,25 €; 1,9 % + 0,25 € si es de empresa), el 0,7 % de Stripe Billing (suscripciones)
   y que **todo se calcula sobre lo cobrado con IVA** (el 21 % de IVA no es ingreso, pero Stripe cobra comisión también sobre él).
   Con adeudo SEPA baja a ~1,8 %; con plan anual (un solo cobro) a ~2,7 %.
2. **La IA cuesta de 1,5 € a 20 € por local y mes, ~5 € en un restaurante típico.** Casi todo es la lectura de albaranes con visión:
   **≈ 8 céntimos por albarán** (rango 4–14 c), con Sonnet 5.5 y repaso con Opus 5.5 solo cuando la lectura sale dudosa.
   Leer la carta y sugerir ingredientes son céntimos al mes.
3. **«Inteligencia» (Avisos) hoy no usa IA**: se calcula con reglas sobre tus compras y tu carta, así que cuesta 0 €. Si más adelante se
   le añade un resumen semanal escrito por un modelo y preguntas a tus datos, son **~0,45 € por local y mes** (0,90 € con Opus).
4. **Con cualquier precio razonable el margen bruto es del 80–95 %** en un local típico. El riesgo no es el precio medio sino el
   **local de mucho volumen en un plan barato**: a 39–49 €/mes, un local grande deja un 43–54 % de margen. Por eso conviene que
   los planes se diferencien por **albaranes leídos al mes** (la única variable que mueve el coste) además de locales y usuarios.

## 1. Comisión de Stripe

**Tarifas usadas** (tarifa estándar para negocios del EEE; **no he podido verificarlas en stripe.com** desde este entorno —el acceso está
bloqueado—, salen de resúmenes públicos y de la página de ayuda de Stripe sobre precios del EEE; confírmalas en *Panel de Stripe → Ajustes →
Precios*, porque tu cuenta puede tener una tarifa propia):

| Concepto | Tarifa |
|---|---|
| Tarjeta de consumo Visa/Mastercard del EEE | 1,5 % + 0,25 € |
| Tarjeta de empresa o corporativa («premium») | 1,9 % + 0,25 € |
| Tarjeta de fuera del EEE / Reino Unido | 3,25 % + 0,25 € / 2,5 % + 0,25 € |
| Cambio de moneda | +2 % |
| Stripe Billing (suscripciones, el modo que usa la app) | 0,7 % del volumen recurrente, **además** de la comisión de cobro |
| Adeudo directo SEPA | 0,8 % con tope de 5 € (hay fuentes que lo dan al 0,35 %: confirmar) |
| Stripe Tax (opcional, no necesario para vender solo con IVA español del 21 %) | 0,5 % por transacción |
| Disputa (contracargo) | ~15 € por disputa, aunque se gane; se pierde además el importe si se pierde |
| Reembolso | no devuelve la comisión |

**Cómo se calcula:** `comisión = (precio × 1,21) × (porcentaje + 0,7 %) + fijo`. Ejemplo, plan de 89 € sin IVA: se cobran 107,69 € y
Stripe se queda 2,62 € con tarjeta estándar (1,5 % + 0,7 % = 2,2 % de 107,69 € = 2,37 € + 0,25 €), el 2,9 % del precio sin IVA.

| Precio sin IVA | Cobrado con IVA | Tarjeta estándar | Tarjeta de empresa | SEPA | Anual (2 meses gratis), por mes |
|---:|---:|---:|---:|---:|---:|
| 39,00 € | 47,19 € | 1,29 € (3,3 %) | 1,48 € (3,8 %) | 0,71 € (1,8 %) | 0,89 € (2,7 %) |
| 49,00 € | 59,29 € | 1,55 € (3,2 %) | 1,79 € (3,7 %) | 0,89 € (1,8 %) | 1,11 € (2,7 %) |
| 69,00 € | 83,49 € | 2,09 € (3,0 %) | 2,42 € (3,5 %) | 1,25 € (1,8 %) | 1,55 € (2,7 %) |
| 89,00 € | 107,69 € | 2,62 € (2,9 %) | 3,05 € (3,4 %) | 1,62 € (1,8 %) | 2,00 € (2,7 %) |
| 99,00 € | 119,79 € | 2,89 € (2,9 %) | 3,36 € (3,4 %) | 1,80 € (1,8 %) | 2,22 € (2,7 %) |
| 129,00 € | 156,09 € | 3,68 € (2,9 %) | 4,31 € (3,3 %) | 2,34 € (1,8 %) | 2,88 € (2,7 %) |
| 149,00 € | 180,29 € | 4,22 € (2,8 %) | 4,94 € (3,3 %) | 2,70 € (1,8 %) | 3,33 € (2,7 %) |
| 179,00 € | 216,59 € | 5,01 € (2,8 %) | 5,88 € (3,3 %) | 3,25 € (1,8 %) | 3,99 € (2,7 %) |

**Lecturas:**
- A precios bajos pesa más el fijo de 0,25 €; a precios altos, el porcentaje.
- Muchos hosteleros pagan con **tarjeta de empresa**: es el caso a presupuestar (columna 4).
- **SEPA ahorra casi la mitad**, y los restaurantes están acostumbrados a domiciliar pagos; el coste es que tarda unos días en confirmarse y
  puede devolverse hasta 8 semanas después (hay que decidir si se da acceso mientras tanto).
- **El plan anual** (un cobro al año) reduce el porcentaje efectivo y la rotación.
- El IVA lo cobra y lo declara RESTORA: no es coste, pero **sí reduce lo que se ve del precio** si se anuncia con IVA incluido.

## 2. Coste de la IA por local (API de Claude)

**Qué usa IA hoy** (todo en `src/server/ocr/index.ts`):

| Uso | Modelo | Cuándo |
|---|---|---|
| Leer albaranes y facturas (foto o PDF → líneas, precios, IVA) | Sonnet 5.5, esfuerzo medio; si sale dudoso, **repaso con Opus 5.5** (esfuerzo alto) | cada documento que se sube |
| Leer la carta (foto o PDF → platos y precios) | Sonnet 5.5, esfuerzo bajo | 1–2 veces al empezar |
| Sugerir ingredientes de un plato | Sonnet 5.5, esfuerzo bajo, solo texto (catálogo de 283 artículos) | al montar escandallos |
| «Inteligencia» (Avisos, panel Hoy) | **sin IA**: reglas y cálculos | siempre |

**Precios de la API** (USD por millón de tokens, [página de precios de Anthropic](https://platform.claude.com/docs/en/about-claude/pricing), consultada el 5/10/2026):
Sonnet 5.5 **2 / 10** (entrada / salida) · Opus 5.5 **4 / 20** · Haiku 4.5 1 / 5 · Opus 5 5 / 25 · Fable 5.1 10 / 50. Lotes (Batch) −50 %; caché de prompt: lectura al 10 %.

**Lo medido en el código:**
- Prompt del sistema: 2.999 caracteres (~940 tokens) + esquema JSON de la salida: 4.347 caracteres (~1.360 tokens) → **~2.400 tokens fijos** por lectura.
- La app reduce la foto a 2.200 px de lado largo; Claude cuenta ⌈ancho/28⌉ × ⌈alto/28⌉ «tokens visuales» → **~4.660 tokens por página** (el tope del modelo es 4.784).
- Salida: el JSON de un albarán de 12–25 líneas son 1.000–2.000 tokens; **lo que el modelo «piensa» antes de contestar también cuenta como salida** y es lo único que no
  se puede medir sin datos reales: se modela como un rango (2.500 – 4.000 – 7.000 tokens por lectura con Sonnet).

**Escenarios por local y mes** (1 USD = 0,90 €):

| Escenario | Albaranes/mes | Entrada por albarán | Por albarán (Sonnet + repaso Opus) | Albaranes | Carta | Sugerencias | **Total** |
|---|---:|---:|---:|---:|---:|---:|---:|
| Local pequeño (bar, menú del día) | 30 | 7.526 tokens | 0,042 € | 1,38 € | 0,01 € | 0,14 € | **1,54 €** |
| Restaurante típico | 60 | 8.458 tokens | 0,077 € | 5,11 € | 0,01 € | 0,29 € | **5,41 €** |
| Local grande (mucho volumen) | 120 | 9.390 tokens | 0,142 € | 18,79 € | 0,02 € | 0,86 € | **19,67 €** |

(Supuestos por escenario: páginas por albarán 1,1 / 1,3 / 1,5; repasos con Opus 5 % / 15 % / 25 %; +10 % de lecturas repetidas.)
**Peor caso de un solo documento** (3 páginas, con repaso de Opus y mucho «pensamiento»): ~0,40 €.

**«Inteligencia» con un modelo de lenguaje** (opcional, no existe hoy): resumen semanal escrito (3.500 tokens de entrada, 700 de salida) ≈ 0,05 € al mes;
20 preguntas al mes a tus datos (6.000 + 1.000) ≈ 0,40 €. **Total ≈ 0,45 € por local y mes con Sonnet 5.5; 0,90 € con Opus 5.5.** No cambia ninguna decisión de precio.

**Cómo calibrarlo con datos reales** (la app guarda tokens y coste de cada lectura en `documentos`). En el editor SQL de Neon:

```sql
-- Coste real de lectura por mes: media, percentil 90 y % de documentos que necesitaron repaso con Opus
select to_char(date_trunc('month', created_at), 'YYYY-MM') as mes, count(*) as lecturas,
       round(avg(ocr_cost_usd)::numeric, 4) as medio_usd,
       round((percentile_cont(0.9) within group (order by ocr_cost_usd))::numeric, 4) as p90_usd,
       round(avg(ocr_input_tokens)) as entrada_media, round(avg(ocr_output_tokens)) as salida_media,
       round(100.0 * count(*) filter (where ocr_model like '%opus%') / count(*), 1) as pct_repaso_opus,
       round(sum(ocr_cost_usd)::numeric, 2) as total_usd
from documentos where ocr_cost_usd > 0 group by 1 order by 1;
-- Lo mismo por local: añade local_id al select y al group by.
```

**Palancas para bajar el coste si hiciera falta** (no aplicadas; cada una necesita comprobar la calidad con los albaranes de prueba): esfuerzo bajo en documentos
limpios; caché del prompt fijo (−90 % en esos ~2.400 tokens cuando se suben varios seguidos); reducir el lado largo de la foto de 2.200 a 1.600 px (−45 % de tokens
visuales, con riesgo en letra pequeña); primera pasada con Haiku 4.5 (−50 % o más, con más repasos). Hoy no compensa: el coste es una fracción pequeña del precio.

## 3. Lo que queda por local y mes

`precio sin IVA − Stripe (tarjeta de empresa) − IA − 1 € de infraestructura por local` (la infraestructura real —Vercel, Neon, Blob, Resend— es sobre todo fija
al principio: ~70–100 €/mes en total, que pesa hasta unos 30 locales).

| Precio sin IVA | Stripe | Margen con IA baja (1,54 €) | con IA típica (5,41 €) | con IA alta (19,67 €) |
|---:|---:|---:|---:|---:|
| 39,00 € | 1,48 € | 34,99 € (90 %) | 31,11 € (80 %) | 16,85 € (43 %) |
| 49,00 € | 1,79 € | 44,67 € (91 %) | 40,80 € (83 %) | 26,54 € (54 %) |
| 69,00 € | 2,42 € | 64,04 € (93 %) | 60,17 € (87 %) | 45,91 € (67 %) |
| 89,00 € | 3,05 € | 83,41 € (94 %) | 79,54 € (89 %) | 65,28 € (73 %) |
| 99,00 € | 3,36 € | 93,10 € (94 %) | 89,23 € (90 %) | 74,96 € (76 %) |
| 129,00 € | 4,31 € | 122,16 € (95 %) | 118,28 € (92 %) | 104,02 € (81 %) |
| 149,00 € | 4,94 € | 141,53 € (95 %) | 137,65 € (92 %) | 123,39 € (83 %) |
| 179,00 € | 5,88 € | 170,58 € (95 %) | 166,71 € (93 %) | 152,45 € (85 %) |

## 4. Qué implica para decidir los planes (D1)

- **El coste no limita el precio**: ni el de cobrar (3–4 %) ni el de la IA (~5 € típico). El precio se decide por valor y posicionamiento.
- **La variable que mueve el coste es el número de albaranes leídos al mes** (≈ 8 céntimos cada uno): es la forma natural de diferenciar planes sin tocar el valor percibido
  (por ejemplo, «hasta N albaranes al mes incluidos»; pasado el límite, avisar y ofrecer cambiar de plan, nunca cortar la lectura sin avisar).
- **Un cobro por local** encaja con los costes (la IA y el almacenamiento escalan por local). Si se decide multi-local (D2), conviene un precio por local adicional.
- **Ofrecer SEPA y plan anual** recorta la comisión a la mitad y ayuda a la retención.
- **Pendiente del propietario:** cuántos planes, nombres, precios (mensual y anual), si se anuncian con o sin IVA, si el plan lleva límite de albaranes y si hay precio por local adicional.

## 5. Límites de este cálculo

- Las tarifas de Stripe no se han podido contrastar en su web (bloqueada desde este entorno): hay que confirmarlas en el panel antes de fijar precios.
- Los tokens de salida («pensamiento» del modelo) son una estimación; la primera semana con usuarios reales se calibra con la consulta SQL de arriba.
- Cambios de precio de Anthropic o del tipo de cambio mueven los resultados; el script se vuelve a ejecutar en segundos.

## 6. Planes elegidos por el propietario (8 de octubre de 2026)

Decisión del propietario: tres planes, **Premium 49,90 €/mes** (un solo local), **Pro 89,90 €/mes** (más funcionalidades y posibilidad de más de un local) y
**Max 149,90 €/mes** (grupos más grandes, todas las funcionalidades). Esto resuelve D1 en lo esencial y, de hecho, **da por buena la idea de varios locales (D2)**
en Pro y Max. Lo que sigue son **propuestas para cerrar los límites**; los precios no cambian.

**Supuesto a confirmar: los precios son sin IVA** (lo normal al vender a empresas). Si fueran con IVA incluido, la base sería 41,24 € / 74,30 € / 123,88 € y el margen bajaría 8,7 € / 15,6 € / 26,0 € por cliente.

**Comisión de Stripe y margen de un local típico** (calculado con `node scripts/economia-por-local.mjs 49.9 89.9 149.9`; tarjeta de empresa, 1 € de infraestructura por local):

| Plan | Precio | Stripe tarjeta empresa | Con SEPA | Margen con IA típica (5,41 €) | con IA alta (19,67 €) |
|---|---:|---:|---:|---:|---:|
| Premium | 49,90 € | 1,82 € (3,6 %) | 0,91 € | 41,67 € (84 %) | 27,41 € (55 %) |
| Pro | 89,90 € | 3,08 € (3,4 %) | 1,63 € | 80,41 € (89 %) | 66,15 € (74 %) |
| Max | 149,90 € | 4,97 € (3,3 %) | 2,72 € | 138,53 € (92 %) | 124,26 € (83 %) |

**El riesgo no es el precio, es el volumen de albaranes en los planes con varios locales.** Si Pro o Max contaran albaranes ilimitados por local, un grupo con 3 o 10 locales
grandes se comería el margen (Max con 10 locales a 600 albaranes y coste alto: 33 %). Por eso se propone un **cupo mensual de albaranes leídos, compartido por todos los locales del plan**
(≈ 0,08 € por albarán, hasta 0,14 € en los grandes), con aviso al llegar al 80 % y opción de ampliar, nunca corte sin avisar:

| Plan | Locales | Albaranes leídos/mes (compartidos) | Margen con el cupo lleno, coste típico / alto | Margen con uso normal (60 por local) |
|---|---:|---:|---:|---:|
| Premium | 1 | 80 | 82 % / 72 % | 84 % |
| Pro | hasta 3 | 250 | 72 % / 54 % | 77 % |
| Max | hasta 5 (+ locales extra a precio por local) | 450 | 70 % / 51 % | ≈ 70 % |

- **Local adicional** en Max (y, si se quiere, en Pro): entre 19,90 € y 24,90 € al mes con 80 albaranes más incluidos cubre su coste (≈ 6–11 € de IA + 1 € de infraestructura + comisión) con ≥ 50 % de margen.
- **Paquete extra de albaranes:** cuesta 8–14 € por cada 100 leídos. Ofrecerlo a 19 € cada 100 deja ≥ 25 % incluso en el peor caso.
- **Lo que no cambia con el plan** (coste casi cero): escandallos, carta, inventario, ventas, avisos, exportaciones. Se diferencian por **valor**, no por coste.
- **SEPA y plan anual** recortan la comisión a la mitad y mejoran la retención: ofrecer 2 meses gratis en el anual (Premium 499 €, Pro 899 €, Max 1.499 €) no compromete ningún margen de la tabla.
- **El plan gratuito de prueba (14 días)** cuesta, como mucho, 0,3–0,6 € de IA por negocio si lee unos 5 albaranes al día.

**Funcionalidades que diferencian los planes** (a elegir por el propietario; solo lo marcado «existe» está hoy en la app):

| Funcionalidad | Premium | Pro | Max |
|---|:---:|:---:|:---:|
| Lectura de albaranes y facturas con IA (existe) | 80/mes | 250/mes | 450/mes |
| Artículos, precios, avisos de subida, proveedores (existe) | ✓ | ✓ | ✓ |
| Escandallos, elaboraciones, carta y margen de bebidas (existe) | ✓ | ✓ | ✓ |
| Inventario y pedidos, ventas y rentabilidad (existe) | ✓ | ✓ | ✓ |
| Usuarios y roles (existe) | hasta 3 | hasta 10 | sin límite |
| Más de un local con panel conjunto (por construir, D2) | — | hasta 3 | hasta 5 + extra |
| Comparar proveedores y proponer pedido (ampliar lo que existe) | — | ✓ | ✓ |
| Informe mensual en PDF para el propietario o la gestoría (por construir) | — | ✓ | ✓ |
| Previsión de compras y de stock con ventas importadas (por construir) | — | ✓ | ✓ |
| Compras y proveedores comunes entre locales, roles por local (por construir) | — | — | ✓ |
| Exportación para contabilidad y acceso por API (por construir) | — | — | ✓ |
| Soporte: estándar / prioritario / con alta guiada | email | prioritario | alta guiada |

**Orden de construcción propuesto:** 1) cupo de albaranes y límites por plan en la app (lo que sostiene el margen); 2) Stripe con los tres precios (mensual y anual); 3) varios locales (B4–B6); 4) informe mensual y comparador de proveedores; 5) previsión de compras; 6) exportación contable y API.
