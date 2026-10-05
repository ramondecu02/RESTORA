# Rendimiento con 50 negocios

> **Estado: medido en local, sin red.** Postgres 16 en la misma máquina que el servidor de medida, con 50 negocios sintéticos y 1,3 millones de filas. **No hay ninguna medida en Neon**: lo que añade la red se estima en el apartado 5 a partir de las sentencias que manda cada pantalla, y medirlo con la cuenta del propietario queda pendiente (apartado 8). Las cifras salen de una máquina de desarrollo compartida (4 procesadores, otros procesos a ratos): sirven para comparar antes y después y para ver órdenes de magnitud, con un margen de ±10-15 % entre pasadas.

Es el punto B7 del plan (Task 18): cuánto tardan Hoy, Compras y Escandallos con 50 negocios en la misma base de datos, qué dicen los planes de las consultas más pesadas y qué índices faltaban. Todo se repite con los comandos del apartado 1.

## Resumen

- **Un negocio normal va sobrado.** Con una persona, el servidor tarda unos **45 ms en Hoy, 19 ms en Compras y 23 ms en Escandallos** (p50; p95 de 57, 27 y 29 ms), sin contar la red ni el pintado de React. Con 10 personas a la vez sobre las 5 conexiones del pool de la app, el p95 es de 234, 66 y 101 ms.
- **En producción pesará más la red que las consultas.** Cada petición manda de 24 a 35 sentencias a la base y más de la mitad son el marco de la transacción (`begin`, `set local role`, `set_config`, `commit`). Aquí cuestan microsegundos; en Neon cada una es un viaje de ida y vuelta: con 3 ms por viaje, Hoy pasa de 45 a unos 150 ms (apartado 5, es una estimación).
- **Se han encontrado y arreglado dos problemas reales.** (1) Faltaban índices: borrar un negocio de tamaño medio tardaba **10,6 s** y ahora **0,25 s**; borrar una importación de ventas, de 57 a 0,7 ms (migración `0010`, apartado 4). (2) Dos consultas de ventas comparaban una columna `date` con un `timestamptz`: con RLS eso impide usar el índice por fecha; comparando `date` con `date` la consulta pasa de 12,8 a 5,8 ms y Hoy y Escandallos bajan un 19 % y un 14 % (apartado 3.1).
- **Con un negocio diez veces mayor de lo normal** (1.500 artículos, 4.000 albaranes) las tres pantallas siguen por debajo de 300 ms (Hoy 275 ms, Compras 60, Escandallos 49), pero Hoy ya es sobre todo procesador de Node y no base de datos: el cálculo de avisos recalcula todas las recetas dos veces por cada aviso (apartado 2.3).
- **Con más negocios no empeora.** Con 200 negocios (cuatro veces más filas en las mismas tablas) un negocio normal tarda lo mismo —Hoy 48 ms, Compras 24, Escandallos 25— y lo que sin índices crecía con el número de negocios, como dar de baja uno (45 s con 200), ahora tarda 0,6 s (apartado 2.4).
- **Queda sin tocar, a decidir**: reducir los viajes del marco de cada transacción (toca `withTenant()`, el núcleo del aislamiento), optimizar el cálculo de avisos y medir en Neon de verdad (apartado 8).

## 1. Qué se mide y cómo repetirlo

```bash
cd producto
node scripts/seed-carga.mjs        # una vez (≈ 75 s): crea la base restora_carga con 50 negocios (solo contra un Postgres local)
npm run carga:medir                # Hoy, Compras y Escandallos con 1, 5 y 10 personas a la vez
npm run carga:medir -- --explain   # además, EXPLAIN (ANALYZE, BUFFERS) de las consultas más pesadas (tests/carga/out/planes.txt)
npm run carga:indices              # índices que faltan: claves foráneas sin índice y coste de borrados y listas
```

Opciones de `carga:medir`: `--concurrencia 1,5,10`, `--pool 5`, `--rondas 20`, `--paginas hoy,compras`, `--mezcla` (cada persona pide las tres pantallas), `--negocio 51` (todas las medidas con un negocio concreto), `--tipicos 200` (usar más de 50 negocios si se han sembrado), `--etiqueta antes` y `--json` (guardan los resultados en `tests/carga/out/`, que no se sube al repositorio). `DATABASE_URL` decide en qué servidor Postgres está la base `restora_carga`. La siembra se niega a trabajar contra uno que no sea local; `carga:medir` y `carga:indices`, también, salvo con `CARGA_PERMITIR_REMOTA=1` (apartado 8).

