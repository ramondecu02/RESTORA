# Imágenes de la web: reglas, huecos y de dónde sale cada una

> Decisión del propietario (5/10/2026): «usar imágenes generadas para rellenar la web». **Claude no genera imágenes**: las de ambientación las genera el propietario con su herramienta
> (o con la clave de API de un proveedor de imágenes, guardada como secreto y nunca en el repositorio). Lo que sí se genera aquí, a partir del producto real: capturas
> (`scripts/capturas.mjs`, Task 27), el kit de marca (`scripts/marca.mjs`) y una grabación de pantalla de la app para el vídeo.
>
> **Carrusel recibido el 5/10/2026** (`imagenes.restora.rar`, 9 imágenes de 2816×1536): se han elegido y recortado 7 (tabla de abajo) y se han descartado 2 por las reglas 1 y 2.

## Reglas

1. **Ambientación y producto.** Pueden salir personas genéricas (personal de cocina o sala, comensales) como parte de la escena, pero **nunca se presentan como «clientes», «el equipo» o
   «el fundador»**, ni con nombre, testimonio, sello o premio, y ningún pie de foto dice quiénes son. El hueco de «Sobre nosotros» lleva un lugar de trabajo **sin caras**; la foto de la persona
   real irá cuando exista (queda pendiente, con su `TODO(Ramon)` en `app/[locale]/sobre-nosotros/page.tsx`).
2. **Sin texto, logotipos ni cifras dentro de la imagen** (los generadores los estropean y no son accesibles): el texto va en la web. Tampoco se usa una imagen con el nombre RESTORA
   rotulado en un local: haría pensar que RESTORA es un restaurante.
3. **Un solo estilo**: fotografía editorial de cocina y sala de un restaurante independiente, luz cálida, poca profundidad de campo, colores sobrios; sin filtros saturados. Las imágenes del carrusel
   se usan **solo recortadas** (sin retoque de color), para no tocar lo que ha generado el propietario.
4. **Texto alternativo** descriptivo (no «imagen generada»), en castellano y catalán: está en `lib/site-copy.ts`, bloque `images`, y las páginas lo leen de ahí según el idioma. Una prueba
   (`npm run test:web`) falla si falta el catalán o si un texto es idéntico en los dos idiomas.
5. **Transparencia**: el pie de la web avisa de que las imágenes son ilustrativas y algunas están generadas con IA y de que no son clientes ni equipos reales (`footer.imagesNote`). Se mantiene
   mientras haya imágenes generadas en la web.
6. Formato final `.webp`. Las variantes responsive las genera `npm run build:cf` (`scripts/gen-image-variants.mjs`). Los originales (unos 3 MB cada uno) **no se guardan en el repositorio**:
   guárdalos en tu disco.

## Huecos y de dónde sale cada imagen

| Hueco (`public/images/`) | Dónde | Medida | Origen (`Gemini_Generated_Image_…jfif`) |
|---|---|---|---|
| `video-poster.webp` | Home, miniatura del vídeo (`VIDEO_POSTER` en `lib/site.ts`) | 1600×900 · 16:9 | `9q3lko9q3lko9q3l`: brigada emplatando postres |
| `sobre-nosotros.webp` | Sobre nosotros, «Quién está detrás» | 1200×1500 · 4:5 | `t446jat446jat446`: mesa de trabajo de cocina, sin personas |
| `recepcion.webp` | Home, fila «Proveedores» | 1400×1120 · 5:4 | `4qa04a4qa04a4qa0`: recepción de mercancía con la furgoneta del proveedor |
| `sala-servicio.webp` | Sobre nosotros, banda de «La tesis» | 1800×1000 | `nji8linji8linji8`: sala en pleno servicio |
| `explorar-funcionalidades.webp` | Home, tarjeta «Funcionalidades» | 1200×750 · 16:10 | `pgj1uzpgj1uzpgj1`: preparación de un cóctel en barra |
| `explorar-como-funciona.webp` | Home, tarjeta «Cómo funciona» | 1200×750 · 16:10 | `5bevaa5bevaa5bev`: barra y sala en servicio |
| `explorar-precios.webp` | Home, tarjeta «Precios» | 1200×750 · 16:10 | `2sad4e2sad4e2sad`: postre sobre una barrica |

