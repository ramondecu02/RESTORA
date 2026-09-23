// Datos de ejemplo: el restaurante del prototipo (Casa Pujol, Tarragona). Todo se marca como demo y se puede quitar.
import type { BaseUnit, LineUnit } from "@/lib/units";

export const PROVS = [
  { key: "mediterranea", name: "Distribuidora Mediterránea", empresa: "Distribucions Mediterrànea SL", tipo: "Distribución general", responsable: "Jordi Ferrer", phone: "977 21 45 80", email: "pedidos@medistribucions.cat", direccion: "Pol. Ind. Riu Clar, C/ del Molí 12 · 43006 Tarragona", notas: "Pedidos hasta las 18:00", entrega: "Mar · Jue · Sáb", cif: "B43000001" },
  { key: "atlantico", name: "Mariscos del Atlántico", empresa: "Mariscos del Atlántico SA", tipo: "Pescados", responsable: "Ana Refoyo", phone: "986 33 12 07", email: "comercial@mariscosatlantico.es", direccion: "Lonja de Vigo, Puesto 24 · 36202 Vigo", notas: "Pedido mínimo 150 €", entrega: "Mar · Vie", cif: "A36000002" },
  { key: "hortalisses", name: "Hortalisses Camp de Tarragona", empresa: "Hortalisses SCCL", tipo: "Fruta y verdura", responsable: "Marta Solé", phone: "977 60 88 14", email: "comandes@hortalisses.cat", direccion: "Camí de l'Horta 3 · 43800 Valls", notas: "Producto de proximidad", entrega: "Lun a Sáb", cif: "F43000003" },
  { key: "siurana", name: "Oli de Siurana", empresa: "Coop. Oli de Siurana SCCL", tipo: "Distribución general", responsable: "Pere Roig", phone: "977 82 03 55", email: "info@olidesiurana.cat", direccion: "Ctra. de Reus 8 · 43360 Cornudella de Montsant", notas: "DOP Siurana", entrega: "Quincenal", cif: "F43000004" },
  { key: "pallars", name: "Formatges Pallars", empresa: "Formatges del Pallars SL", tipo: "Lácteos y quesos", responsable: "Núria Bonet", phone: "973 62 04 19", email: "vendes@formatgespallars.cat", direccion: "Av. dels Pirineus 27 · 25500 La Pobla de Segur", notas: "Reparto refrigerado", entrega: "Mié · Sáb", cif: "B25000005" },
  { key: "bodega", name: "Bodega i Begudes Camp", empresa: "Begudes Camp de Tarragona SL", tipo: "Bebidas", responsable: "Xavier Munné", phone: "977 44 90 62", email: "comercial@begudescamp.cat", direccion: "C/ del Comerç 45 · 43204 Reus", notas: "Vinos, cervezas y refrescos", entrega: "Mar · Vie", cif: "B43000006" },
] as const;

