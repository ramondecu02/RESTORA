# Imágenes generadas para la web: encargos y reglas

> Decisión del propietario (5/10/2026): «usar imágenes generadas para rellenar la web». **Claude no genera imágenes**: las de ambientación las genera el propietario con su herramienta
> (o con la clave de API de un proveedor de imágenes, guardada como secreto y nunca en el repositorio). Lo que sí se genera aquí, a partir del producto real: capturas
> (`scripts/capturas.mjs`, Task 27), el kit de marca (`scripts/marca.mjs`) y una grabación de pantalla de la app para el vídeo.

## Reglas

1. **Ambientación y producto, nunca personas concretas.** Nada de retratos de «clientes», «el equipo» o «el fundador», ni testimonios, ni sellos o premios: una cara generada que
   parece una persona real es engañosa. La sección «Sobre nosotros» se rellena con un lugar de trabajo (mesa con albaranes y un móvil, cocina por la mañana), sin caras.
2. **Sin texto, logotipos ni cifras dentro de la imagen** (los generadores los estropean y no son accesibles): el texto va en la web.
3. **Un solo estilo**: fotografía editorial de cocina y sala de un restaurante independiente español, luz natural cálida, poca profundidad de campo, colores sobrios con verdes
   profundos y madera; sin filtros saturados, sin aspecto «de catálogo». Mismo estilo que las imágenes que ya hay en `public/images/`.
4. **Texto alternativo** descriptivo (no «imagen generada»), en castellano y catalán.
5. Formato final `.webp`. Las variantes responsive las genera `npm run build:cf` (`scripts/gen-image-variants.mjs`).

## Huecos pendientes

| Hueco | Dónde | Medida | Estado |
|---|---|---|---|
| `sobre-nosotros.webp` | `app/[locale]/sobre-nosotros/page.tsx` (hoy, un recuadro punteado) | 1200×1500 (4:5) | **Pendiente** |
| `video-poster.webp` | bloque de vídeo de la home (`components/home/video.tsx`) | 1600×900 (16:9) | **Pendiente**; mientras tanto el bloque dice «próximamente» |

El resto de la web ya tiene imagen (13 en `public/images/`). Si hay otros huecos que quieras cambiar, dime la página y la sustituimos con el mismo encargo.

### Encargo 1 · «Sobre nosotros» (4:5, vertical)
> Fotografía editorial, luz natural de mañana. Una mesa de trabajo de un restaurante independiente: un montón de albaranes de proveedores, un móvil apoyado con la cámara hacia los
> papeles, una taza de café y una libreta; al fondo, desenfocada, la cocina abierta con utensilios de acero. Sin personas en primer plano ni caras. Paleta sobria: verdes profundos,
> madera clara, acero. Poca profundidad de campo. Vertical 4:5. Sin texto ni logotipos.
- *Alt (ES)*: «Mesa de trabajo de un restaurante con albaranes de proveedores y un móvil, con la cocina al fondo».
- *Alt (CA)*: «Taula de treball d'un restaurant amb albarans de proveïdors i un mòbil, amb la cuina al fons».

### Encargo 2 · miniatura del vídeo (16:9, horizontal)
> Fotografía editorial: un plato de pescado recién emplatado en la pasa de una cocina profesional, vapor ligero, luz cálida lateral; al fondo, desenfocado, el equipo trabajando
> (siluetas, sin rostros reconocibles). Horizontal 16:9, composición con espacio libre en el centro para un botón de reproducir. Sin texto.
- *Alt (ES)*: «Plato de pescado recién emplatado en la pasa de una cocina profesional».
- *Alt (CA)*: «Plat de peix acabat d'emplatar al pas d'una cuina professional».

## Del archivo a la web

1. Guardar el original generado (png, jpg o webp) con el nombre del hueco, por ejemplo `sobre-nosotros.png`.
2. `node scripts/importar-imagen.mjs ruta/sobre-nosotros.png sobre-nosotros` → recorta a la proporción exacta, convierte a `.webp` y lo deja en `public/images/`.
3. Avisar para conectarlo a la página (quitar el recuadro punteado y poner el `alt`) y regenerar la web. **No se publica sin aprobación** (`actualizar-restora.bat`, opción P).

## Vídeo de presentación

Sin personas que graben: una **grabación de pantalla del producto** con datos de ejemplo (subir un albarán → precios leídos → coste del plato → aviso de subida de precio → «Hoy»),
de 45–60 s con subtítulos en castellano y catalán, reproducible con Playwright (`recordVideo`). Es honesta con lo que hace la app y se actualiza sola cuando cambia la interfaz.
Se prepara con la Task 31d del plan si lo confirmas.