**Los datos** (`scripts/seed-carga.mjs`, con semilla fija: dos siembras dan lo mismo). Cada negocio es un restaurante con un año y medio de uso; las cifras son las de un negocio normal (el 28) y las del negocio grande (el 51):

| | Negocio normal (28) | Negocio grande (51) | Los 50 normales juntos |
| --- | ---: | ---: | ---: |
| Artículos | 250 | 1.500 | 12.500 |
| Proveedores | 12 | 12 | 600 |
| Recetas (platos y elaboraciones) | 115 | 400 | 5.750 |
| Líneas de escandallo | 697 | 2.432 | 35.679 |
| Albaranes guardados (18 meses) | 400 | 4.000 | 20.000 |
| Líneas de compra | 4.000 | 40.000 | 200.000 |
| Movimientos de stock | 4.000 | 40.000 | 200.000 |
| Precios por proveedor | 2.218 | 16.071 | 104.201 |
| Cambios de precio | 438 | 4.695 | 23.360 |
| Pedidos | 150 | 1.500 | 7.500 |
| Líneas de pedido | 600 | 13.500 | 49.500 |
| Importaciones de ventas | 13 | 25 | 650 |
| Líneas de venta | 13.148 | 87.962 | 657.085 |
| Registros de auditoría | 400 | 4.000 | 20.000 |
| **Total** | **26.441** | **216.097** | **1.336.825** |

El **negocio grande** se siembra aparte (`CARGA_ARTICULOS=1500 CARGA_PLATOS=300 CARGA_ELABORACIONES=100 CARGA_ALBARANES=4000 CARGA_PEDIDOS=1500 CARGA_DIAS_VENTAS=730 node scripts/seed-carga.mjs --negocios 51`) y sirve para ver si algo crece más deprisa que el negocio. No entra en la mezcla normal: se mide con `--negocio 51`.

**Qué mide cada pantalla.** Lo que la pantalla le pide a la base de datos, con el código de la app (no una copia) cuando se puede llamar desde fuera de Next: Hoy es `hoyData()`, Escandallos es `dishStats()` más `histVentas()`, y todas llevan el marco de cada petición (la sesión y el negocio del usuario, `loadLocal()` y los contadores del menú, `navBadges()`). Compras y las dos consultas de la sesión llevan su SQL dentro de funciones que no se pueden importar, así que van copiadas tal cual en `tests/carga/consultas-compras.mjs` y `consultas-marco.mjs`, y `tests/unit/carga-copias.test.ts` falla si la app cambia alguna. Todo pasa por `withTenant()` (rol `restora_app`, con RLS) o `sys()`, como en la app.

Cada medida es el **tiempo de pared de la pantalla en el servidor**: consultas más cálculo en JavaScript, con el tiempo de las consultas y el de espera de una conexión del pool por separado. **No incluye** la red, ni el pintado de React, ni Next. Con «N personas», N negocios distintos piden la pantalla a la vez y cada ronda cada una cambia de negocio. El pool es el de la app: 5 conexiones por proceso (`PG_POOL_MAX`).

## 2. Resultados

### 2.1 Una, cinco y diez personas a la vez (pool de 5 conexiones)

Mediana de tres pasadas de 20 rondas cada una, con 50 negocios y en el mismo estado de la base: **antes** es sin los índices nuevos y con las consultas de ventas como estaban; **después**, con la migración `0010` y las consultas cambiadas (apartados 3 y 4).

| Pantalla | Personas a la vez | p50 antes | p50 después | p95 antes | p95 después | Cambio del p50 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Hoy | 1 | 56,5 ms | 45,5 ms | 68,3 ms | 57,1 ms | -19 % |
| Compras | 1 | 18,3 ms | 18,9 ms | 22,8 ms | 26,6 ms | +3 % |
| Escandallos | 1 | 26,3 ms | 22,7 ms | 35,0 ms | 28,7 ms | -14 % |
| Hoy | 5 | 104,9 ms | 93,3 ms | 146,3 ms | 131,2 ms | -11 % |
| Compras | 5 | 26,0 ms | 28,1 ms | 38,5 ms | 41,8 ms | +8 % |
| Escandallos | 5 | 46,3 ms | 38,7 ms | 64,0 ms | 55,7 ms | -17 % |
| Hoy | 10 | 203,3 ms | 181,1 ms | 279,8 ms | 233,5 ms | -11 % |
| Compras | 10 | 51,9 ms | 50,7 ms | 67,8 ms | 65,9 ms | -2 % |
| Escandallos | 10 | 95,2 ms | 77,8 ms | 122,9 ms | 101,0 ms | -18 % |