type A = { key: string; name: string; unit: BaseUnit; rend: number; cat: string; catalog: string | null; prov: string; hist: number[]; aliases?: string[]; compra?: [string, number] };
/** hist: precio por unidad base de los últimos 6 meses (el último es el actual). compra: unidad de compra y unidades base que trae. */
export const ARTS: A[] = [
  { key: "lubina", name: "Lubina fresca", unit: "kg", rend: 80, cat: "pescado", catalog: "lubina", prov: "mediterranea", hist: [17.05, 17.2, 17.1, 17.6, 17.11, 18.65] },
  { key: "patata", name: "Patata agria pelada", unit: "kg", rend: 75, cat: "verdura", catalog: "patata-agria", prov: "hortalisses", hist: [3.35, 3.32, 3.3, 3.28, 3.3, 3.25] },
  { key: "aove", name: "Aceite de oliva virgen extra", unit: "L", rend: 100, cat: "aceite_oliva", catalog: "aceite-oliva-ve", prov: "siurana", hist: [7.9, 8.05, 8.3, 8.55, 7.9, 9.0], aliases: ["aove"], compra: ["garrafa 5 L", 5] },
  { key: "arroz_car", name: "Arroz carnaroli", unit: "kg", rend: 100, cat: "legumbre_cereal", catalog: null, prov: "mediterranea", hist: [4.7, 4.7, 4.75, 4.75, 4.8, 4.8] },
  { key: "arroz_bom", name: "Arroz bomba", unit: "kg", rend: 100, cat: "legumbre_cereal", catalog: "arroz-bomba", prov: "mediterranea", hist: [5.05, 5.1, 5.1, 5.15, 5.15, 5.2] },
  { key: "setas", name: "Setas variadas", unit: "kg", rend: 85, cat: "verdura", catalog: "setas-variadas", prov: "hortalisses", hist: [15.8, 16.4, 16.9, 17.6, 17.6, 18.5] },
  { key: "parmesano", name: "Parmesano 24 meses", unit: "kg", rend: 100, cat: "leche_queso", catalog: "parmesano", prov: "pallars", hist: [20.4, 20.4, 20.9, 21.1, 21.5, 21.5] },
  { key: "mantequilla", name: "Mantequilla", unit: "kg", rend: 100, cat: "lacteo", catalog: "mantequilla", prov: "pallars", hist: [9.1, 9.2, 9.35, 9.45, 9.45, 9.6] },
  { key: "chalota", name: "Chalota", unit: "kg", rend: 88, cat: "verdura", catalog: null, prov: "hortalisses", hist: [2.2, 2.15, 2.15, 2.1, 2.1, 2.1] },
  { key: "atun", name: "Atún rojo", unit: "kg", rend: 88, cat: "pescado", catalog: "atun-rojo", prov: "atlantico", hist: [35.5, 36.2, 36.8, 37.4, 37.4, 38.0] },
  { key: "aguacate", name: "Aguacate", unit: "kg", rend: 70, cat: "fruta", catalog: "aguacate", prov: "hortalisses", hist: [5.1, 4.95, 4.8, 4.7, 4.7, 4.6] },
  { key: "carabinero", name: "Carabinero", unit: "kg", rend: 100, cat: "pescado", catalog: null, prov: "atlantico", hist: [58.0, 59.5, 60.0, 61.0, 61.0, 62.0] },
  { key: "ternera", name: "Cuello de ternera", unit: "kg", rend: 82, cat: "carne", catalog: "ternera-guisar", prov: "mediterranea", hist: [11.1, 11.2, 11.4, 11.6, 11.7, 11.8] },
  { key: "papada", name: "Papada de cerdo", unit: "kg", rend: 85, cat: "carne", catalog: null, prov: "mediterranea", hist: [7.1, 7.15, 7.2, 7.3, 7.35, 7.4] },
  { key: "canelon", name: "Placa de canelón", unit: "kg", rend: 100, cat: "pasta", catalog: null, prov: "mediterranea", hist: [6.0, 6.05, 6.1, 6.1, 6.15, 6.2] },
  { key: "leche", name: "Leche entera", unit: "L", rend: 100, cat: "leche_queso", catalog: "leche-entera", prov: "pallars", hist: [0.92, 0.94, 0.95, 0.96, 0.97, 0.98] },
  { key: "huevo", name: "Huevo campero", unit: "ud", rend: 100, cat: "huevos", catalog: "huevo-campero-l", prov: "hortalisses", hist: [0.28, 0.29, 0.3, 0.31, 0.31, 0.32], compra: ["estuche 30 ud", 30] },
  { key: "azucar", name: "Azúcar", unit: "kg", rend: 100, cat: "reposteria", catalog: "azucar", prov: "mediterranea", hist: [1.2, 1.18, 1.18, 1.16, 1.15, 1.15] },
  { key: "citricos", name: "Limón y canela", unit: "kg", rend: 100, cat: "condimento", catalog: null, prov: "hortalisses", hist: [8.2, 8.3, 8.4, 8.4, 8.5, 8.5] },
  { key: "mezclum", name: "Mezclum de hoja", unit: "kg", rend: 92, cat: "verdura", catalog: "lechuga-variada", prov: "hortalisses", hist: [11.9, 12.0, 12.2, 12.3, 12.4, 12.5] },
  { key: "tomate", name: "Tomate de rama", unit: "kg", rend: 95, cat: "verdura", catalog: "tomate-rama", prov: "hortalisses", hist: [3.1, 3.0, 2.95, 2.9, 2.85, 2.8] },
  { key: "burrata", name: "Burrata", unit: "kg", rend: 100, cat: "leche_queso", catalog: "burrata", prov: "pallars", hist: [14.2, 14.3, 14.5, 14.7, 14.8, 14.9] },
  { key: "frutos", name: "Frutos secos", unit: "kg", rend: 100, cat: "reposteria", catalog: null, prov: "mediterranea", hist: [17.6, 17.8, 18.0, 18.2, 18.3, 18.4] },
  { key: "cebolla", name: "Cebolla", unit: "kg", rend: 90, cat: "verdura", catalog: "cebolla", prov: "hortalisses", hist: [1.1, 1.12, 1.15, 1.18, 1.2, 1.2] },
  { key: "zanahoria", name: "Zanahoria", unit: "kg", rend: 90, cat: "verdura", catalog: "zanahoria", prov: "hortalisses", hist: [1.0, 1.02, 1.05, 1.05, 1.08, 1.1] },
  { key: "puerro", name: "Puerro", unit: "kg", rend: 70, cat: "verdura", catalog: "puerro", prov: "hortalisses", hist: [2.2, 2.25, 2.3, 2.35, 2.4, 2.4] },
  { key: "harina", name: "Harina de trigo", unit: "kg", rend: 100, cat: "pan_harina", catalog: "harina-trigo", prov: "mediterranea", hist: [0.82, 0.82, 0.84, 0.84, 0.85, 0.85] },
  { key: "morralla", name: "Morralla y cabezas de marisco", unit: "kg", rend: 100, cat: "pescado", catalog: null, prov: "atlantico", hist: [4.2, 4.3, 4.3, 4.4, 4.5, 4.5] },
  { key: "vino_cocina", name: "Vino blanco para cocinar", unit: "L", rend: 100, cat: "vino", catalog: "vino-cocina", prov: "bodega", hist: [2.1, 2.1, 2.15, 2.15, 2.2, 2.2] },
  { key: "vinagre", name: "Vinagre de Jerez", unit: "L", rend: 100, cat: "condimento", catalog: "vinagre-jerez", prov: "mediterranea", hist: [3.2, 3.25, 3.3, 3.35, 3.4, 3.4] },
  { key: "mostaza", name: "Mostaza", unit: "kg", rend: 100, cat: "condimento", catalog: "mostaza", prov: "mediterranea", hist: [4.0, 4.0, 4.1, 4.1, 4.2, 4.2] },
  { key: "vino_priorat", name: "Vino Priorat DOQ (botella)", unit: "ud", rend: 100, cat: "vino", catalog: null, prov: "bodega", hist: [9.2, 9.3, 9.5, 9.6, 9.7, 9.8] },
  { key: "cerveza_barril", name: "Cerveza barril 30 L", unit: "ud", rend: 100, cat: "cerveza", catalog: null, prov: "bodega", hist: [74, 75, 76, 77, 78, 78] },
  { key: "refresco_caja", name: "Refrescos (caja 24)", unit: "ud", rend: 100, cat: "bebida", catalog: null, prov: "bodega", hist: [12.4, 12.6, 12.8, 13.0, 13.1, 13.2] },
  { key: "vino_blanco", name: "Vino blanco DO Penedès (botella)", unit: "ud", rend: 100, cat: "vino", catalog: null, prov: "bodega", hist: [6.0, 6.1, 6.2, 6.3, 6.35, 6.4] },
  { key: "cava", name: "Cava Brut Nature (botella)", unit: "ud", rend: 100, cat: "vino", catalog: null, prov: "bodega", hist: [8.4, 8.5, 8.6, 8.7, 8.8, 8.9] },
  { key: "agua_mineral", name: "Agua mineral (caja 12 × 1 L)", unit: "ud", rend: 100, cat: "bebida", catalog: null, prov: "bodega", hist: [5.0, 5.1, 5.2, 5.3, 5.35, 5.4] },
  { key: "lavavajillas", name: "Lavavajillas industrial 5 L", unit: "ud", rend: 100, cat: "limpieza", catalog: null, prov: "bodega", hist: [12.0, 12.2, 12.4, 12.6, 12.7, 12.8] },
  { key: "papel_cocina", name: "Papel de cocina (pack 6)", unit: "ud", rend: 100, cat: "limpieza", catalog: null, prov: "bodega", hist: [8.6, 8.8, 9.0, 9.1, 9.15, 9.2] },
];

