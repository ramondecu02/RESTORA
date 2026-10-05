// Copy for the "Cómo funciona" page: one continuous restaurant story that
// walks from raw data to an actual decision. Deliberately different from the
// home page, which only presents the idea.

const es = {
  hero: {
    eyebrow: "Cómo funciona",
    title: "Un martes cualquiera, contado entero.",
    sub: "De un albarán que entra por la puerta a una decisión que protege tu margen. Estos son los cuatro pasos, con el mismo caso de principio a fin.",
  },
  caseTag: "Caso de ejemplo · el aceite de oliva",
  stages: [
    {
      num: "01",
      step: "Datos",
      title: "Entra un albarán. Tú solo confirmas.",
      body: "No cambias tu operativa: haces una foto al albarán o subes el PDF. RESTORA lo lee, lo ordena y, cuando lo confirmas, lo guarda con fecha, proveedor y precio por unidad.",
      moment: "Martes, 8:40",
      example: "Llega el pedido semanal. El aceite AOVE viene a 8,40 €/L.",
      tag: "Albarán 4587 · Distribuidora Mediterránea",
    },
    {
      num: "02",
      step: "Análisis",
      title: "Se compara con tu compra anterior.",
      body: "RESTORA mira ese precio frente a la compra anterior, calcula la subida y localiza cada receta donde usas ese ingrediente.",
      moment: "Al instante",
      example: "8,40 € no es un precio suelto: sube un 14 % frente a tu compra anterior.",
      tag: "14 escandallos usan aceite AOVE",
    },
    {
      num: "03",
      step: "Insight",
      title: "El número que te importa, ya calculado.",
      body: "No te da un gráfico para que lo interpretes. Te dice qué significa esa subida en tu food cost y en tu caja a fin de mes.",
      moment: "Misma mañana",
      example: "Tu food cost medio pasa del 29,4 % al 30,8 %. Son unos 318 € al mes.",
      tag: "Impacto estimado sobre tu carta actual",
    },
    {
      num: "04",
      step: "Decisión",
      title: "Tres herramientas, y tú eliges.",
      body: "RESTORA te lleva al plato y a los proveedores alternativos, con el efecto calculado antes de aceptar. Eliges y los escandallos se recalculan.",
      moment: "En dos minutos",
      example: "Cambiar de proveedor, ajustar la ración o subir 0,40 € tres platos.",
      tag: "Decides tú · el cálculo lo pone RESTORA",
      options: [
        { label: "Cambiar de proveedor", effect: "−1,70 €/kg", note: "Ahorro estimado al año" },
        { label: "Ajustar ración", effect: "−2 ml/plato", note: "Sin tocar la carta" },
        { label: "Subir PVP", effect: "+0,40 € en 3 platos", note: "Food cost al 29,1 %" },
      ],
    },
  ],
  week: {
    eyebrow: "Puesta en marcha",
    title: "Tu primera semana, sin dramas.",
    sub: "No hay migración, ni proyecto de tres meses, ni cambiar de TPV.",
    steps: [
      { day: "Día 1", title: "Subes tu carta", body: "Subes tu carta y montas tus primeros escandallos con plantillas y sugerencias. Te acompañamos en el arranque." },
      { day: "Días 2-6", title: "Entran tus compras", body: "Cada albarán que registras alimenta el histórico. Cuantos más, más fino es el análisis." },
      { day: "Día 7", title: "Primera foto real", body: "Ves tu food cost por plato y el primer aviso de precio. A partir de aquí, se actualiza con cada albarán que confirmas." },
    ],
  },
  reassure: {
    eyebrow: "Lo que no tienes que hacer",
    title: "RESTORA se adapta a tu cocina, no al revés.",
    items: [
      { title: "No cambias de TPV", body: "RESTORA se coloca por encima de lo que ya usas." },
      { title: "No rehaces tus Excel", body: "Nos pasas lo que tienes y lo cargamos contigo; lo demás se actualiza con tus albaranes." },
      { title: "No necesitas un informático", body: "Si sabes leer un albarán, sabes usarlo." },
    ],
  },
};