- Compras no cambia (las diferencias de +8 % a -2 % son ruido): no usa nada de lo cambiado. Da la medida de ese ruido.
- Con 10 personas el tiempo sube sobre todo por la **cola del pool**: 5 conexiones para 10 personas, y cada pantalla las pide varias veces (5 o 6 transacciones). Con 10 personas, en Hoy, unos 90 ms de los 181 son esperar una conexión libre (columna `espera p50` de la salida). La base de datos, con 5 consultas a la vez, no es el límite.

### 2.2 Más carga: pool de 20 y 10, 25 y 50 personas a la vez

Con los 200 negocios sembrados (cada persona, uno distinto), un pool de 20 conexiones para que 10 personas no hagan cola, 8 rondas por persona y la media de dos pasadas (el p95 de una a otra difiere hasta un 20 %). «Pantallas por segundo» es lo que despacha el proceso entero:

| Pantalla | Personas a la vez | p50 | p95 | Pantallas por segundo |
| --- | ---: | ---: | ---: | ---: |
| Hoy | 10 | 210 ms | 318 ms | 44 |
| Hoy | 25 | 408 ms | 543 ms | 58 |
| Hoy | 50 | 727 ms | 902 ms | 65 |
| Compras | 10 | 53 ms | 76 ms | 171 |
| Compras | 25 | 135 ms | 173 ms | 175 |
| Compras | 50 | 254 ms | 301 ms | 193 |
| Escandallos | 10 | 82 ms | 115 ms | 109 |
| Escandallos | 25 | 198 ms | 247 ms | 123 |
| Escandallos | 50 | 382 ms | 476 ms | 128 |

Mezclando las tres (cada persona pide Hoy, Compras y Escandallos en cada ronda), el proceso despacha unas 30 vueltas por segundo con 10, 25 o 50 personas: con 50, p50 de 706 ms en Hoy, 360 en Compras y 344 en Escandallos (p95 de 874, 591 y 491 ms).

- **El rendimiento se queda plano a partir de 25 personas** (Hoy 58 → 65 pantallas por segundo al doblar las personas): más personas solo suman espera. Con 25 y 50 vuelve a haber cola de conexiones (20 para 25 o 50 personas; la columna `espera p50` de la salida).
- **El límite es el procesador de Node, no la base de datos.** Durante la prueba, `top` enseña el proceso de Node al 80-100 % de un núcleo (usa un solo hilo) y los 20 procesos de Postgres repartiéndose el resto, de 10 a 20 % cada uno. Con ese ritmo, la parte de datos de cada pantalla ocupa unos **15 ms de procesador en Hoy, 5 en Compras y 8 en Escandallos** (la inversa de las pantallas por segundo), sin pintar. En producción cada instancia de Vercel es un proceso con su propio pool, así que esto escala añadiendo instancias; la contrapartida son sus conexiones a Neon (hasta 5 por instancia).
- Con 10 personas del negocio normal sobre una instancia, las tres pantallas siguen por debajo de 350 ms de p95.

### 2.3 Un negocio grande

El negocio 51 tiene entre 3,5 y 10 veces más datos que uno normal según la tabla. Una persona, una pasada de 15 rondas de cada pantalla antes y otra después, en el mismo estado de la base:

| Pantalla | p50 antes | p50 después | p95 antes | p95 después | Cambio del p50 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Hoy | 416,8 ms | 275,2 ms | 462,6 ms | 366,2 ms | -34 % |
| Compras | 101,7 ms | 60,0 ms | 145,3 ms | 76,1 ms | -41 % |
| Escandallos | 143,9 ms | 49,1 ms | 182,6 ms | 70,2 ms | -66 % |

- **Lo arreglado con índices y consultas pesa mucho más aquí**: con el negocio grande, antes de la migración `0010`, el planificador elegía planes que recorrían tablas enteras —las de todos los negocios— y tiraban las filas ajenas con el filtro de RLS: los precios por proveedor de Hoy leían las 120.000 filas de `articulo_proveedor` y los avisos del menú, las 35.000 líneas de escandallo de todos los negocios para quedarse con 85. Ahora cuestan lo que pesa el negocio, no lo que pesa la tabla (apartado 3.2).
- **Lo que queda en Hoy es procesador de Node**: de los 275 ms, unos 190 son cálculo en JavaScript, no base de datos (con un negocio normal son unos 7 ms). El perfil de procesador lo atribuye a `recetaCost()` llamada desde `efectoCambio()`: por cada aviso de precio abierto (en el negocio grande, unos 150) se recalculan las estadísticas de **todas** las recetas dos veces (con el precio de antes y con el de ahora), aunque solo cambien las pocas que usan ese artículo. Crece con avisos × recetas, es decir, más que el negocio. Mientras dura, el hilo de Node no atiende a nadie más: con 5 personas del negocio grande a la vez, Hoy tarda 1,2 s. Para un restaurante normal no importa; para una cadena sí lo hará (apartado 8, candidato 2).

