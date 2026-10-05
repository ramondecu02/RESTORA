// Framing copy for the Precios page. The pricing block lives in lib/site-copy.ts; no price or
// plan name is published until the owner confirms them (decision D1) — nothing here invents plans or conditions.

const es = {
  hero: {
    eyebrow: "Precios",
    title: "Pruébalo con tus propios albaranes.",
    sub: "Todo RESTORA durante 14 días, sin tarjeta y sin compromiso, para que veas qué le cuesta de verdad cada plato a tu cocina.",
  },
  includedTitle: "Qué entra desde el primer día",
  includedGroups: [
    { title: "Compras y proveedores", items: ["Histórico de precios", "Comparativa entre proveedores", "Gasto por proveedor"] },
    { title: "Costes y carta", items: ["Escandallos por plato", "Food cost y margen real", "Aviso de plato a revisar"] },
    { title: "Control y avisos", items: ["Inventario y consumo", "Alertas de precio", "Insights con impacto calculado"] },
  ],
  fit: {
    eyebrow: "A quién le encaja",
    title: "¿Es para tu restaurante?",
    sub: "RESTORA está pensado para cocina profesional con carta propia y compras recurrentes. Estos son los perfiles donde más rinde.",
    profiles: [
      {
        name: "Restaurante independiente",
        desc: "Un local, carta propia y varios proveedores fijos.",
        signals: ["Entre 40 y 120 comensales/día", "Carta que cambia por temporada", "Hoy controlas costes en Excel o de memoria"],
      },
      {
        name: "Cocina con volumen",
        desc: "Mucha rotación y compras semanales grandes.",
        signals: ["Compras a 5 proveedores o más", "El food cost se te mueve cada mes", "Necesitas ver el margen por plato, no global"],
      },
    ],
    note: "¿No te reconoces en ninguno? Escríbenos igualmente y te decimos con franqueza si te encaja.",
  },
  objections: {
    eyebrow: "Antes de decidir",
    title: "Lo que suelen preguntarnos del precio.",
    items: [
      { q: "¿Cuánto cuesta?", a: "Pruébalo 14 días sin tarjeta. Publicaremos el precio de la suscripción en esta página; si necesitas saberlo antes de empezar, escríbenos." },
      { q: "¿Hay permanencia?", a: "No. La suscripción es mensual y puedes dejarla cuando quieras." },
      { q: "¿Hay coste de puesta en marcha?", a: "No cobramos alta. Te ayudamos a cargar tus recetas y proveedores durante la primera semana." },
    ],
    linkLabel: "Ver todas las preguntas",
  },
};

export type PreciosCopy = typeof es;

const ca: PreciosCopy = {
  hero: {
    eyebrow: "Preus",
    title: "Prova-ho amb els teus propis albarans.",
    sub: "Tot RESTORA durant 14 dies, sense targeta i sense compromís, perquè vegis què costa de debò cada plat a la teva cuina.",
  },
  includedTitle: "Què entra des del primer dia",
  includedGroups: [
    { title: "Compres i proveïdors", items: ["Històric de preus", "Comparativa entre proveïdors", "Despesa per proveïdor"] },
    { title: "Costos i carta", items: ["Escandalls per plat", "Food cost i marge real", "Avís de plat a revisar"] },
    { title: "Control i avisos", items: ["Inventari i consum", "Alertes de preu", "Insights amb impacte calculat"] },
  ],
  fit: {
    eyebrow: "A qui li encaixa",
    title: "És per al teu restaurant?",
    sub: "RESTORA està pensat per a cuina professional amb carta pròpia i compres recurrents. Aquests són els perfils on més rendeix.",
    profiles: [
      {
        name: "Restaurant independent",
        desc: "Un local, carta pròpia i diversos proveïdors fixos.",
        signals: ["Entre 40 i 120 comensals/dia", "Carta que canvia per temporada", "Avui controles costos a l'Excel o de memòria"],
      },
      {
        name: "Cuina amb volum",
        desc: "Molta rotació i compres setmanals grans.",
        signals: ["Compres a 5 proveïdors o més", "El food cost se't mou cada mes", "Necessites veure el marge per plat, no global"],
      },
    ],
    note: "No et reconeixes en cap? Escriu-nos igualment i et diem amb franquesa si t'encaixa.",
  },
  objections: {
    eyebrow: "Abans de decidir",
    title: "El que solen preguntar-nos del preu.",
    items: [
      { q: "Quant costa?", a: "Prova-ho 14 dies sense targeta. Publicarem el preu de la subscripció en aquesta pàgina; si necessites saber-lo abans de començar, escriu-nos." },
      { q: "Hi ha permanència?", a: "No. La subscripció és mensual i pots deixar-la quan vulguis." },
      { q: "Hi ha cost de posada en marxa?", a: "No cobrem alta. T'ajudem a carregar les teves receptes i proveïdors durant la primera setmana." },
    ],
    linkLabel: "Veure totes les preguntes",
  },
};

export const preciosCopy = { es, ca };