export type ComoFuncionaCopy = typeof es;

const ca: ComoFuncionaCopy = {
  hero: {
    eyebrow: "Com funciona",
    title: "Un dimarts qualsevol, explicat sencer.",
    sub: "D'un albarà que entra per la porta a una decisió que protegeix el teu marge. Aquests són els quatre passos, amb el mateix cas de principi a fi.",
  },
  caseTag: "Cas d'exemple · l'oli d'oliva",
  stages: [
    {
      num: "01",
      step: "Dades",
      title: "Entra un albarà. Tu només confirmes.",
      body: "No canvies la teva operativa: fas una foto a l'albarà o puges el PDF. RESTORA el llegeix, l'ordena i, quan el confirmes, el desa amb data, proveïdor i preu per unitat.",
      moment: "Dimarts, 8:40",
      example: "Arriba la comanda setmanal. L'oli AOVE ve a 8,40 €/L.",
      tag: "Albarà 4587 · Distribuïdora Mediterrània",
    },
    {
      num: "02",
      step: "Anàlisi",
      title: "Es compara amb la teva compra anterior.",
      body: "RESTORA mira aquest preu davant la compra anterior, calcula la pujada i localitza cada recepta on fas servir aquest ingredient.",
      moment: "A l'instant",
      example: "8,40 € no és un preu solt: puja un 14 % respecte a la teva compra anterior.",
      tag: "14 escandalls fan servir oli AOVE",
    },
    {
      num: "03",
      step: "Insight",
      title: "El número que t'importa, ja calculat.",
      body: "No et dona un gràfic perquè l'interpretis. Et diu què significa aquesta pujada en el teu food cost i en la teva caixa a final de mes.",
      moment: "El mateix matí",
      example: "El teu food cost mitjà passa del 29,4 % al 30,8 %. Són uns 318 € al mes.",
      tag: "Impacte estimat sobre la teva carta actual",
    },
    {
      num: "04",
      step: "Decisió",
      title: "Tres eines, i tries tu.",
      body: "RESTORA et porta al plat i als proveïdors alternatius, amb l'efecte calculat abans d'acceptar. Tries i els escandalls es recalculen.",
      moment: "En dos minuts",
      example: "Canviar de proveïdor, ajustar la ració o pujar 0,40 € tres plats.",
      tag: "Decideixes tu · el càlcul el posa RESTORA",
      options: [
        { label: "Canviar de proveïdor", effect: "−1,70 €/kg", note: "Estalvi estimat a l'any" },
        { label: "Ajustar ració", effect: "−2 ml/plat", note: "Sense tocar la carta" },
        { label: "Pujar PVP", effect: "+0,40 € en 3 plats", note: "Food cost al 29,1 %" },
      ],
    },
  ],
  week: {
    eyebrow: "Posada en marxa",
    title: "La teva primera setmana, sense drames.",
    sub: "No hi ha migració, ni projecte de tres mesos, ni canviar de TPV.",
    steps: [
      { day: "Dia 1", title: "Puges la teva carta", body: "Puges la teva carta i muntes els teus primers escandalls amb plantilles i suggeriments. T'acompanyem en l'arrencada." },
      { day: "Dies 2-6", title: "Entren les teves compres", body: "Cada albarà que registres alimenta l'històric. Com més n'hi hagi, més fina és l'anàlisi." },
      { day: "Dia 7", title: "Primera foto real", body: "Veus el teu food cost per plat i el primer avís de preu. A partir d'aquí, s'actualitza amb cada albarà que confirmes." },
    ],
  },
  reassure: {
    eyebrow: "El que no has de fer",
    title: "RESTORA s'adapta a la teva cuina, no al revés.",
    items: [
      { title: "No canvies de TPV", body: "RESTORA es col·loca per sobre del que ja fas servir." },
      { title: "No refàs els teus Excel", body: "Ens passes el que tens i ho carreguem amb tu; la resta s'actualitza amb els teus albarans." },
      { title: "No necessites un informàtic", body: "Si saps llegir un albarà, saps fer-lo servir." },
    ],
  },
};

export const comoFuncionaCopy = { es, ca };