### 2.4 Con 200 negocios en vez de 50

Se sembraron 150 negocios normales más (200 en total más el grande, 1,2 GB) y se repitió la comparación A/B tal cual, con `--tipicos 200` (una persona; tres pasadas de 20 rondas y mediana, salvo el negocio grande, con una pasada de 15):

| | 50 negocios | 200 negocios |
| --- | ---: | ---: |
| Hoy, p50 antes → después | 56,5 → 45,5 ms | 52,0 → 48,1 ms |
| Compras, p50 antes → después | 18,3 → 18,9 ms | 20,7 → 23,7 ms |
| Escandallos, p50 antes → después | 26,3 → 22,7 ms | 27,9 → 24,8 ms |
| Hoy del negocio grande, p50 antes → después | 417 → 275 ms | 423 → 332 ms |
| **Eliminar un negocio entero**, antes → después | **10,6 s → 0,25 s** | **45,3 s → 0,61 s** |
| Borrar una importación de ventas | 56,5 → 0,7 ms | 234 → 1,3 ms |
| Borrar un albarán | 2,1 → 0,2 ms | 6,7 → 0,3 ms |
| Borrar un artículo | 6,8 → 0,3 ms | 18,1 → 0,5 ms |
| Líneas de los 40 últimos pedidos | 4,3 → 0,6 ms | 13,5 → 0,7 ms |

- **Las pantallas de un negocio normal no dependen del número de negocios**: de 50 a 200 se mueven entre -8 % y +25 %, dentro del ruido de la máquina (Compras, la que más sube, también sube sin los cambios, de 18,3 a 20,7 ms; una causa probable, sin comprobar, es que con 200 negocios, rotando de negocio en cada ronda, la caché de Postgres de 128 MB retiene menos de lo que se pide).
- **Lo que sí crecía con el número de negocios era lo que no tenía índice**: cada borrado cuesta lo que pese la tabla de todos los negocios, así que con cuatro veces más negocios, cuatro veces más (dar de baja uno, de 10,6 a 45 s; una importación de ventas, de 57 a 234 ms). Con los índices casi no crece (una importación, de 0,7 a 1,3 ms).
- **Lo único que sigue creciendo es dar de baja un negocio entero** (0,25 → 0,61 s): quedan sin índice las claves `tenant_id` y `local_id` de las tablas grandes (apartado 4). Es lineal: con 1.000 negocios serían unos 3 s por baja, si se mantiene la proporción (extrapolación, no medida).

## 3. Qué dicen los planes (EXPLAIN)

Los planes completos de cada pasada se guardan en `tests/carga/out/planes*.txt`. Con un negocio normal, las consultas que más tiempo suman son estas (una persona, 20 rondas; el porcentaje es el del tiempo total de base de datos; «p50/p95» son los medidos desde Node, con el viaje incluido):

| % | Veces | p50 / p95 | Pantallas | Consulta |
| ---: | ---: | ---: | --- | --- |
| 17,5 | 60 | 4,6 / 7,2 ms | todas (menú) | Avisos del menú, `navBadges()`: recursión sobre los platos de la carta y cinco contadores |
| 15,3 | 40 | 5,7 / 9,8 ms | Hoy, Escandallos | Histórico de ventas de cinco meses, `histVentas()` |
| 8,9 | 40 | 3,6 / 5,4 ms | Hoy, Escandallos | Líneas de escandallo de todas las recetas |
| 7,9 | 20 | 6,0 / 11,3 ms | Hoy | Precio de cada artículo en cada proveedor (alternativas más baratas) |
| 6,5 | 20 | 4,9 / 7,9 ms | Compras | Gasto por artículo de los seis últimos meses |
| 5,2 | 40 | 2,1 / 3,2 ms | Hoy, Escandallos | Artículos del local |
| 3,8 | 20 | 3,0 / 4,8 ms | Hoy | Contadores de Hoy (albaranes, proveedores, recetas, ventas…) |
| 3,8 | 40 | 1,4 / 3,6 ms | Hoy, Escandallos | Recetas del local |
| ~9 | 820 | 0,1–0,4 ms | todas | Marco: `begin`, `set local role`, `set_config`, `commit` |