/** Cantidad comprada al mes por artículo (unidad base), para generar los albaranes. */
export const COMPRA_MES: Record<string, number> = {
  lubina: 22, patata: 50, aove: 20, arroz_car: 16, arroz_bom: 10, setas: 22, parmesano: 6, mantequilla: 6, chalota: 8, atun: 7, aguacate: 12, carabinero: 6,
  ternera: 12, papada: 8, canelon: 5, leche: 30, huevo: 270, azucar: 7, citricos: 1, mezclum: 5, tomate: 12, burrata: 4, frutos: 1, cebolla: 6, zanahoria: 5,
  puerro: 5, harina: 3, morralla: 8, vino_cocina: 4, vinagre: 2, mostaza: 1, vino_priorat: 36, cerveza_barril: 8, refresco_caja: 6, vino_blanco: 30, cava: 18,
  agua_mineral: 20, lavavajillas: 3, papel_cocina: 6,
};

export const INVENTARIO: Record<string, [number, number, number]> = { // stock, consumo semanal, mínimo
  ternera: [9, 4.2, 4], papada: [5, 2.4, 2], lubina: [6, 12, 8], carabinero: [1.8, 2.6, 2], atun: [2.4, 3.5, 2], patata: [40, 22, 15], setas: [3, 7, 4], tomate: [14, 9, 6],
  parmesano: [4.5, 2.2, 2], burrata: [2.1, 2.4, 2], leche: [36, 20, 18], aove: [24, 9, 10], arroz_car: [14, 5, 6], agua_mineral: [18, 22, 15], vino_blanco: [14, 9, 8],
  vino_priorat: [20, 11, 10], cava: [9, 6, 6], cerveza_barril: [2, 2.5, 2], refresco_caja: [7, 9, 6], lavavajillas: [6, 2, 3], papel_cocina: [8, 4, 4],
};

