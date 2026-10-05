# Decisiones de negocio pendientes de confirmar

Todo esto está implementado con un valor por defecto razonable. Cada punto dice qué hay ahora, por qué, y qué cambiar si decides otra cosa.

## 1. Coste de la lectura de albaranes

- **Ahora**: primera lectura con Claude Sonnet 5 (esfuerzo bajo). Si sale dudosa, repaso con Claude Opus 5. Sin límite mensual por negocio; solo un freno de 80 documentos por hora contra abusos.
- **Coste estimado**: ≈ 0,05 $ por albarán de media (0,03–0,05 $ sin repaso; 0,10–0,15 $ más si hay repaso). Un restaurante con 60 albaranes al mes: ≈ 3 $/mes. Con los precios actuales de la API (Sonnet 5: 2 $/10 $ por millón de tokens; Opus 5: 5 $/25 $). Hay que confirmarlo con documentos reales: la consulta está en `DESPLIEGUE.md`, paso 5.
- **A decidir**: ¿incluido sin límite en la cuota (como dice ahora Facturación: «sin límite razonable de uso») o con un tope por plan? Alternativas: Opus 5 siempre (más fiable, ≈ 2–3 veces más caro) o repasar menos (más barato, más líneas para revisar a mano). Se cambia con `OCR_MODEL`, `OCR_ESCALATE_MODEL` y `OCR_EFFORT`, sin tocar código.

## 2. Precio, prueba y qué pasa al terminarla

- **Ahora** (decidido en octubre de 2026): 14 días de prueba con todo incluido (`TRIAL_DAYS`), sin tarjeta. Al terminar la prueba sin suscripción, o con la suscripción cancelada, **la app se bloquea**: cualquier pantalla lleva a «/bloqueado» (suscribirse o, sin Stripe configurado, contacto para activarla) y solo quedan la cuenta (exportar datos, borrar el negocio, salir) y la facturación. Los tres últimos días de prueba hay aviso arriba. Un cobro fallido no bloquea: Stripe reintenta y se avisa. El precio lo defines en Stripe (la web anuncia «desde 89 €/mes» y una oferta de fundador).
- **A decidir**: ¿Precio con o sin IVA en la pasarela (Stripe Tax)? ¿La oferta de fundador como cupón de Stripe? ¿Aviso por correo antes de que termine la prueba?

## 3. Capa anónima de precios de referencia

- **Ahora**: cada precio de un albarán **real** (nunca los de ejemplo) de un producto del catálogo se guarda sin nombre de negocio, con un identificador cifrado irreversible, la semana y la provincia (dos primeras cifras del código postal). La ficha del artículo muestra el rango que pagan otros restaurantes **solo si hay al menos 5 negocios distintos** en las últimas 12 semanas, sin contar el tuyo, y cada negocio pesa lo mismo.
- **A decidir**: está activa por defecto para todos. Hay que mencionarla en las condiciones y en la política de privacidad; si prefieres pedir permiso expreso, hace falta un interruptor en Cuenta (no está hecho).

## 4. Pedidos a proveedores

- **Ahora**: la app calcula el **pedido sugerido** (lo que falta para cubrir dos semanas con el consumo previsto) y lo agrupa por proveedor, pero **no envía nada**: el usuario lo manda él por WhatsApp o email con el texto ya preparado, o lo guarda. Cumple la regla de «nada se pide solo».
- **A decidir**: si algún día quieres envío directo (email desde la app al proveedor), es un cambio pequeño; lo dejamos fuera a propósito.

## 5. Roles

| | Propietario | Responsable de costes | Cocina |
| --- | --- | --- | --- |
| Compras, artículos, inventario, escandallos | ✓ | ✓ | ✓ |
| Editar proveedores | ✓ | ✓ | ver |
| Precios de carta, ventas y rentabilidad | ✓ | ✓ | — |
| Datos del local, equipo, facturación, datos de ejemplo, borrar el negocio | ✓ | — | — |