Medida Hoy sola (40 rondas), la consulta más lenta (el histórico de ventas) tiene un p95 de 12 ms y todas las demás, menos de 10 ms. Ninguna recorre una tabla grande entera: las que no entran por `(tenant_id, local_id, …)` entran por la clave del padre, y las únicas lecturas secuenciales son de tablas de 51 filas (`locales`, `memberships`, `organizations`), donde es lo correcto.

### 3.1 Hallazgo 1: `date` frente a `timestamptz` bajo RLS

Las dos consultas del histórico de ventas filtraban así: `fecha >= date_trunc('month', current_date) - interval '5 months'`. `fecha` es un `date` y el lado derecho es un `timestamptz`, así que Postgres usa el operador `date >= timestamptz`, que **no es «leakproof»** (al convertir puede dar un error, y un error puede revelar un valor). Con RLS, un filtro del usuario con una función que no es «leakproof» no puede evaluarse antes que la política de seguridad, y por eso **no puede usarse como condición de índice**: el índice `(tenant_id, local_id, fecha)` entraba solo por los dos primeros campos y `fecha` se aplicaba después, fila a fila.

```
Antes (fecha comparada con timestamptz)                         Después (fecha comparada con date)
Bitmap Heap Scan on ventas_lineas   (rows=5631)                 Bitmap Heap Scan on ventas_lineas   (rows=5631)
  Recheck Cond: tenant_id = … AND local_id = …                    Recheck Cond: tenant_id = … AND local_id = … AND fecha >= … AND fecha < …
  Filter: fecha < … AND fecha >= …                                Buffers: shared hit=221
  Rows Removed by Filter: 7590                                  -> Bitmap Index Scan on ventas_lineas_idx   (rows=5631)
  Buffers: shared hit=285                                             Index Cond: tenant_id = … AND local_id = … AND fecha >= … AND fecha < …
-> Bitmap Index Scan on ventas_lineas_idx   (rows=13221)
      Index Cond: tenant_id = … AND local_id = …
Execution Time: 12.8 ms                                         Execution Time: 5.8 ms
```

Se comprobó con `pg_proc.proleakproof` (`date_ge` y `date_lt` sí lo son; `date_ge_timestamptz` y `date_lt_timestamptz`, no). El arreglo es comparar `date` con `date` (`(date_trunc('month', current_date) - interval '5 months')::date`): mismos resultados en los 50 negocios y en 2,9 millones de comparaciones con diez años de fechas de «hoy» en tres zonas horarias (Madrid, UTC y Nueva York; ninguna diferencia). Tiempo de la consulta, de 12,8 a 5,8 ms; Hoy baja unos 11 ms y Escandallos unos 4. Está en `histVentas()` y en su copia dentro de `hoyData()`.

**Dónde más pasa y no se ha cambiado:** `documentos.fecha >= date_trunc(…)` (Hoy, Compras, ficha de proveedor) y `ventas_importes.desde >= date_trunc(…)`. No hay índice por fecha en esas tablas y los negocios tienen cientos de filas, así que no ganaría nada hoy; si algún día se les añade un índice por fecha, hay que comparar con `date` (apartado 7).

### 3.2 Hallazgo 2: con un negocio grande, planes que recorren la tabla entera

Con el negocio 51, antes de la migración `0010`:

- **Precios por proveedor de Hoy** (`articulo_proveedor` unida a `articulos`): `Seq Scan` sobre las 120.000 filas de la tabla (52.100 filas tiradas por el filtro de RLS, 50.000 buffers, 51 ms). Tras `articulo_proveedor_tenant_idx (tenant_id, articulo_id)`: 12 ms, 6.300 buffers, ninguna fila tirada.
- **Avisos del menú**, que lleva cada petición: la recursión sobre las elaboraciones de la carta hacía un `Merge Join` leyendo `receta_lineas_sub_idx` **entera** (35.679 filas, 85 de las cuales eran del negocio) dos veces: 44 ms. Tras `receta_lineas_tenant_sub_idx (tenant_id, subreceta_id)`, el mismo `Merge Join` lee solo las del negocio: 8 ms.

Con negocios normales el planificador elegía bien y la diferencia no se veía; con uno grande cambia de plan, y los dos planes malos cuestan **lo que pesa la tabla de todos los negocios**, no lo que pesa el negocio: crecen con cada cliente nuevo. Por eso esos dos índices empiezan por `tenant_id`.

### 3.3 Las estimaciones del planificador