type L = [string, number, LineUnit];
export const ELABS: { key: string; name: string; familia: string; rinde: number; unit: BaseUnit; lineas: L[] }[] = [
  { key: "salsa", name: "Salsa de la casa", familia: "Salsas", rinde: 1.8, unit: "kg", lineas: [["mantequilla", 500, "g"], ["aove", 400, "ml"], ["chalota", 300, "g"], ["vino_cocina", 500, "ml"], ["citricos", 60, "g"], ["parmesano", 250, "g"]] },
  { key: "caldo_verd", name: "Caldo de verduras", familia: "Fondos", rinde: 5, unit: "L", lineas: [["cebolla", 1, "kg"], ["zanahoria", 1, "kg"], ["puerro", 1, "kg"], ["tomate", 500, "g"], ["aove", 100, "ml"], ["setas", 200, "g"]] },
  { key: "caldo_mar", name: "Caldo de marisco", familia: "Fondos", rinde: 5, unit: "L", lineas: [["morralla", 2.5, "kg"], ["cebolla", 500, "g"], ["tomate", 500, "g"], ["aove", 100, "ml"], ["vino_cocina", 250, "ml"]] },
  { key: "bechamel", name: "Bechamel", familia: "Salsas", rinde: 1.1, unit: "kg", lineas: [["leche", 1, "L"], ["mantequilla", 80, "g"], ["harina", 80, "g"]] },
  { key: "vinagreta", name: "Vinagreta de la casa", familia: "Salsas", rinde: 1, unit: "L", lineas: [["aove", 700, "ml"], ["vinagre", 250, "ml"], ["mostaza", 30, "g"]] },
];