- **A decidir**: ¿la cocina debe ver el coste de cada plato (escandallos)? Ahora sí, porque es quien los mantiene. Se cambia en `src/server/rbac.ts`.

## 6. Catálogo e IVA de compra

- **Ahora**: 283 productos habituales con su tipo de IVA por categoría (4 %, 10 %, 21 %), incluido el 21 % de los refrescos con azúcar o edulcorantes desde 2021. En cada línea del albarán la app compara el IVA impreso con el esperado; si no coinciden, pregunta, y lo que confirmes se queda en el artículo.
- **A decidir**: que un asesor fiscal revise el catálogo (casos frontera: zumos con o sin azúcar, cerveza sin alcohol, productos preparados).

## 7. Datos y privacidad

- **Ahora**: cada negocio puede descargar sus datos en CSV (Cuenta → Tus datos) y borrar el negocio entero con sus archivos. Siguiendo la guía, los datos viven en la UE (Neon y funciones de Vercel en Frankfurt); las fotos se envían a la API de Claude para leerlas (según las condiciones comerciales de Anthropic, los datos de la API no se usan para entrenar modelos).
- **A decidir**: texto de la política de privacidad (encargados: Vercel, Neon, Anthropic, Resend, Stripe) y cuánto tiempo guardar las fotos de los albaranes (ahora, hasta que el usuario borre el albarán o el negocio).

## 8. Decisiones del propietario (5 de octubre de 2026)

Respuestas a las decisiones D1–D6 del plan (`docs/superpowers/plans/2026-10-05-restora-roadmap.md`), con sus palabras:

- **Precios (D1) — pendiente.** «Para el tema de precios como producto hay que calcular qué comisión se llevaría Stripe por los cobros mensuales, y el coste por local
  aproximado sobre la API de Claude y la inteligencia.» → Hecho en [`PRECIOS-Y-COSTES.md`](PRECIOS-Y-COSTES.md) (Stripe ≈ 2,8–3,8 % del precio sin IVA al mes; IA ≈ 5 € por local y mes
  en un restaurante típico, 1,5–20 € según volumen). Faltan la elección de planes, nombres y precios.
- **Prueba gratuita (D3):** se mantienen los **14 días**.
- **Impago (D4):** se **bloquea a los 5 días de impago** (no 7). Aplica a la app; el aviso empieza el primer día (Task 23 del plan).
- **«Inteligencia» (D6):** se hace lo propuesto: **«Avisos» pasa a ser el centro de inteligencia** (priorizado por impacto en euros, con acción directa). Hoy no usa IA; si se le añade
  un modelo de lenguaje, el coste es ~0,45 € por local y mes.
- **Marca y redes (D5):** «redes sociales e imagen de marca se tienen que crear»: **no existen todavía**. La web no debe enseñar enlaces a redes hasta que existan; se prepara un kit
  de marca (avatar, portadas, imagen para compartir) para crearlas.
- **Web:** cambiar el teléfono (falta el número nuevo) y **rellenar la web con imágenes generadas**. Las imágenes generadas se usan como ambientación y producto, nunca como retratos de
  clientes o de equipo («testimonios» con caras inventadas) ni sellos de confianza.

## Fuera de alcance en esta versión

- Integración directa con TPV (se importan ventas en CSV, que exportan casi todos).
- Envío automático de pedidos a proveedores (a propósito, ver punto 4).
- Varios locales por negocio en la interfaz (la base de datos ya lo admite).
- Recibir albaranes por email reenviado o desde WhatsApp.
- Exportación contable (A3, Sage, Holded), Verifactu o SII.
- App nativa y modo sin conexión (es una web que funciona en el móvil con la cámara).
- Borrar la propia cuenta de usuario sin borrar el negocio (se hace por soporte).
- Interruptor para no participar en la capa anónima (punto 3).
