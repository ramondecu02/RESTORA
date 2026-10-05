# Copias de seguridad y restauración

> **Estado: procedimiento redactado, pendiente de ensayo con la cuenta del propietario.** El ensayo necesita la cuenta de Neon (crear ramas y restaurar), que no se puede usar desde el entorno de desarrollo. Hasta que se ensaye y se anoten los tiempos en [`scripts/restore-drill.md`](../scripts/restore-drill.md), **no hay un RTO medido y no debe prometerse a ningún cliente** ningún plazo de recuperación. Los puntos marcados con ⏳ se confirman en ese ensayo.

Pasar Stripe a producción (cobrar de verdad) exige tener esto ensayado: cobrar sin una copia probada es el peor escenario (punto B3 del plan).

## 1. Qué datos hay, dónde están y cómo se recuperan

| Qué | Dónde | Copia que existe hoy | Cómo se recupera |
| --- | --- | --- | --- |
| Datos de todos los negocios (compras, artículos, escandallos, ventas, equipo, sesiones…) | Neon (Postgres, Frankfurt) | El historial de cambios del proyecto de Neon durante una ventana que depende del plan contratado (`DESPLIEGUE.md` pide al menos 7 días ⏳ comprobar la que da la cuenta) | Una rama de recuperación a un punto anterior (apartado 4) |
| Fotos y PDF de albaranes, cartas y fotos de platos | Vercel Blob (privado) | **Ninguna.** Blob no guarda versiones ni papelera, y al borrar un albarán desde la app se borra también su archivo | No se recupera. Si el cliente conserva el papel, se vuelve a subir |
| Código | GitHub | El propio repositorio | `git` |
| Configuración (variables) | Vercel → Environment Variables | La propia consola de Vercel; las claves viven en sus servicios (Neon, Anthropic, Resend, Stripe) | Volver a copiarlas desde cada servicio |
| Suscripciones y cobros | Stripe | Su propio registro: es la fuente de verdad del plan de cada negocio | El webhook vuelve a leer a Stripe con cada evento |
| Web pública | Cloudflare Pages | El repositorio | `actualizar-restora.bat` |

## 2. RPO y RTO

- **RPO** (cuántos datos podemos perder): lo escrito entre el punto al que se vuelve y el momento del fallo.
- **RTO** (cuánto tardamos en volver a funcionar): desde que se detecta el problema hasta que el negocio afectado vuelve a trabajar con sus datos. **Medido: pendiente de ensayo.** No se escribe ninguna cifra hasta tenerla.

| Escenario | RPO | RTO | Estado |
| --- | --- | --- | --- |
| **1. Un error humano o un fallo de la app estropea los datos de un negocio** (un albarán borrado, una importación equivocada). Es el caso normal | Dentro de la ventana de historial se puede volver a cualquier instante ⏳: lo anterior a ese instante no se pierde. Para un albarán, lo que ocurrió después se rehace a mano | El tiempo de los pasos del apartado 4 | Pendiente de ensayo |
| **2. Hay que volver toda la base a un punto anterior** (una migración o un script malo que estropea a todos los negocios) | Todo lo que hayan escrito **todos** los negocios desde ese punto | El de restaurar la rama de producción más comprobar y avisar | Pendiente de ensayo; solo con aprobación del propietario |
| **3. Se pierde el proyecto o la cuenta de Neon, o su región** | Todo lo posterior a la última copia hecha **fuera** de Neon. Hoy no hay ninguna, así que sería todo | No hay procedimiento probado | **Riesgo abierto** (apartado 7) |
| **4. Se borran archivos de Blob** (un albarán, o el almacén) | Todos los archivos borrados: no hay copia | — | Riesgo aceptado hoy; decisión del propietario (apartado 7) |

## 3. Antes de restaurar nada

1. **¿Hace falta?** Un albarán borrado casi nunca exige volver la base atrás: se recupera con una rama (apartado 4) y se vuelve a apuntar. Volver **toda** la base (escenario 2) hace perder lo de todos los demás negocios: no se hace por un incidente de un solo negocio.
2. **Averigua qué pasó y cuándo.** Cada borrado de un albarán queda anotado con su hora, quién fue y qué era. En el *SQL Editor* de Neon, sobre producción:

   ```sql
   select a.created_at, a.user_id, a.entity_id as documento, a.data
   from audit_log a join organizations o on o.id = a.tenant_id
   where o.name = 'NOMBRE DEL NEGOCIO' and a.action = 'borrar' and a.entity = 'documento'
   order by a.created_at desc limit 10;
   ```

   `data` trae el proveedor, el número, la fecha, el total y cuántas líneas tenía. Con eso se sabe qué albarán es y a qué hora se borró.
3. **Mira la ventana.** Si ese instante es anterior a lo que guarda el historial de Neon, no se puede restaurar: se vuelve a apuntar con lo que se sepa (el papel, el propio proveedor, la factura que llega después).

## 4. Recuperar un albarán borrado (sin tocar producción)

Lo hace quien tenga acceso a la consola de Neon (el propietario). Los nombres de los botones de Neon pueden cambiar: ⏳ se confirman en el ensayo.

1. **Elige el punto:** unos minutos **antes** de la hora del borrado (apartado 3), en hora UTC (la consola de Neon la pide así).
2. **Crea una rama de recuperación:** consola de Neon → proyecto → *Branches* → *Create branch* → a partir de la rama de producción → *Past data* (un punto en el tiempo) → el instante del paso 1. Nómbrala `recuperacion-AAAAMMDD-negocio`. La rama de producción no se toca y la app sigue funcionando.
   **La rama contiene datos de clientes: se trata como producción** (la cadena de conexión no se comparte ni se guarda en ningún sitio, y la rama se borra al terminar).