Bajo RLS el planificador subestima las filas: dice `rows=1` donde hay miles (cuenta dos veces el filtro por negocio y por local, que no son independientes: el local es de un solo negocio). Con negocios normales elige un buen plan igualmente. Se probó a corregirlo con estadísticas extendidas (`create statistics … (dependencies) on tenant_id, local_id`): la estimación pasa a ser exacta (5.550 frente a 5.516 reales), pero **cambia otros planes sin garantía** (con el negocio grande, los precios por proveedor pasaron de 12 a 31 ms), así que no se ha adoptado. Anotado por si un plan malo futuro lo pide.

## 4. Índices

La migración `db/migrations/0010_indices_rendimiento.sql` crea once índices (`create index if not exists`, sin `concurrently`: ver abajo). Cada uno está probado por `tests/unit/indices-rendimiento.test.ts` (existe, empieza por esas columnas y la migración se puede ejecutar dos veces). Los tiempos son de `npm run carga:indices` antes y después, con 50 negocios:

| Índice | Para qué | Antes → después |
| --- | --- | --- |
| `ventas_lineas (import_id)` | Borrar una importación de ventas (la clave borra sus líneas en cascada) | 56,5 → 0,7 ms |
| `ventas_lineas (receta_id)` | Borrar un plato (la clave pone `receta_id` a nulo en sus ventas) y borrar un negocio; también «costes de ventas afectadas» al borrar un albarán | Negocio entero: 7,4 s de los 10,6 s eran esta comprobación (una vez por plato). Costes afectados: 24,7 → 1,6 ms |
| `precio_eventos (documento_id, articulo_id)` | Borrar un albarán; el cambio de precio de cada línea en la ficha del albarán | 2,1 → 0,2 ms; ficha 0,6 → 0,1 ms |
| `precio_eventos (articulo_id, fecha desc, created_at desc)` | Borrar un artículo; la lista de Artículos pide el último cambio de precio de cada uno, con ese orden | Borrar 6,8 → 0,3 ms; lista de Artículos 25,5 → 12,9 ms |
| `articulo_proveedor (proveedor_id)` | Borrar un proveedor | 16,0 → 9,7 ms |
| `pedido_lineas (pedido_id)` | Las líneas de los pedidos que muestra Pedidos; borrar un pedido | 4,3 → 0,6 ms; 3,0 → 0,2 ms |
| `pedido_lineas (articulo_id)` | Borrar un artículo (la clave borra sus líneas de pedido) | incluido en el 6,8 → 0,3 ms |
| `receta_lineas (tenant_id, subreceta_id)` | Avisos del menú (todas las pantallas) con un negocio grande | 44 → 8 ms (negocio grande) |
| `articulo_proveedor (tenant_id, articulo_id)` | Precios por proveedor de Hoy con un negocio grande | 51 → 12 ms (negocio grande) |
| `ventas_importes (tenant_id, local_id, desde desc nulls last, created_at desc)` | Hoy (dos consultas) y Ventas leen las importaciones del local | Décimas de ms: **preventivo**, ver abajo |
| `pedidos (tenant_id, local_id, created_at desc)` | Pedidos e Inventario leen los pedidos del local | 0,8 → 0,1 ms en pedidos abiertos; la lista de Pedidos casi igual (2,6 → 2,1 ms): su tiempo está en las subconsultas por pedido |

**Borrar un negocio entero**, el caso extremo: de **10,6 s a 0,25 s** con 50 negocios (de 45 s a 0,6 s con 200). Casi todo el tiempo era de comprobaciones de claves foráneas que Postgres hace **sin pasar por RLS**: por eso un índice por `tenant_id` no las arregla, hace falta uno que empiece por la columna de la clave. En una función de Vercel (que tiene un tiempo máximo) esos 10 s eran el riesgo real de no poder dar de baja a un cliente con datos.

**Los dos preventivos** (`ventas_importes` y `pedidos`) no hacían falta con 50 negocios: cuestan décimas de milisegundo. Se crean porque su coste crece con el número de negocios (son tablas con `tenant_id` que Hoy, Pedidos e Inventario leen **enteras** en cada visita, de todos los negocios) y porque son la misma forma que ya tienen `documentos`, `artículos`, `recetas` o `ventas_lineas`. Si se prefiere no tenerlos hasta que hagan falta, se pueden quitar sin consecuencias.

**Lo que cuestan.** Tamaño: unos 60 MB en total con 200 negocios (la base pesa 1,2 GB: un 5 %). Escritura: el único índice nuevo en una tabla que se escribe en bloque es el de `ventas_lineas` (dos). Insertar las 13.000 líneas de una importación de un año pasa de unos 440 a unos 500 ms (+12 %, con las comprobaciones de claves incluidas; mediana de cinco ejecuciones). El resto de las tablas se escriben de una en una.

