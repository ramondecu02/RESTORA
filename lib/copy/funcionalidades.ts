// Copy + demo datasets for the Funcionalidades page.
// The "demo" blocks are illustrative representations of the product UI, used to
// explain each module visually. They are not wired to the backend yet.

const es = {
  hero: {
    eyebrow: "Funcionalidades",
    title: "Así se ve tu restaurante por dentro.",
    sub: "Seis módulos, un mismo dato. Esto es lo que tendrías en pantalla cada mañana —con un ejemplo real de cada uno.",
    note: "Ejemplos ilustrativos del producto",
  },
  chrome: {
    escandallo: "Escandallo",
    comparativa: "Comparativa",
    inventario: "Inventario",
    rentabilidad: "Rentabilidad por plato",
    total: "Total",
    foodCost: "Food cost",
    margen: "Margen",
    ventas: "Ventas",
    mejor: "Mejor",
  },
  modules: [
    {
      key: "escandallos",
      eyebrow: "Escandallos",
      title: "El coste real de cada plato, recalculado solo.",
      body: "Defines la receta una vez. Cuando sube el precio de un ingrediente, RESTORA recalcula coste, food cost y margen —y marca el plato si se sale de tu objetivo.",
      points: [
        "Coste por ración, no por intuición",
        "Se actualiza con cada albarán nuevo",
        "Aviso cuando un plato necesita revisión",
      ],
      demo: {
        kind: "escandallo" as const,
        dish: "Lubina a la brasa",
        rows: [
          { name: "Lubina", qty: "180 g", cost: "4,20 €", delta: "+9 %", up: true },
          { name: "Patata", qty: "150 g", cost: "0,65 €" },
          { name: "Aceite", qty: "20 ml", cost: "0,18 €" },
          { name: "Salsa", qty: "80 g", cost: "0,72 €" },
        ],
        totals: [
          { label: "Coste del plato", value: "5,75 €" },
          { label: "PVP", value: "24,00 €" },
          { label: "Food cost", value: "24,0 %", good: true },
          { label: "Margen", value: "18,25 €", strong: true },
        ],
        alert: "La lubina ha subido un 9 % este mes. El food cost pasaría del 24,0 % al 25,6 %.",
        action: "Revisar escandallo",
      },
    },
    {
      key: "compras",
      eyebrow: "Compras",
      title: "Cada albarán, convertido en histórico.",
      body: "Registras la compra y RESTORA la ordena: qué compraste, a cuánto y cómo ha evolucionado ese precio desde la primera vez.",
      points: [
        "Histórico de precio por producto",
        "Variación frente a tu última compra",
        "Gasto por proveedor y por mes",
      ],
      demo: {
        kind: "compra" as const,
        supplier: "Distribuidora Mediterránea",
        date: "12 may · Albarán 4587",
        lines: [
          { name: "Lubina fresca", qty: "12 kg", price: "18,60 €/kg", delta: "+9 %", up: true },
          { name: "Patata agria", qty: "25 kg", price: "0,92 €/kg", delta: "−3 %" },
          { name: "Aceite AOVE", qty: "10 L", price: "8,40 €/L", delta: "+14 %", up: true },
        ],
        total: "1.240,00 €",
        trendLabel: "Precio de la lubina · 6 meses",
        trend: [15.6, 15.9, 16.4, 16.2, 17.1, 18.6],
        note: "Tres subidas seguidas en aceite. Afecta a 14 platos de tu carta.",
      },
    },
    {
      key: "proveedores",
      eyebrow: "Proveedores",
      title: "El mismo producto, dos precios distintos.",
      body: "Compara proveedores por producto, no de memoria. Precio, última compra y variación, uno al lado del otro.",
      points: [
        "Comparativa por producto",
        "Quién te sube el precio y cuándo",
        "Fichas con histórico completo",
      ],
      demo: {
        kind: "proveedores" as const,
        product: "Lubina fresca · kg",
        options: [
          { name: "Distribuidora Mediterránea", price: "18,60 €", last: "12 may", delta: "+9 %", up: true },
          { name: "Mariscos del Atlántico", price: "16,90 €", last: "8 may", delta: "−2 %", best: true },
        ],
        verdictLabel: "Diferencia",
        verdict: "1,70 €/kg",
        note: "Con tu consumo medio (48 kg/mes) son 81,60 € al mes.",
      },
    },
    {
      key: "inventario",
      eyebrow: "Inventario",
      title: "Lo que queda, lo que se va y lo que falta.",
      body: "Stock y consumo en la misma pantalla, para que veas la rotura antes de que ocurra —no cuando el cocinero te avisa.",
      points: [
        "Stock actual y consumo semanal",
        "Días de cobertura estimados",
        "Alerta antes de la rotura",
      ],
      demo: {
        kind: "inventario" as const,
        items: [
          { name: "Lubina fresca", stock: "6 kg", use: "12 kg/sem", days: "3,5 días", status: "bajo" as const },
          { name: "Aceite AOVE", stock: "24 L", use: "9 L/sem", days: "18 días", status: "ok" as const },
          { name: "Patata agria", stock: "40 kg", use: "22 kg/sem", days: "12 días", status: "ok" as const },
        ],
        alert: "Lubina por debajo del mínimo: cubre 3,5 días y el fin de semana pesa el 40 % de las ventas.",
        action: "Añadir al pedido",
      },
    },
    {
      key: "rentabilidad",
      eyebrow: "Rentabilidad",
      title: "Qué plato te sostiene y cuál te está costando dinero.",
      body: "Ordena la carta por margen real. Verás rápido cuál mantener, cuál rediseñar y cuál subir de precio.",
      points: [
        "Margen real por plato, no estimado",
        "Cruce de ventas y coste",
        "Señal clara de qué revisar",
      ],
      demo: {
        kind: "rentabilidad" as const,
        cards: [
          { dish: "Lubina a la brasa", foodCost: "24,0 %", margin: "18,25 €", sales: "96 uds/mes", verdict: "Rentable", good: true },
          { dish: "Risotto de setas", foodCost: "38,5 %", margin: "7,10 €", sales: "142 uds/mes", verdict: "Necesita revisión", good: false },
        ],
        note: "El risotto vende más, pero deja 11,15 € menos por plato. Ahí está tu margen.",
      },
    },
    {
      key: "inteligencia",
      eyebrow: "Inteligencia",
      title: "El aviso que te ahorra la sorpresa de fin de mes.",
      body: "RESTORA cruza compras, escandallos y consumo, y te dice lo que importa —con el número delante y la acción al lado.",
      points: [
        "Alertas de subida de precio",
        "Impacto calculado en tu carta",
        "Sugerencia de acción concreta",
      ],
      demo: {
        kind: "insight" as const,
        tag: "Insight · hoy",
        headline: "El aceite AOVE ha subido un 14 % en 6 semanas.",
        detail: "Afecta a 14 platos. Tu food cost medio pasa del 29,4 % al 30,8 % si no tocas nada.",
        stats: [
          { label: "Platos afectados", value: "14" },
          { label: "Impacto mensual", value: "−318 €" },
        ],
        actions: ["Comparar proveedores de aceite", "Revisar los 14 escandallos"],
      },
    },
  ],
  closing: {
    eyebrow: "Todo conectado",
    title: "Un dato entra una vez y llega a todas partes.",
    sub: "El precio de un albarán actualiza el escandallo, el escandallo cambia el margen y el margen dispara la alerta. Sin volver a teclear nada.",
    chain: ["Albarán", "Escandallo", "Margen", "Alerta"],
  },
};