Las otras 13 (`chef-*.webp`, `kitchen-hero.webp`, `cocina-abierta.webp`, `sala*.webp`, `mesa.webp`, `operativa.webp`, `producto.webp`, `plato.webp`, `restaurante-cta.webp`) siguen como estaban.
Se han retirado `mercancia.webp` y `plating-line.webp`, que ya no usa ninguna página.

**Descartadas:** `ipgb82ipgb82ipgb` (recepción con una etiqueta con nombre y cargo de una persona y rótulos de marca en los envases: incumple las reglas 1 y 2) y `xci7ttxci7ttxci7` (sala con «RESTORA»
rotulado en la pared y en un atril, y monogramas «RL» en los manteles: incumple la regla 2; el texto pequeño además sale ilegible).

### Cómo se recortaron (reproducible)

`node scripts/importar-imagen.mjs <original> <hueco> --recorte=izquierda,arriba,ancho,alto` (fracciones de 0 a 1 de la imagen original; sin `--recorte` recorta hacia el centro de interés):

```
video-poster              9q3lko…  --recorte=0.0152,0,0.9697,1
sobre-nosotros            t446ja…  --recorte=0,0.10,0.3926,0.90
recepcion                 4qa04a…  --recorte=0.317,0,0.6818,1
sala-servicio             nji8li…  --recorte=0.0091,0,0.9818,1
explorar-como-funciona    5bevaa…  --recorte=0.1236,0,0.8727,1
explorar-funcionalidades  pgj1uz…  --recorte=0.0236,0,0.8727,1
explorar-precios          2sad4e…  --recorte=0.19,0.15,0.611,0.70
```

## Para cambiar una imagen o añadir otra

1. Guardar el original generado (png, jpg, jfif o webp).
2. `node scripts/importar-imagen.mjs ruta/original.png <hueco>` → recorta a la proporción exacta, convierte a `.webp` y lo deja en `public/images/`. Los huecos válidos están en el propio script
   (`HUECOS`); para un hueco nuevo se añade ahí con su medida.
3. Si es un hueco nuevo: conectarlo en la página, añadir su texto alternativo (ES y CA) en `lib/site-copy.ts` → `images` y ejecutar `npm run test:web` y `npm run build:cf`.
4. **No se publica sin aprobación** (`actualizar-restora.bat`, opción P).

## Encargos originales

Se conservan por si hay que renovar una imagen con la misma intención.

### «Sobre nosotros» (4:5, vertical)
> Fotografía editorial, luz natural de mañana. Una mesa de trabajo de un restaurante independiente: un montón de albaranes de proveedores, un móvil apoyado con la cámara hacia los
> papeles, una taza de café y una libreta; al fondo, desenfocada, la cocina abierta con utensilios de acero. Sin personas en primer plano ni caras. Paleta sobria: verdes profundos,
> madera clara, acero. Poca profundidad de campo. Vertical 4:5. Sin texto ni logotipos.

La imagen elegida del carrusel es una mesa de trabajo de cocina sin personas; si algún día se prefiere la de los albaranes con el móvil, es este encargo.

### Miniatura del vídeo (16:9, horizontal)
> Fotografía editorial de una cocina profesional en servicio, con espacio libre en el centro para un botón de reproducir. Horizontal 16:9. Sin texto.

## Vídeo de presentación

Sin personas que graben: una **grabación de pantalla del producto** con datos de ejemplo (subir un albarán → precios leídos → coste del plato → aviso de subida de precio → «Hoy»),
de 45–60 s con subtítulos en castellano y catalán, reproducible con Playwright (`recordVideo`). Es honesta con lo que hace la app y se actualiza sola cuando cambia la interfaz.
Se prepara con la Task 31d del plan si lo confirmas. Mientras no exista, el bloque de la home dice «Próximamente» sobre la miniatura.