**Lo que no se ha indexado, y por qué** (`npm run carga:indices` lo lista):
- Las claves foráneas `tenant_id` y `local_id` de las tablas grandes (`compra_lineas`, `stock_movimientos`, `articulo_proveedor`, `pedido_lineas`, `receta_lineas`, `ventas_lineas.local_id`…): solo se comprueban al borrar un **negocio** entero, una vez por tabla, y suman los 0,25 s de arriba (0,6 s con 200 negocios: crece con el número de negocios). Ninguna pantalla ni operación medida las recorre enteras: siempre se entra por el documento, el artículo o la receta. Si dar de baja negocios pasara a ser frecuente o a pesar segundos, se les añade `(tenant_id)`.
- Las claves foráneas a proveedores (`documentos.proveedor_id`, `articulos.proveedor_pref_id`, `articulos.last_proveedor_id`, `precio_eventos.proveedor_id`, `pedidos.proveedor_id`, todas «poner a nulo»): borrar un proveedor son 9,7 ms y es una acción rara.
- Las claves foráneas a `users` (`created_by`, `saved_by`, `user_id`): la app no borra usuarios.

**Al desplegar.** `create index` bloquea las escrituras de esa tabla mientras se construye (las lecturas no). Con las tablas de hoy son milisegundos. No lleva `concurrently` porque `migrate.mjs` aplica cada migración dentro de una transacción. Si una tabla llegara a pesar millones de filas, créese el índice antes de desplegar con `create index concurrently if not exists …` (la migración lo dará por hecho gracias al `if not exists`).

## 5. De local a Neon

En esta medida la base está al lado: cada sentencia cuesta microsegundos de red. En producción la función de Vercel (región `fra1`, `vercel.json`) y Neon (Frankfurt) hablan por red, y cada sentencia cuesta un viaje de ida y vuelta. El p50 de una pantalla sube aproximadamente **sentencias × latencia**. Esto es una **estimación, no una medida**: la latencia real hay que medirla (apartado 8).

| Pantalla | Sentencias por petición | De ellas, solo marco | p50 local | +1 ms | +3 ms | +5 ms | +10 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Hoy | 35 | 18 | 45,5 | 80,5 | 150,5 | 220,5 | 395,5 |
| Compras | 27 | 16 | 18,9 | 45,9 | 99,9 | 153,9 | 288,9 |
| Escandallos | 24 | 16 | 22,7 | 46,7 | 94,7 | 142,7 | 262,7 |

(La tabla suma, a los p50 de «después» del apartado 2.1, una latencia por sentencia; `carga:medir` imprime la misma tabla con el p50 de cada pasada.)

El **marco** son las sentencias que no son la consulta: `withTenant()` manda `begin`, `set local role restora_app`, `select set_config(…)` y, al final, `commit` (4 viajes por cada transacción de negocio) y `sys()` manda `begin` y `commit` (2). Una petición hace 5 o 6 transacciones: la sesión, el negocio del usuario, el local, los contadores del menú, el contenido de la pantalla y, en Hoy, el recuento del equipo.

Candidatos para recortar viajes (**no están hechos**: tocan `withTenant()`, que es el núcleo del aislamiento entre negocios, y se deciden aparte, con las pruebas de aislamiento delante):

1. **Mandar `begin`, `set local role` y `set_config` en un solo viaje.** Es una consulta de varias sentencias; el identificador del negocio ya se valida como UUID antes de entrar, así que puede ir dentro del texto sin riesgo de inyección. Cada transacción de negocio pasa de 4 viajes de marco a 2: Hoy baja de 35 a 29 sentencias, Compras de 27 a 21, Escandallos de 24 a 18 (unos 6 viajes menos por pantalla; con 3 ms por viaje, 18 ms menos).
2. **Una sola transacción para el marco y el contenido de cada pantalla** (`loadLocal()`, `navBadges()` y la propia pantalla comparten transacción en vez de abrir una cada uno): ahorra dos transacciones por petición, es decir, 8 viajes (4 si ya se ha hecho lo anterior).

