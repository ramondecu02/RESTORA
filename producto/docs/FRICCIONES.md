# Fricciones detectadas

Recorriendo la app como un restaurante nuevo (alta, primer albarán, datos de ejemplo, todas las pantallas en móvil de 390 px y escritorio de 1280 px, y los flujos principales), esto es lo que chirriaba. Primero lo que ya está corregido; después lo que queda, ordenado por impacto, con la propuesta.

## Corregido durante las pruebas

| Dónde | Problema | Arreglo |
| --- | --- | --- |
| Hoy | El «ticket por comensal» mezclaba dos cálculos (por plato en el histórico, por comensal en el mes actual) y marcaba una caída falsa del 30 %. | Mismo criterio en toda la serie; si no hay comensales, «ticket medio» por plato. |
| Hoy, artículo, ventas | Los gráficos de línea y de dispersión encogían el texto hasta hacerlo ilegible en tarjetas estrechas. | Texto y puntos en HTML sobre el trazo: se leen igual a cualquier ancho. |
| Hoy | Con 9 familias el donut repetía colores; las tarjetas KPI cortaban la etiqueta («MARGE…») en móvil; «28,4 % → 28,7 %» partía línea. | Cinco familias con color y el resto en «Otras familias»; etiquetas a dos líneas; cifras compactas. |
| Todo | Cifras de cuatro dígitos sin separador de miles al lado de otras con él («8901 €» junto a «12.487 €»). | Miles siempre agrupados. |
| Carta | En escritorio, una familia por fila dejaba media pantalla vacía; las fotos de ejemplo tenían una línea blanca. | Rejilla continua con filtro por familia; fotos recortadas. |
| Avisos, compras | Listas truncadas con «…» seguido de punto («carabineros….»). | «A, B, C y 5 más». |
| Equipo (móvil) | El email se montaba sobre el selector de rol. | El rol va debajo del nombre en móvil. |
| Nuevo producto | Las plantillas tenían un hueco enorme a la izquierda. | Icono de tamaño fijo. |
| Facturación | Sin pagos configurados, el usuario veía nombres de variables de entorno. | Mensaje para el restaurante; los detalles técnicos, en la guía. |
| Datos de ejemplo | «Quitar datos de ejemplo» fallaba si habías usado algo de ejemplo (sub-recetas); lo mismo al eliminar el negocio. | Comprobación diferida en la base de datos y conservación transitiva de lo que usas. |
| Datos de ejemplo | Stock con residuos («24,001 L») y ventas incoherentes con los comensales. | Redondeo exacto; ventas escaladas a los comensales del local. |
| IVA | Los refrescos con azúcar se esperaban al 10 % (son el 21 % desde 2021) y lo que confirmabas no se recordaba: volvía a preguntar en cada albarán. | Categoría propia al 21 % y el artículo aprende el IVA confirmado. |
| Lectura | En producción, sin clave de API, se habrían rellenado albaranes reales con datos de ejemplo. | Sin clave, la lectura se desactiva con un mensaje claro y se puede apuntar a mano; los documentos de ejemplo siempre funcionan. |
| Facturación | Se prometía «exportar tus datos» sin que existiera. | Cuenta → Tus datos: CSV de artículos, proveedores, compras, escandallos y ventas. |

## Mejoras aplicadas después de la revisión

Cerrando las tres primeras fricciones y verificando la robustez de la revisión de código.

### 1. El primer albarán real decide si el usuario se queda — ✅ hecho
Una foto torcida, con sombras o de un papel arrugado daba más líneas «Decides tú».
- **Aplicado**: antes de subir, el móvil mide la foto (brillo y nitidez sobre una muestra reducida) y avisa «Oscura»/«Movida» con la sugerencia de repetirla con más luz, el papel plano y el móvil quieto. Nunca bloquea la subida (`src/lib/imgcheck.ts`, `src/components/uploader.tsx`, con pruebas).
- **Pendiente menor**: medir en producción cuántas decisiones pide cada albarán (`documentos.draft`) para ajustar el umbral del repaso con Opus.

### 2. Las unidades de compra se preguntan una vez por producto y proveedor — parcial
«¿Cuántos kg trae cada caja?» aparece la primera vez que un proveedor vende algo por caja, garrafa o estuche. Después se recuerda (mismo proveedor primero, si no otro) y ya no se vuelve a preguntar.
- **Aplicado**: en la revisión, cada línea ya emparejada muestra el último precio conocido y avisa de la subida o bajada, para detectar tanto un cambio real como un precio mal leído antes de guardar.
- **Pendiente**: el catálogo no guarda formato de envase, así que la primera vez sigue preguntándose; sugerir el factor desde la capa anónima cuando lo haya dejaría solo «Confirmar».

