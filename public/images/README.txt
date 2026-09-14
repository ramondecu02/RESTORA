IMÁGENES DE LA WEB — cómo poner tus fotos reales
=================================================

Ahora mismo hay 5 imágenes de MARCA provisionales (degradados verdes con el
logo). La web ya se ve completa, pero para la versión final debes sustituirlas
por tus 5 fotos reales. Solo tienes que guardar tu foto con el MISMO nombre de
archivo, en esta misma carpeta (public/images/). Se reemplaza sola.

  hero.jpg         Cocina / chef en acción (horizontal)  ·  ~1600×900
                   → Portada (banda grande de la página de inicio)

  chef.jpg         Chef trabajando (retrato/vertical ok)  ·  ~1500×950
                   → Cabecera de "Cómo funciona"

  chef2.jpg        Chef o equipo en cocina                ·  ~1500×950
                   → Cabecera de "Funcionalidades"

  restaurante.jpg  Interior del restaurante / sala        ·  ~1300×980
                   → Página de "Contacto"

  plato.jpg        Plato emplatado (primer plano)         ·  ~700×700
                   → Miniatura del escandallo (Funcionalidades)

Formato: JPG (o cambia también la extensión en el código). Peso recomendado:
menos de 400 KB cada una para que cargue rápido.

Los degradados provisionales se generan con: node scripts/gen-placeholders.mjs
(no hace falta ejecutarlo; solo si quieres regenerarlos).