Otras diferencias con Neon que esta medida no ve:
- **Arranque en frío:** Neon suspende el cómputo tras un rato sin tráfico (según el plan) y la primera consulta después tarda más. El primer negocio que entra por la mañana lo paga. No medido.
- **Caché:** aquí las tablas caben en memoria (unos 300 MB con 50 negocios, 1,4 GB con 200, frente a 16 GB). En Neon, según el tamaño del cómputo, habrá lecturas de disco (`read=` en los planes).
- **Pooler:** la URL con pooler de Neon (PgBouncer en modo transacción) admite `set local` y `set_config(…, true)` porque viven dentro de la transacción. El límite de conexiones depende del plan: la app abre hasta 5 por instancia de Vercel.

## 6. Límites de esta medida

- **Base local, sin red, con la configuración por omisión** de Postgres 16 en Ubuntu (`shared_buffers` 128 MB, `work_mem` 4 MB, JIT activado, `random_page_cost` 4). Neon configura otra cosa.
- **Máquina compartida** de 4 procesadores con otros procesos a ratos: ±10-15 % entre pasadas (Compras, que no cambió, oscila de -2 % a +8 %).
- **Datos sintéticos y uniformes**: todos los negocios tienen la misma forma salvo el grande. Los reales tienen más variedad (texto, precios, proveedores, distribución de ventas).
- **Solo lecturas de pantalla**, más las operaciones de `carga:indices` dentro de transacciones que se deshacen. No se midieron escrituras bajo carga (subir albaranes, importar ventas) ni la contención entre varias personas del mismo negocio, salvo el coste de los índices al insertar.
- **Sin React ni Next**: lo que se mide es la parte de datos de cada pantalla. El pintado se suma.
- **Una instancia de Node**: la capacidad por instancia (apartado 2.2) es la de este banco de pruebas, que además lleva la instrumentación de medida.

## 7. Reglas para no volver a perderlo

1. **Comparar columnas con su mismo tipo** en las consultas de negocio: `date` con `date` (`::date`), `timestamptz` con `timestamptz`. Con RLS, una comparación entre tipos distintos usa un operador que no es «leakproof» y deja de usar el índice. Señal: en un `EXPLAIN` con el rol `restora_app`, `Rows Removed by Filter` alto sobre una columna que sí está en el índice.
2. **Cada clave foránea de una tabla que crece, con su índice** (el que empieza por la columna de la clave). `npm run carga:indices` lista las que faltan; al añadir una tabla hija, mirarlo.
3. **Una tabla con `tenant_id` que se lee por negocio necesita un índice que empiece por `tenant_id`**, o el planificador puede recorrerla entera para quedarse con las filas de un solo negocio. Probarlo con `--negocio 51` (un negocio grande), no solo con los normales.
4. **Volver a medir** (`npm run carga:medir -- --explain`) tras tocar `hoyData()`, `priceAlerts()`, `navBadges()`, `dishStats()` o las consultas de Compras, y al añadir una pantalla. Una regla práctica: si el p95 de Hoy con una persona sube más de un 30 % entre dos pasadas sobre los mismos datos, mirar primero el ranking de consultas.
5. **Las copias que usa la medida** (`tests/carga/consultas-*.mjs`) las vigila una prueba unitaria: si falla, se actualiza la copia y se vuelve a medir.

## 8. Pendiente

- **Medir en Neon** (necesita la cuenta del propietario). Procedimiento **sin ensayar**: crear una rama desechable de Neon (nunca la de producción), aplicar `npm run migrate`, cargarle los datos de la base local (`pg_dump --data-only` de `restora_carga` hacia la rama) y ejecutar `CARGA_PERMITIR_REMOTA=1 DATABASE_URL=<cadena de la rama> npm run carga:medir`. La siembra se niega a trabajar contra un servidor remoto a propósito. Con eso se sabe la latencia real por sentencia y si las cifras del apartado 5 se cumplen. Después, borrar la rama (tiene datos sintéticos, pero cuesta) y no pegar su cadena de conexión en ningún sitio.
- **Decidir si se recortan los viajes del marco** (apartado 5, candidatos 1 y 2). Es lo que más mejoraría el tiempo percibido en producción; toca `withTenant()` y necesita las pruebas de aislamiento (`audit-tenancy`, `rls.mjs`, `fugas.mjs`) delante.
- **Decidir si se optimiza `efectoCambio()`** (apartado 2.3): calcular solo las recetas afectadas por el artículo y sus elaboraciones, y reutilizar las estadísticas base para el resto, con el mismo resultado. Para negocios normales no gana nada (unos 7 ms); para uno grande, quitaría la mayor parte de los 190 ms de cálculo de Hoy (no medido).
- **Un límite de tamaño o un aviso** para negocios mucho mayores que el grande de estas pruebas: no se ha medido qué pasa por encima de 1.500 artículos o 4.000 albaranes.