export type FuncionalidadesCopy = typeof es;

const ca: FuncionalidadesCopy = {
  hero: {
    eyebrow: "Funcionalitats",
    title: "Així es veu el teu restaurant per dins.",
    sub: "Sis mòduls, una mateixa dada. Això és el que tindries a la pantalla cada matí —amb un exemple real de cadascun.",
    note: "Exemples il·lustratius del producte",
  },
  chrome: {
    escandallo: "Escandall",
    comparativa: "Comparativa",
    inventario: "Inventari",
    rentabilidad: "Rendibilitat per plat",
    total: "Total",
    foodCost: "Food cost",
    margen: "Marge",
    ventas: "Vendes",
    mejor: "Millor",
  },
  modules: [
    {
      key: "escandallos",
      eyebrow: "Escandalls",
      title: "El cost real de cada plat, recalculat sol.",
      body: "Defineixes la recepta una vegada. Quan puja el preu d'un ingredient, RESTORA recalcula cost, food cost i marge —i marca el plat si se surt del teu objectiu.",
      points: [
        "Cost per ració, no per intuïció",
        "S'actualitza amb cada albarà nou",
        "Avís quan un plat necessita revisió",
      ],
      demo: {
        kind: "escandallo" as const,
        dish: "Llobarro a la brasa",
        rows: [
          { name: "Llobarro", qty: "180 g", cost: "4,20 €", delta: "+9 %", up: true },
          { name: "Patata", qty: "150 g", cost: "0,65 €" },
          { name: "Oli", qty: "20 ml", cost: "0,18 €" },
          { name: "Salsa", qty: "80 g", cost: "0,72 €" },
        ],
        totals: [
          { label: "Cost del plat", value: "5,75 €" },
          { label: "PVP", value: "24,00 €" },
          { label: "Food cost", value: "24,0 %", good: true },
          { label: "Marge", value: "18,25 €", strong: true },
        ],
        alert: "El llobarro ha pujat un 9 % aquest mes. El food cost passaria del 24,0 % al 25,6 %.",
        action: "Revisar escandall",
      },
    },
    {
      key: "compras",
      eyebrow: "Compres",
      title: "Cada albarà, convertit en històric.",
      body: "Registres la compra i RESTORA l'ordena: què vas comprar, a quant i com ha evolucionat aquest preu des de la primera vegada.",
      points: [
        "Històric de preu per producte",
        "Variació respecte a la teva última compra",
        "Despesa per proveïdor i per mes",
      ],
      demo: {
        kind: "compra" as const,
        supplier: "Distribuïdora Mediterrània",
        date: "12 maig · Albarà 4587",
        lines: [
          { name: "Llobarro fresc", qty: "12 kg", price: "18,60 €/kg", delta: "+9 %", up: true },
          { name: "Patata agra", qty: "25 kg", price: "0,92 €/kg", delta: "−3 %" },
          { name: "Oli AOVE", qty: "10 L", price: "8,40 €/L", delta: "+14 %", up: true },
        ],
        total: "1.240,00 €",
        trendLabel: "Preu del llobarro · 6 mesos",
        trend: [15.6, 15.9, 16.4, 16.2, 17.1, 18.6],
        note: "Tres pujades seguides en oli. Afecta 14 plats de la teva carta.",
      },
    },
    {
      key: "proveedores",
      eyebrow: "Proveïdors",
      title: "El mateix producte, dos preus diferents.",
      body: "Compara proveïdors per producte, no de memòria. Preu, última compra i variació, l'un al costat de l'altre.",
      points: [
        "Comparativa per producte",
        "Qui et puja el preu i quan",
        "Fitxes amb històric complet",
      ],
      demo: {
        kind: "proveedores" as const,
        product: "Llobarro fresc · kg",
        options: [
          { name: "Distribuïdora Mediterrània", price: "18,60 €", last: "12 maig", delta: "+9 %", up: true },
          { name: "Mariscos de l'Atlàntic", price: "16,90 €", last: "8 maig", delta: "−2 %", best: true },
        ],
        verdictLabel: "Diferència",
        verdict: "1,70 €/kg",
        note: "Amb el teu consum mitjà (48 kg/mes) són 81,60 € al mes.",
      },
    },
    {
      key: "inventario",
      eyebrow: "Inventari",
      title: "El que queda, el que marxa i el que falta.",
      body: "Estoc i consum a la mateixa pantalla, perquè vegis la ruptura abans que passi —no quan t'avisa el cuiner.",
      points: [
        "Estoc actual i consum setmanal",
        "Dies de cobertura estimats",
        "Alerta abans de la ruptura",
      ],
      demo: {
        kind: "inventario" as const,
        items: [
          { name: "Llobarro fresc", stock: "6 kg", use: "12 kg/set", days: "3,5 dies", status: "bajo" as const },
          { name: "Oli AOVE", stock: "24 L", use: "9 L/set", days: "18 dies", status: "ok" as const },
          { name: "Patata agra", stock: "40 kg", use: "22 kg/set", days: "12 dies", status: "ok" as const },
        ],
        alert: "Llobarro per sota del mínim: cobreix 3,5 dies i el cap de setmana pesa el 40 % de les vendes.",
        action: "Afegir a la comanda",
      },
    },
    {
      key: "rentabilidad",
      eyebrow: "Rendibilitat",
      title: "Quin plat et sosté i quin et costa diners.",
      body: "Ordena la carta per marge real. Veuràs ràpid quin mantenir, quin redissenyar i quin apujar de preu.",
      points: [
        "Marge real per plat, no estimat",
        "Encreuament de vendes i cost",
        "Senyal clar de què revisar",
      ],
      demo: {
        kind: "rentabilidad" as const,
        cards: [
          { dish: "Llobarro a la brasa", foodCost: "24,0 %", margin: "18,25 €", sales: "96 u/mes", verdict: "Rendible", good: true },
          { dish: "Risotto de bolets", foodCost: "38,5 %", margin: "7,10 €", sales: "142 u/mes", verdict: "Necessita revisió", good: false },
        ],
        note: "El risotto ven més, però deixa 11,15 € menys per plat. Aquí tens el teu marge.",
      },
    },
    {
      key: "inteligencia",
      eyebrow: "Intel·ligència",
      title: "L'avís que t'estalvia la sorpresa de final de mes.",
      body: "RESTORA creua compres, escandalls i consum, i et diu el que importa —amb el número al davant i l'acció al costat.",
      points: [
        "Alertes de pujada de preu",
        "Impacte calculat a la teva carta",
        "Suggeriment d'acció concreta",
      ],
      demo: {
        kind: "insight" as const,
        tag: "Insight · avui",
        headline: "L'oli AOVE ha pujat un 14 % en 6 setmanes.",
        detail: "Afecta 14 plats. El teu food cost mitjà passa del 29,4 % al 30,8 % si no toques res.",
        stats: [
          { label: "Plats afectats", value: "14" },
          { label: "Impacte mensual", value: "−318 €" },
        ],
        actions: ["Comparar proveïdors d'oli", "Revisar els 14 escandalls"],
      },
    },
  ],
  closing: {
    eyebrow: "Tot connectat",
    title: "Una dada entra un cop i arriba a tot arreu.",
    sub: "El preu d'un albarà actualitza l'escandall, l'escandall canvia el marge i el marge dispara l'alerta. Sense tornar a teclejar res.",
    chain: ["Albarà", "Escandall", "Marge", "Alerta"],
  },
};

export const funcionalidadesCopy = { es, ca };