export const PLATOS: { key: string; name: string; familia: string; pvp: number; ventas: number; foto: string | null; lineas: L[]; desc?: string }[] = [
  { key: "lubina", name: "Lubina a la brasa", familia: "Pescados", pvp: 24, ventas: 148, foto: "lubina", lineas: [["lubina", 180, "g"], ["patata", 150, "g"], ["aove", 20, "ml"], ["@salsa", 80, "g"]], desc: "Con patata confitada y salsa de la casa" },
  { key: "risotto", name: "Risotto de setas", familia: "Arroces", pvp: 11.55, ventas: 142, foto: "risotto", lineas: [["arroz_car", 100, "g"], ["setas", 120, "g"], ["@caldo_verd", 180, "ml"], ["parmesano", 20, "g"], ["mantequilla", 25, "g"], ["aove", 10, "ml"], ["chalota", 30, "g"]] },
  { key: "canelon", name: "Canelón de rustido", familia: "Carnes", pvp: 14.5, ventas: 118, foto: "canelon", lineas: [["ternera", 90, "g"], ["papada", 60, "g"], ["canelon", 45, "g"], ["@bechamel", 70, "g"], ["parmesano", 12, "g"], ["chalota", 25, "g"]] },
  { key: "tartar", name: "Tartar de atún rojo", familia: "Entrantes", pvp: 19, ventas: 64, foto: "tartar", lineas: [["atun", 110, "g"], ["aguacate", 60, "g"], ["@salsa", 25, "g"], ["aove", 12, "ml"], ["chalota", 15, "g"]] },
  { key: "arroz", name: "Arroz de carabineros", familia: "Arroces", pvp: 26.5, ventas: 41, foto: "arroz", lineas: [["carabinero", 140, "g"], ["arroz_bom", 90, "g"], ["@caldo_mar", 220, "ml"], ["aove", 15, "ml"], ["chalota", 20, "g"]], desc: "Mínimo dos personas, precio por ración" },
  { key: "ensalada", name: "Ensalada de temporada", familia: "Entrantes", pvp: 9.5, ventas: 52, foto: "ensalada", lineas: [["mezclum", 80, "g"], ["burrata", 70, "g"], ["aguacate", 50, "g"], ["tomate", 80, "g"], ["frutos", 15, "g"], ["@vinagreta", 20, "ml"], ["aove", 15, "ml"]], desc: "Burrata, aguacate y tomate de rama" },
  { key: "crema", name: "Crema catalana", familia: "Postres", pvp: 6.5, ventas: 176, foto: null, lineas: [["leche", 150, "ml"], ["huevo", 1.5, "ud"], ["azucar", 35, "g"], ["citricos", 5, "g"]] },
];
export const REVENTA = [
  { key: "vino_copa", name: "Priorat DOQ (copa)", familia: "Vinos", coste: 2.1, margen: 68, pvp: 6.5, ventas: 96 },
  { key: "cana", name: "Cerveza de barril (caña)", familia: "Cervezas", coste: 0.42, margen: 87, pvp: 3.2, ventas: 240 },
  { key: "refresco", name: "Refresco (botellín)", familia: "Refrescos", coste: 0.55, margen: 80, pvp: 2.8, ventas: 150 },
];
export const MENU = { name: "Menú del día", familia: "Menús", pvp: 18, ventas: 60, lineas: ["ensalada", "canelon", "crema"] };

export const ALTERNATIVAS: [string, string, number, string][] = [
  ["lubina", "atlantico", 16.95, "Pieza de 400–600 g"], ["atun", "mediterranea", 39.8, "Lomo congelado a bordo"],
  ["setas", "mediterranea", 19.4, "Mezcla estándar"], ["parmesano", "mediterranea", 22.8, "18 meses"],
];
/** Comensales al día con los que están calibradas las ventas de ejemplo (ticket medio ≈ 25 € sin IVA). */
export const COMENSALES_BASE = 17;
/** Comensales de los 5 meses anteriores, relativos al mes actual. */
export const COMENSALES_REL = [0.92, 0.94, 0.96, 0.97, 0.98];
