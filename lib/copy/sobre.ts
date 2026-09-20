// "Sobre nosotros". Nothing biographical is invented: everything that must
// come from Ramon is an explicit [PENDIENTE] placeholder. The thesis and the
// principles are the ones the rest of the site already states.

const es = {
  hero: {
    eyebrow: "Sobre nosotros",
    title: "Por qué existe RESTORA.",
    sub: "Una herramienta pequeña, hecha en Cataluña, para que el restaurante independiente sepa cada semana —con números, no de memoria— qué le cuesta de verdad cada plato.",
  },
  who: {
    eyebrow: "Quién está detrás",
    name: "Ramon",
    role: "[PENDIENTE: cargo y trayectoria real de Ramon]",
    photoPlaceholder: "[PENDIENTE: foto real de Ramon · vertical, mín. 800×1000 px]",
    bio: [
      "[PENDIENTE: bio real de Ramon — 3 o 4 líneas: de dónde viene, qué relación tiene con la hostelería y qué vio en cocina que le llevó a construir RESTORA.]",
      "[PENDIENTE: una frase en primera persona sobre cómo quiere trabajar con los primeros restaurantes.]",
    ],
    contactLabel: "Hablar directamente",
    contactNote: "Sin comercial de por medio: te responde quien construye el producto.",
  },
  why: {
    eyebrow: "El punto de partida",
    title: "La mayoría de restaurantes decide a ciegas sobre lo que más le cuesta.",
    body: [
      "No por falta de oficio. La información está: en los albaranes, en el Excel de escandallos, en la cabeza del jefe de cocina. Lo que no está es junta, actualizada y delante cuando hay que decidir qué comprar, a quién y a qué precio vender un plato.",
      "RESTORA nace para cerrar ese hueco sin cambiar la operativa de nadie: registras lo que ya registras —compras, recetas, proveedores— y el sistema te devuelve el margen real de cada plato y un aviso cuando algo se mueve.",
    ],
  },
  thesis: {
    eyebrow: "La tesis",
    quote: "Cada venta debe generar inteligencia de negocio.",
    body: "Cada plato que sale al pase está unido a una receta, a unos ingredientes y a un precio de compra que cambia. Si esa cadena está conectada, cada ticket te dice algo útil: qué margen deja, qué proveedor se está encareciendo y qué plato conviene revisar antes de que te lo diga la cuenta de resultados.",
    principles: [
      { title: "Sin humo", body: "Solo tus datos y lo que se puede calcular con ellos. Ningún indicador inventado, ninguna promesa de resultados que no dependa de tu cocina." },
      { title: "Sin comercial de por medio", body: "Te escribes con quien construye el producto. Las demos se hacen con un plato tuyo, no con un catálogo." },
      { title: "Tus datos son tuyos", body: "No se comparten con otros restaurantes ni con proveedores. Cualquier referencia sectorial es anónima y agregada; puedes exportar y borrar todo cuando quieras." },
    ],
  },
  where: {
    eyebrow: "Dónde estamos",
    title: "Cataluña, empezando por Tarragona y Barcelona.",
    body: "Arrancamos con un grupo reducido de restaurantes —el programa de socios fundadores— para construir el producto sobre cocinas reales antes de abrirlo a todo el mundo.",
    cta: "Reservar plaza de socio fundador",
    secondary: "Ver cómo funciona",
  },
};

export type SobreCopy = typeof es;

const ca: SobreCopy = {
  hero: {
    eyebrow: "Sobre nosaltres",
    title: "Per què existeix RESTORA.",
    sub: "Una eina petita, feta a Catalunya, perquè el restaurant independent sàpiga cada setmana —amb números, no de memòria— què li costa de debò cada plat.",
  },
  who: {
    eyebrow: "Qui hi ha al darrere",
    name: "Ramon",
    role: "[PENDENT: càrrec i trajectòria real d'en Ramon]",
    photoPlaceholder: "[PENDENT: foto real d'en Ramon · vertical, mín. 800×1000 px]",
    bio: [
      "[PENDENT: bio real d'en Ramon — 3 o 4 línies: d'on ve, quina relació té amb l'hostaleria i què va veure a cuina que el va portar a construir RESTORA.]",
      "[PENDENT: una frase en primera persona sobre com vol treballar amb els primers restaurants.]",
    ],
    contactLabel: "Parlar directament",
    contactNote: "Sense comercial pel mig: et respon qui construeix el producte.",
  },
  why: {
    eyebrow: "El punt de partida",
    title: "La majoria de restaurants decideix a cegues sobre el que més li costa.",
    body: [
      "No per falta d'ofici. La informació hi és: als albarans, a l'Excel d'escandalls, al cap del cap de cuina. El que no hi és és junta, actualitzada i al davant quan cal decidir què comprar, a qui i a quin preu vendre un plat.",
      "RESTORA neix per tancar aquest buit sense canviar l'operativa de ningú: registres el que ja registres —compres, receptes, proveïdors— i el sistema et retorna el marge real de cada plat i un avís quan alguna cosa es mou.",
    ],
  },
  thesis: {
    eyebrow: "La tesi",
    quote: "Cada venda ha de generar intel·ligència de negoci.",
    body: "Cada plat que surt al pas està lligat a una recepta, a uns ingredients i a un preu de compra que canvia. Si aquesta cadena està connectada, cada tiquet et diu alguna cosa útil: quin marge deixa, quin proveïdor s'està encarint i quin plat convé revisar abans que t'ho digui el compte de resultats.",
    principles: [
      { title: "Sense fum", body: "Només les teves dades i el que es pot calcular amb elles. Cap indicador inventat, cap promesa de resultats que no depengui de la teva cuina." },
      { title: "Sense comercial pel mig", body: "T'escrius amb qui construeix el producte. Les demos es fan amb un plat teu, no amb un catàleg." },
      { title: "Les teves dades són teves", body: "No es comparteixen amb altres restaurants ni amb proveïdors. Qualsevol referència sectorial és anònima i agregada; pots exportar i esborrar-ho tot quan vulguis." },
    ],
  },
  where: {
    eyebrow: "On som",
    title: "Catalunya, començant per Tarragona i Barcelona.",
    body: "Arrenquem amb un grup reduït de restaurants —el programa de socis fundadors— per construir el producte sobre cuines reals abans d'obrir-lo a tothom.",
    cta: "Reservar plaça de soci fundador",
    secondary: "Veure com funciona",
  },
};

export const sobreCopy = { es, ca };