3. **Comprueba que el albarán está en la rama.** Conéctate a la rama (su cadena de conexión, desde la consola) y, en solo lectura:

   ```sql
   -- el albarán y su proveedor
   select d.id, d.numero, d.fecha, d.total, d.status, p.name as proveedor
   from documentos d left join proveedores p on p.id = d.proveedor_id
   where d.tenant_id = 'ID DEL NEGOCIO' and d.numero = 'NÚMERO DEL ALBARÁN';

   -- sus líneas
   select cl.idx, cl.texto, a.name as articulo, cl.cantidad, cl.unidad_compra, cl.precio, cl.descuento, cl.bonificadas, cl.iva, cl.importe
   from compra_lineas cl join articulos a on a.id = cl.articulo_id
   where cl.documento_id = 'ID DEL DOCUMENTO' order by cl.idx;
   ```

   (La conexión de Neon se salta RLS: filtra siempre por el negocio.) Si no aparece, el punto es anterior a que se guardara o ya fuera de la ventana: prueba otro.
4. **Comprueba que en producción no está** (las mismas consultas contra la rama de producción) y que el borrado consta en `audit_log`.
5. **Recupéralo, volviendo a apuntarlo a mano** (Compras → *Apuntar a mano*, en el negocio afectado) con lo que ves en la rama: proveedor, número, fecha, y cada línea con su cantidad, unidad, precio, descuento e IVA. La app recalcula el stock, el precio medio, los avisos de precio y el coste de los platos como con cualquier compra nueva.
   **No se inserta nada con SQL en producción:** el stock, el precio medio, los avisos, la capa anónima de precios y lo que aprende cada albarán dependen de muchas filas relacionadas, y reinsertar unas sin las otras deja los números descuadrados.
   La **foto original no se recupera** (el borrado quitó su archivo de Blob). Si el cliente la conserva, que la suba otra vez y la asocie a mano.
6. **Comprueba el resultado.** En la app: el albarán aparece en Compras con su total; el stock y el precio medio de los artículos del albarán coinciden con los de la rama (`select name, stock, pmp from articulos where tenant_id = '…'`, antes y después). Si el albarán afectaba a ventas ya importadas y se borró «dejándolas como estaban», esas ventas conservan el coste con el que se calcularon: no hay nada más que rehacer.
7. **Borra la rama de recuperación** y anota el incidente: fecha, negocio, causa, hora del borrado, hora de la recuperación y lo que costó (alimenta el RTO real).

## 5. Volver toda la base a un punto anterior (escenario 2)

Solo por una catástrofe que afecta a todos los negocios, con la aprobación expresa del propietario y avisando antes a quien usa la app:

1. Crea primero una rama de recuperación al punto elegido (apartado 4, paso 2) y **compruébala**: que tiene los datos buenos y que la última migración conocida (`select max(version) from schema_migrations`) es la esperada.
2. En Neon, restaura la rama de producción a ese punto (*Restore*, ⏳ confirmar cómo nombra la consola la copia de respaldo que deja con lo anterior).
3. Despliega o reinicia la app si hace falta (las conexiones abiertas se reinician solas) y comprueba un registro, un albarán y un escandallo.
4. Revisa lo que no vive en la base: los negocios que cambiaron de plan en esa ventana (Stripe es la fuente de verdad; el siguiente evento del webhook lo vuelve a sincronizar), las sesiones y los códigos de verificación en curso (algunos se habrán perdido) y los archivos de Blob (pueden faltar o sobrar respecto a las filas de `documento_archivos`).

## 6. Límites conocidos

- La ventana de historial la marca el plan de Neon (⏳ anotar aquí cuál es: ______). Pasada la ventana no hay nada que restaurar.
- Blob no tiene copias: lo borrado no vuelve. Al restaurar una rama, sus filas de `documento_archivos` pueden apuntar a archivos que ya no existen.
- No hay un procedimiento probado para recuperar un **negocio entero** borrado desde Cuenta (que borra sus datos, sus archivos y su suscripción). La rama de recuperación permite ver qué tenía y exportarlo, pero reinsertarlo en producción necesita un guion que no existe.
- La rama de recuperación es de un momento anterior: si se aplicó una migración después, tiene el esquema anterior (cuidado al comparar columnas).
- Las ramas de Neon se cobran y guardan datos de clientes: no dejar ninguna olvidada.

## 7. Pendiente del propietario

- [ ] **Ensayar** el procedimiento con la cuenta de Neon siguiendo [`scripts/restore-drill.md`](../scripts/restore-drill.md) y anotar los tiempos reales aquí (apartado 2) y en el ensayo.
- [ ] **Anotar la ventana de historial** que da el plan de Neon contratado (y subirla si no llega a 7 días, como pide `DESPLIEGUE.md`).
- [ ] **Decidir si se hace una copia fuera de Neon** (por ejemplo, un volcado periódico con `pg_dump` a un almacenamiento propio) para el escenario 3, y si se guardan copias de los archivos de Blob (escenario 4). Hoy no existe ninguna de las dos.
- [ ] Repetir el ensayo antes de pasar Stripe a producción, y de nuevo cuando cambie el plan de Neon o el esquema de forma importante.

## 8. Límites por negocio que protegen el gasto

Aparte de las copias, la app frena el gasto desbocado de la lectura con IA con un tope mensual de lecturas por negocio (`MAX_LECTURAS_MES`, 1.500 por defecto) y los límites por hora y por día de subidas: ver `DESPLIEGUE.md`, paso 5. No hay cifras por plan hasta que se decidan los planes.
