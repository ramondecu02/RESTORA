import type { Locale } from "./types";

// Bilingual copy (ES / CA), ported verbatim from the design prototype's
// `copy()` block. This is the single source of truth for all landing copy,
// section order, plans, pains, steps, ICP and form labels.

const es = {
  meta: {
    title: "RESTORA · El socio inteligente de tu cocina",
    description:
      "Inteligencia de negocio y food cost para restaurantes profesionalizados de Cataluña. Cada compra, plato y venta, convertidos en decisiones que suben tu margen.",
  },
  util: {
    thesis: "CADA VENTA GENERA INTELIGENCIA DE NEGOCIO",
    slots: "SOCIO FUNDADOR · PLAZAS LIMITADAS",
  },
  nav: {
    l1: "Cómo funciona",
    l2: "Por qué RESTORA",
    l3: "Precios",
    cta: "Sé socio fundador",
  },
  sec: {
    problem: "El problema",
    ladder: "Cómo funciona",
    why: "Por qué",
    icp: "Para quién",
    pricing: "Precios",
    proof: "Credibilidad",
  },
  brand: { kicker: "Identidad", title: "El plato inteligente" },
  hero: {
    eyebrow: "Inteligencia de negocio · restaurantes",
    title: "El socio inteligente de tu cocina.",
    sub: "Cada compra, cada plato y cada venta, convertidos en decisiones que suben tu margen.",
    ctaPrimary: "Sé socio fundador",
    ctaSecondary: "Ver cómo funciona",
    alertTitle: "El aceite subió un 14%",
    alertBody:
      "Casa Pujol lo tiene un 9% más barato esta semana. ¿Cambias de proveedor?",
    chartLabel: "ACEITE DE OLIVA",
    stat1Label: "Tu precio",
    stat2Label: "Media zona",
    liveAlert: "RESTORA · ALERTA EN VIVO",
    today: "HOY",
  },
  ticker: [
    { v: "31,4%", k: "Food cost medio" },
    { v: "68%", k: "Margen bruto" },
    { v: "1,94 €/L", k: "PMP aceite" },
    { v: "−6 pts", k: "Coste evitado" },
  ],
  problem: {
    title: "Tu margen se escapa por sitios que no ves.",
    pains: [
      {
        title: "Márgenes cada vez más finos",
        desc: "Cada punto de food cost cuenta, y hoy los defiendes a ciegas.",
      },
      {
        title: "Compras sin histórico",
        desc: "Nadie recuerda a cuánto estaba el aceite hace tres meses. RESTORA sí.",
      },
      {
        title: "Escandallos que caducan",
        desc: "El día que los calculas ya están desfasados por los precios reales.",
      },
      {
        title: "Datos que no deciden",
        desc: "Tienes números por todas partes, pero ninguno te dice qué hacer.",
      },
    ],
  },
  ladder: {
    title: "Empieza con una foto.",
    sub: "La escalera de valor en tres niveles. Subes cuando tú quieres.",
    steps: [
      {
        name: "Compras",
        desc: "Foto del albarán y RESTORA lee cada línea: histórico de precios, PMP y alertas cuando un proveedor sube.",
        tag: "Valor en la semana 1",
      },
      {
        name: "Ventas",
        desc: "Food cost global del negocio y ranking de platos por lo que realmente aportan al margen.",
        tag: "Food cost real",
      },
      {
        name: "Escandallos",
        desc: "Margen real plato a plato e ingeniería de menú para colocar lo que más rinde.",
        tag: "Margen por plato",
      },
    ],
  },
  why: {
    title: "No es otro TPV. Es la capa de inteligencia.",
    items: [
      {
        title: "De descriptivo a prescriptivo",
        desc: "No solo te enseña el número: te dice qué hacer con él y qué pasa si no lo haces.",
      },
      {
        title: "Validación por confianza",
        desc: "RESTORA hace el trabajo pesado y te propone. Tú confirmas con un toque. Tú decides.",
      },
    ],
    benchKicker: "El diferenciador",
    benchTitle: "Cómo estás frente a los restaurantes de tu zona.",
    benchBody:
      "Benchmark sectorial anónimo. Tu food cost comparado con restaurantes similares de tu comarca. Nadie más lo ofrece.",
    benchMetric: "Tu food cost",
    benchZone: "Media zona",
  },
  manifesto: {
    kicker: "Manifiesto",
    title:
      "No es un software que guarda datos. Es un socio que ayuda a decidir.",
    body: "El socio honesto que te enseña de qué está hecho cada número, no se inventa nada, critica con criterio y sugiere la siguiente acción. Pero la decisión, siempre, es tuya.",
  },
  icp: {
    title: "Para el restaurante que ya se toma en serio sus números.",
    list: [
      "Alta gastronomía sin estrella",
      "Gastrobares y cocina de producto",
      "Coctelerías con carta de coste vivo",
      "Mini-grupos de 1 a 5 locales · Cataluña",
    ],
  },
  pricing: {
    title: "Precios claros. Sin letra pequeña.",
    sub: "Empieza por donde te aporte antes. Sube de plan cuando el margen lo pida.",
    recommended: "Recomendado",
    cta: "Empezar",
    implantation: "Implantación 0–500 € · gratis para socios fundadores.",
    founderTitle: "Socio Fundador",
    founderProgram: "Programa",
    founderBody:
      "Para los primeros 5-10 restaurantes de Cataluña: precio y acceso especial, e influencia directa en el producto que estás ayudando a construir.",
    plans: [
      {
        name: "Base",
        price: "89 €",
        period: "/mes",
        featured: false,
        tagline: "Empieza por las compras. Valor desde la primera foto.",
        features: [
          "Nivel 1 · Compras",
          "Lectura de albaranes con foto",
          "Histórico de precios y PMP",
          "Alertas de subida de proveedor",
          "1 local",
        ],
      },
      {
        name: "Pro",
        price: "149 €",
        period: "/mes",
        featured: true,
        tagline: "El sistema completo: compras, ventas y margen por plato.",
        features: [
          "Todo lo de Base",
          "Nivel 2 · Food cost global",
          "Nivel 3 · Escandallos vivos",
          "Benchmark sectorial anónimo",
          "Ingeniería de menú",
          "1 local",
        ],
      },
      {
        name: "Grupo",
        price: "249 €",
        period: "/mes",
        featured: false,
        tagline: "Para varios locales con vista consolidada de grupo.",
        features: [
          "Todo lo de Pro",
          "De 2 a 5 locales",
          "Vista consolidada de grupo",
          "Comparativa entre locales",
          "Onboarding dedicado",
        ],
      },
    ],
  },
  proof: {
    title: "Construido con cocinas reales.",
    logos: [
      "Socio de diseño",
      "Michelin · próximamente",
      "Soles Repsol · próx.",
      "Grupo piloto",
    ],
    testimonials: [
      {
        quote: "Espacio reservado para el primer restaurante socio fundador.",
        who: "TESTIMONIO · PRÓXIMAMENTE",
      },
      {
        quote: "Aquí irá la voz de quien ya usa RESTORA en su cocina.",
        who: "TESTIMONIO · PRÓXIMAMENTE",
      },
    ],
  },
  lead: {
    kicker: "Socios fundadores",
    title: "Entra en la lista de socios fundadores.",
    sub: "Plazas limitadas a los primeros restaurantes de Cataluña. Cada alta también es un dato de validación.",
    fName: "Nombre del restaurante",
    fNamePh: "p. ej. Casa Pujol",
    fRole: "Tu rol",
    fCity: "Ciudad",
    fCityPh: "Tarragona",
    fPos: "TPV actual",
    fPosPh: "p. ej. Ágora, Glop, ninguno…",
    roles: ["Jefe de cocina", "Gestor / responsable de costes", "Propietario"],
    submit: "Solicitar acceso",
    sending: "Enviando…",
    note: "Sin compromiso. Te escribimos en 48 h.",
    doneTitle: "Estás en la lista.",
    doneBody:
      "Gracias. Te contactamos muy pronto para tu acceso de socio fundador.",
    errName: "Escribe el nombre del restaurante.",
    errCity: "Escribe la ciudad.",
    errGeneric: "No hemos podido enviar tu solicitud. Inténtalo de nuevo.",
  },
  footer: {
    tagline:
      "La capa de inteligencia de negocio para restaurantes profesionalizados.",
    made: "Hecho en Cataluña",
    colProduct: "Producto",
    colLegal: "Legal",
    colLang: "Idioma",
    privacy: "Privacidad",
    rgpd: "Aviso RGPD",
    contact: "hola@restora.cat",
    rights: "Todos los derechos reservados.",
    langEs: "Castellano",
    langCa: "Català",
  },
};