### 3. Los escandallos son el trabajo más largo — ✅ hecho
Subir la carta crea los platos con su precio, pero sin ingredientes.
- **Aplicado**: 35 plantillas por tipo de cocina (antes 6), buscables y ordenadas por las que ya tienes con precio; y sugerencia de ingredientes con IA a partir del nombre del plato, validada contra tu catálogo, para que solo ajustes cantidades (`src/lib/plantillas.ts`, `src/server/ocr`, `escandallos/actions.ts`).

## Robustez: estado de los arreglos parciales de la revisión de código

Verificado sobre la rama actual. Los seis puntos que quedaron a medias en la revisión están cerrados:

| Punto | Dónde | Estado |
| --- | --- | --- |
| Permisos de precio de carta (cocina no cambia PVP, coste ni margen) | `escandallos/actions.ts`, `recetas.ts` (`guardarRecetaTx`), `carta/actions.ts` (`importarCarta`) | Cerrado: el servidor fuerza precio nulo para roles sin `carta:precios` al crear, editar e importar. |
| Pedido → factura sin doble conteo de stock | `inventario/actions.ts` (`pedidoAbierto`, `recibirTx`, `estadoPedido`) | Cerrado: el pedido no se cierra al pasar a factura; queda enlazado y cuenta como recibido cuando esa factura se guarda; bloqueado si tiene una factura a medias. |
| Ingrediente del catálogo en la ficha | `recetas.ts` (`guardarRecetaTx`) | Cerrado: la elección queda pendiente y el artículo se crea dentro de la transacción del guardado; si se descarta el borrador no queda huérfano. |
| `coste_cache` desfasada tras importar ventas | `server/domain/ventas.ts` | Cerrado: `recomputeCosts` al importar y al borrar una importación que toca el PMP. |
| Archivos huérfanos en el almacén | `demo/seed.ts` (`quitarDemo`), `cuenta/actions.ts` → `storage.ts` (`deleteTenantFiles`) | Cerrado: se borran las fotos de ejemplo y toda la carpeta `t/<negocio>/` al eliminar el negocio. |
| k-anonimato de la capa anónima | `server/queries/bench.ts` | Mitigado y documentado: k=5 negocios, se excluye el propio, solo cuenta quien aporta ≥7 días reales (`created_at` del servidor) y los percentiles se publican redondeados. Riesgo residual (cuentas falsas) que solo cierra del todo el pago/verificación de cuentas. |

## Pendiente, por impacto

### 4. Las ventas dependen de que el TPV exporte por producto
Casi todos exportan CSV, pero no siempre es fácil encontrarlo. Sin ventas, la rentabilidad usa las unidades al mes que el usuario escribe en cada plato.
- **Propuesta**: guías cortas por TPV (Glop, Revo, Ágora, Cuiner, Square) enlazadas desde «Importar ventas».

### 5. El inventario solo es útil si se cuenta
Si no se actualiza el stock, los avisos de «bajo mínimo» se vuelven ruido. El consumo se estima con recetas y ventas, o con las compras de los últimos 3 meses.
- **Propuesta**: recordatorio semanal opcional de recuento, con una vista de «contar ahora» ordenada por estanterías.

### 6. Correo de verificación
El alta exige el código antes de empezar. Hasta que el dominio tenga reputación, algunos correos pueden ir a spam.
- **Propuesta**: SPF, DKIM y DMARC desde el primer día (ver guía) y, en la pantalla del código, «¿No te llega? Revisa spam o cambia el email» (ya hay «reenviar» y «cambiar email»).

### 7. El briefing no se puede saltar
Son tres pasos cortos y ordenan lo que se enseña en Hoy, pero alguien con prisa podría preferir saltarlos (el paso de proveedores sí se puede saltar).
- **Propuesta**: medir abandono en cada paso antes de decidir.

### 8. Rendimiento con cartas grandes
Hoy, Escandallos y Ventas recalculan el coste de todas las recetas en cada visita. Con un restaurante normal (40 artículos, 15 recetas) tarda entre 150 y 450 ms en desarrollo; con cientos de recetas conviene vigilarlo.
- **Propuesta**: si pasa de 1 s, servir los costes desde `coste_cache` (ya se guarda) y recalcular solo al cambiar precios o recetas.

### 9. Precio medio frente a último precio
La ficha usa el precio medio ponderado de lo que hay en el almacén; hay usuarios que esperan ver el último precio.
- **Propuesta**: ya se explica debajo del precio («Precio medio ponderado de tus compras»); si confunde, añadir un selector «medio / último» en Cuenta.
