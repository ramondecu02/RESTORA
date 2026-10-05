# Marca de RESTORA y kit para crear las redes sociales

> Las redes sociales y la imagen para ellas **no existen todavía** (decisión del propietario, 5/10/2026). Este kit las deja listas para crear.
> Los archivos están en [`marca/`](marca/) y se regeneran con `node scripts/marca.mjs`. Hasta que existan los perfiles, **la web no enseña ningún icono de red**:
> se activan al poner la dirección en `lib/site.ts` → `SOCIAL_LINKS` (con la URL vacía, el icono no se pinta).

## 1. Qué hay en el kit

| Archivo | Medida | Para qué |
|---|---|---|
| `avatar-1080.png` · `avatar-400.png` | 1080² · 400² | Foto de perfil en todas las redes (el símbolo cabe en el recorte circular) |
| `portada-linkedin-1584x396.png` | 1584×396 | Portada de la página de empresa en LinkedIn (el avatar tapa la esquina inferior izquierda: el contenido va a la derecha) |
| `portada-x-1500x500.png` | 1500×500 | Cabecera de X |
| `portada-facebook-820x312.png` | 820×312 | Portada de Facebook |
| `portada-youtube-2560x1440.png` | 2560×1440 | Banner de YouTube (la zona segura para todos los dispositivos es 1546×423, centrada) |
| `og-1200x630.png` | 1200×630 | Imagen para compartir enlaces (alternativa a la foto actual de `public/og/restora-og.jpg`) |
| `post-portada-1080x1350.png` · `post-pregunta-1080x1350.png` | 1080×1350 (4:5) | Plantillas de publicación para Instagram y LinkedIn (portada de carrusel y pregunta) |
| `historia-1080x1920.png` | 1080×1920 | Plantilla de historia |
| `logo-color.svg` · `logo-blanco.svg` · `simbolo.svg` | vectorial | Logotipo sobre claro, sobre oscuro y símbolo solo (la palabra va como trazos: no hace falta la fuente) |

No lleva cifras, testimonios ni sellos: solo el lema y los textos que ya dice la web («El control inteligente de tu restaurante.», «De los datos a las decisiones.»).

## 2. Logotipo

- **Símbolo** («plato inteligente»): una baldosa redondeada con un aro (el plato) y una línea que sube hasta su punto (del coste al margen). Es el icono de la app.
- **Logotipo**: símbolo + **RESTORA** en Inter 800 con letras separadas (0,16 em). La palabra mide el 62 % de la altura de la baldosa y se centra con ella.
- **Zona de protección**: alrededor del logotipo, al menos la mitad de la altura de la baldosa. **Tamaño mínimo**: baldosa de 24 px (símbolo solo: 16 px).
- **No** deformarlo, cambiar los colores, añadir sombras ni ponerlo sobre fotos con mucho detalle sin un velo verde.

## 3. Color y tipografía

| Token | Hex | Uso |
|---|---|---|
| Marca | `#1E3D2F` | Fondos de marca, texto principal sobre claro |
| Acento | `#3E8E6A` | Baldosa sobre fondo de marca, destacados, líneas |
| Tinta | `#14201A` | Texto |
| Fondo | `#F5F6F3` | Fondos claros |
| Suave | `#E3F0E8` | Segunda línea de titulares sobre verde |

Tipografía: **Inter** (400 para texto, 600–800 para títulos). Mismos tokens que la app (`producto/src/app/globals.css`).

## 4. Nombres de usuario propuestos (no he podido comprobar su disponibilidad: hay que mirarlo al crear cada cuenta)

Primera opción en todas: **@restoraapp**. Alternativas si estuviera ocupado: `@restora.app`, `@restoraapp.es`, `@getrestora`. Conviene el mismo nombre en todas las redes.

## 5. Textos de perfil (verdaderos con lo que hace el producto hoy)

**Instagram / TikTok (≤ 150 caracteres)**
- ES: «El control inteligente de tu restaurante. Sube un albarán y conoce el coste real de cada plato. Prueba 14 días → restoraapp.app»
- CA: «El control intel·ligent del teu restaurant. Puja un albarà i coneix el cost real de cada plat. Prova 14 dies → restoraapp.app»

**X (≤ 160)**
- ES: «El control inteligente de tu restaurante: compras, escandallos e inventario en un solo lugar. 14 días de prueba → restoraapp.app»
- CA: «El control intel·ligent del teu restaurant: compres, escandalls i inventari en un sol lloc. 14 dies de prova → restoraapp.app»

**LinkedIn: eslogan (≤ 220)**
- ES: «Control de costes para restaurantes: compras, proveedores, escandallos e inventario en un solo lugar.»
- CA: «Control de costos per a restaurants: compres, proveïdors, escandalls i inventari en un sol lloc.»

**LinkedIn: «Acerca de» (ES)**
> RESTORA es una herramienta de control de costes para restaurantes. Subes la foto de un albarán o una factura y leemos los precios; con ellos se actualiza lo que te cuesta cada ingrediente y, con cada escandallo, lo que te cuesta cada plato.
>
> Te avisamos cuando un proveedor sube un precio que afecta a tus platos, comparamos proveedores y te decimos qué platos se salen de tu food cost objetivo. Inventario, pedidos sugeridos y carta, en el mismo sitio.
>
> Pruébala 14 días, sin tarjeta: restoraapp.app

**YouTube: descripción del canal (ES)**
> Cómo controlar los costes de un restaurante: escandallos, food cost, albaranes, proveedores e inventario, explicado con ejemplos. Herramienta: restoraapp.app

Contacto en los perfiles: `hola@restoraapp.com` (el teléfono, cuando se confirme el número nuevo).

## 6. Cómo crear los perfiles (lo hace el propietario: necesitan su identidad y verificación)

1. Crear las cuentas con un correo de la empresa (`hola@restoraapp.com`) y activar la verificación en dos pasos.
2. Subir `avatar-1080.png` y la portada de cada red (tabla de arriba); pegar el texto de la sección 5.
3. Con las URLs reales, pegarlas en `lib/site.ts` → `SOCIAL_LINKS` (el icono sale solo en pie y «Sobre nosotros»).
4. **No publicar nada de pago.** La directriz vigente es sin publicidad hasta tener el MVP terminado; crear los perfiles y publicar contenido propio no lo es, pero el plan de contenidos
   (`docs/marketing/salida-a-mercado.md`, Task 33) se prepara aparte.