export type Dictionary = typeof es;

const ca: Dictionary = {
  meta: {
    title: "RESTORA · El soci intel·ligent de la teva cuina",
    description:
      "Intel·ligència de negoci i food cost per a restaurants professionalitzats de Catalunya. Cada compra, plat i venda, convertits en decisions que apugen el teu marge.",
  },
  util: {
    thesis: "CADA VENDA GENERA INTEL·LIGÈNCIA DE NEGOCI",
    slots: "SOCI FUNDADOR · PLACES LIMITADES",
  },
  nav: {
    l1: "Com funciona",
    l2: "Per què RESTORA",
    l3: "Preus",
    cta: "Sigues soci fundador",
  },
  sec: {
    problem: "El problema",
    ladder: "Com funciona",
    why: "Per què",
    icp: "Per a qui",
    pricing: "Preus",
    proof: "Credibilitat",
  },
  brand: { kicker: "Identitat", title: "El plat intel·ligent" },
  hero: {
    eyebrow: "Intel·ligència de negoci · restaurants",
    title: "El soci intel·ligent de la teva cuina.",
    sub: "Cada compra, cada plat i cada venda, convertits en decisions que apugen el teu marge.",
    ctaPrimary: "Sigues soci fundador",
    ctaSecondary: "Veure com funciona",
    alertTitle: "L'oli ha pujat un 14%",
    alertBody:
      "Casa Pujol el té un 9% més barat aquesta setmana. Canvies de proveïdor?",
    chartLabel: "OLI D'OLIVA",
    stat1Label: "El teu preu",
    stat2Label: "Mitjana zona",
    liveAlert: "RESTORA · ALERTA EN VIU",
    today: "AVUI",
  },
  ticker: [
    { v: "31,4%", k: "Food cost mitjà" },
    { v: "68%", k: "Marge brut" },
    { v: "1,94 €/L", k: "PMP oli" },
    { v: "−6 pts", k: "Cost evitat" },
  ],
  problem: {
    title: "El teu marge s'escapa per llocs que no veus.",
    pains: [
      {
        title: "Marges cada cop més fins",
        desc: "Cada punt de food cost compta, i avui els defenses a cegues.",
      },
      {
        title: "Compres sense històric",
        desc: "Ningú recorda a quant estava l'oli fa tres mesos. RESTORA sí.",
      },
      {
        title: "Escandalls que caduquen",
        desc: "El dia que els calcules ja estan desfasats pels preus reals.",
      },
      {
        title: "Dades que no decideixen",
        desc: "Tens números per tot arreu, però cap et diu què fer.",
      },
    ],
  },
  ladder: {
    title: "Comença amb una foto.",
    sub: "L'escala de valor en tres nivells. Puges quan tu vulguis.",
    steps: [
      {
        name: "Compres",
        desc: "Foto de l'albarà i RESTORA llegeix cada línia: històric de preus, PMP i alertes quan un proveïdor apuja.",
        tag: "Valor la setmana 1",
      },
      {
        name: "Vendes",
        desc: "Food cost global del negoci i rànquing de plats pel que realment aporten al marge.",
        tag: "Food cost real",
      },
      {
        name: "Escandalls",
        desc: "Marge real plat a plat i enginyeria de menú per col·locar el que més rendeix.",
        tag: "Marge per plat",
      },
    ],
  },
  why: {
    title: "No és un altre TPV. És la capa d'intel·ligència.",
    items: [
      {
        title: "De descriptiu a prescriptiu",
        desc: "No només et mostra el número: et diu què fer-ne i què passa si no ho fas.",
      },
      {
        title: "Validació per confiança",
        desc: "RESTORA fa la feina pesada i et proposa. Tu confirmes amb un toc. Tu decideixes.",
      },
    ],
    benchKicker: "El diferenciador",
    benchTitle: "Com estàs davant els restaurants de la teva zona.",
    benchBody:
      "Benchmark sectorial anònim. El teu food cost comparat amb restaurants similars de la teva comarca. Ningú més ho ofereix.",
    benchMetric: "El teu food cost",
    benchZone: "Mitjana zona",
  },
  manifesto: {
    kicker: "Manifest",
    title:
      "No és un programari que guarda dades. És un soci que ajuda a decidir.",
    body: "El soci honest que et mostra de què està fet cada número, no s'inventa res, critica amb criteri i suggereix la següent acció. Però la decisió, sempre, és teva.",
  },
  icp: {
    title: "Per al restaurant que ja es pren seriosament els seus números.",
    list: [
      "Alta gastronomia sense estrella",
      "Gastrobars i cuina de producte",
      "Coctelaries amb carta de cost viu",
      "Mini-grups d'1 a 5 locals · Catalunya",
    ],
  },
  pricing: {
    title: "Preus clars. Sense lletra petita.",
    sub: "Comença per on t'aporti abans. Puja de pla quan el marge ho demani.",
    recommended: "Recomanat",
    cta: "Començar",
    implantation: "Implantació 0–500 € · gratis per a socis fundadors.",
    founderTitle: "Soci Fundador",
    founderProgram: "Programa",
    founderBody:
      "Per als primers 5-10 restaurants de Catalunya: preu i accés especial, i influència directa en el producte que estàs ajudant a construir.",
    plans: [
      {
        name: "Base",
        price: "89 €",
        period: "/mes",
        featured: false,
        tagline: "Comença per les compres. Valor des de la primera foto.",
        features: [
          "Nivell 1 · Compres",
          "Lectura d'albarans amb foto",
          "Històric de preus i PMP",
          "Alertes de pujada de proveïdor",
          "1 local",
        ],
      },
      {
        name: "Pro",
        price: "149 €",
        period: "/mes",
        featured: true,
        tagline: "El sistema complet: compres, vendes i marge per plat.",
        features: [
          "Tot el de Base",
          "Nivell 2 · Food cost global",
          "Nivell 3 · Escandalls vius",
          "Benchmark sectorial anònim",
          "Enginyeria de menú",
          "1 local",
        ],
      },
      {
        name: "Grup",
        price: "249 €",
        period: "/mes",
        featured: false,
        tagline: "Per a diversos locals amb vista consolidada de grup.",
        features: [
          "Tot el de Pro",
          "De 2 a 5 locals",
          "Vista consolidada de grup",
          "Comparativa entre locals",
          "Onboarding dedicat",
        ],
      },
    ],
  },
  proof: {
    title: "Construït amb cuines reals.",
    logos: [
      "Soci de disseny",
      "Michelin · properament",
      "Sols Repsol · prox.",
      "Grup pilot",
    ],
    testimonials: [
      {
        quote: "Espai reservat per al primer restaurant soci fundador.",
        who: "TESTIMONI · PROPERAMENT",
      },
      {
        quote: "Aquí hi anirà la veu de qui ja fa servir RESTORA a la seva cuina.",
        who: "TESTIMONI · PROPERAMENT",
      },
    ],
  },
  lead: {
    kicker: "Socis fundadors",
    title: "Entra a la llista de socis fundadors.",
    sub: "Places limitades als primers restaurants de Catalunya. Cada alta també és una dada de validació.",
    fName: "Nom del restaurant",
    fNamePh: "p. ex. Casa Pujol",
    fRole: "El teu rol",
    fCity: "Ciutat",
    fCityPh: "Tarragona",
    fPos: "TPV actual",
    fPosPh: "p. ex. Àgora, Glop, cap…",
    roles: ["Cap de cuina", "Gestor / responsable de costos", "Propietari"],
    submit: "Sol·licitar accés",
    sending: "Enviant…",
    note: "Sense compromís. T'escrivim en 48 h.",
    doneTitle: "Ja ets a la llista.",
    doneBody:
      "Gràcies. Et contactem molt aviat per al teu accés de soci fundador.",
    errName: "Escriu el nom del restaurant.",
    errCity: "Escriu la ciutat.",
    errGeneric: "No hem pogut enviar la teva sol·licitud. Torna-ho a provar.",
  },
  footer: {
    tagline:
      "La capa d'intel·ligència de negoci per a restaurants professionalitzats.",
    made: "Fet a Catalunya",
    colProduct: "Producte",
    colLegal: "Legal",
    colLang: "Idioma",
    privacy: "Privacitat",
    rgpd: "Avís RGPD",
    contact: "hola@restora.cat",
    rights: "Tots els drets reservats.",
    langEs: "Castellano",
    langCa: "Català",
  },
};

const dictionaries: Record<Locale, Dictionary> = { es, ca };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
