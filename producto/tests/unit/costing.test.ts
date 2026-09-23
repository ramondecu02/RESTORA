import { describe, expect, it } from "vitest";
import { costeBase, costeNeto, estadoFC, explode, foodCost, pvpParaFc, recetaCost, revMargen, revPvp, type ArtCost, type CostContext, type RecetaNode } from "@/lib/costing";
import { cuadrantes, resumenCarta, salud, type DishStat } from "@/lib/menu";

// Datos del prototipo anterior (precio de compra y merma) para comprobar el motor de costes.
const P: Record<string, [string, "kg" | "L" | "ud", number, number]> = {
  lubina: ["Lubina fresca", "kg", 18.65, 20], patata: ["Patata agria pelada", "kg", 3.25, 25], aove: ["Aceite AOVE", "L", 9.0, 0],
  salsa: ["Salsa de la casa", "kg", 9.0, 0], arroz_car: ["Arroz carnaroli", "kg", 4.8, 0], arroz_bom: ["Arroz bomba", "kg", 5.2, 0],
  setas: ["Setas variadas", "kg", 18.5, 15], caldo_verd: ["Caldo de verduras", "L", 2.9, 0], caldo_mar: ["Caldo de marisco", "L", 4.1, 0],
  parmesano: ["Parmesano", "kg", 21.5, 0], mantequilla: ["Mantequilla", "kg", 9.6, 0], chalota: ["Chalota", "kg", 2.1, 12],
  atun: ["Atún rojo", "kg", 38.0, 12], aguacate: ["Aguacate", "kg", 4.6, 30], carabinero: ["Carabinero", "kg", 62.0, 0],
  ternera: ["Cuello de ternera", "kg", 11.8, 18], papada: ["Papada", "kg", 7.4, 15], canelon: ["Placa de canelón", "kg", 6.2, 0],
  bechamel: ["Bechamel", "kg", 3.4, 0], leche: ["Leche entera", "L", 0.98, 0], huevo: ["Huevo campero", "ud", 0.32, 0],
  azucar: ["Azúcar", "kg", 1.15, 0], citricos: ["Limón y canela", "kg", 8.5, 0], mezclum: ["Mezclum", "kg", 12.5, 8],
  tomate: ["Tomate de rama", "kg", 2.8, 5], burrata: ["Burrata", "kg", 14.9, 0], frutos: ["Frutos secos", "kg", 18.4, 0], vinagreta: ["Vinagreta", "L", 6.2, 0],
};
const art = (id: string): ArtCost => ({ id, name: P[id][0], unit: P[id][1], rend: 100 - P[id][3], pmp: P[id][2], lastPrice: P[id][2], lastPurchaseAt: null, precioManual: null, precioManualAt: null });
type L = [string, number, "g" | "ml" | "ud"];
const PLATOS: [string, number, number, L[]][] = [
  ["lubina", 24.0, 148, [["lubina", 180, "g"], ["patata", 150, "g"], ["aove", 20, "ml"], ["salsa", 80, "g"]]],
  ["risotto", 11.55, 142, [["arroz_car", 100, "g"], ["setas", 120, "g"], ["caldo_verd", 180, "ml"], ["parmesano", 20, "g"], ["mantequilla", 25, "g"], ["aove", 10, "ml"], ["chalota", 30, "g"]]],
  ["canelon", 14.5, 118, [["ternera", 90, "g"], ["papada", 60, "g"], ["canelon", 45, "g"], ["bechamel", 70, "g"], ["parmesano", 12, "g"], ["chalota", 25, "g"]]],
  ["tartar", 19.0, 64, [["atun", 110, "g"], ["aguacate", 60, "g"], ["salsa", 25, "g"], ["aove", 12, "ml"], ["chalota", 15, "g"]]],
  ["arroz", 26.5, 41, [["carabinero", 140, "g"], ["arroz_bom", 90, "g"], ["caldo_mar", 220, "ml"], ["aove", 15, "ml"], ["chalota", 20, "g"]]],
  ["ensalada", 9.5, 52, [["mezclum", 80, "g"], ["burrata", 70, "g"], ["aguacate", 50, "g"], ["tomate", 80, "g"], ["frutos", 15, "g"], ["vinagreta", 20, "ml"], ["aove", 15, "ml"]]],
  ["crema", 6.5, 176, [["leche", 150, "ml"], ["huevo", 1.5, "ud"], ["azucar", 35, "g"], ["citricos", 5, "g"]]],
];
const F = { g: 0.001, ml: 0.001, ud: 1 };
function ctx(): CostContext {
  const arts = new Map(Object.keys(P).map((k) => [k, art(k)]));
  const recetas = new Map<string, RecetaNode>();
  for (const [id, , , lines] of PLATOS) recetas.set(id, { id, tipo: "plato", name: id, raciones: 1, rinde: 1, rindeUnit: "ud", reventa: false, costeManual: null, lineas: lines.map(([a, q, u]) => ({ articuloId: a, cantidad: q * F[u], unidad: u })) });
  recetas.set("vino_copa", { id: "vino_copa", tipo: "plato", name: "Priorat copa", raciones: 1, rinde: 1, rindeUnit: "ud", reventa: true, costeManual: 2.1, lineas: [] });
  return { arts, recetas };
}

describe("motor de costes (valores de referencia del prototipo)", () => {
  const c = ctx();
  const esperado: Record<string, number> = { lubina: 5.75, risotto: 4.45, canelon: 2.65, tartar: 5.51, arroz: 10.23, ensalada: 3.23, crema: 0.71 };
  for (const [id, v] of Object.entries(esperado)) {
    it(`coste de ${id} = ${v} €`, () => expect(recetaCost(id, c).perUnit).toBeCloseTo(v, 2));
  }
  it("reventa sin líneas usa el coste manual", () => expect(recetaCost("vino_copa", c).perUnit).toBe(2.1));
  it("neto por merma: lubina 18,65 €/kg con 20 % de merma = 23,31 €/kg aprovechable", () => expect(costeNeto(art("lubina"))).toBeCloseTo(23.3125, 4));
  it("detecta ciclos entre recetas", () => {
    const cc = ctx();
    cc.recetas.set("a", { id: "a", tipo: "elaboracion", name: "A", raciones: 1, rinde: 1, rindeUnit: "kg", reventa: false, costeManual: null, lineas: [{ subrecetaId: "b", cantidad: 1, unidad: "kg" }] });
    cc.recetas.set("b", { id: "b", tipo: "elaboracion", name: "B", raciones: 1, rinde: 1, rindeUnit: "kg", reventa: false, costeManual: null, lineas: [{ subrecetaId: "a", cantidad: 1, unidad: "kg" }] });
    expect(recetaCost("a", cc).cycle).toBe(true);
  });
  it("subrecetas: una elaboración de 2 kg reparte su coste por kg", () => {
    const cc = ctx();
    cc.recetas.set("fondo", { id: "fondo", tipo: "elaboracion", name: "Fondo", raciones: 1, rinde: 2, rindeUnit: "kg", reventa: false, costeManual: null, lineas: [{ articuloId: "mantequilla", cantidad: 1, unidad: "kg" }] });
    cc.recetas.set("p", { id: "p", tipo: "plato", name: "P", raciones: 4, rinde: 1, rindeUnit: "ud", reventa: false, costeManual: null, lineas: [{ subrecetaId: "fondo", cantidad: 0.5, unidad: "kg" }] });
    expect(recetaCost("fondo", cc).perUnit).toBeCloseTo(4.8, 6);
    expect(recetaCost("p", cc).perUnit).toBeCloseTo(0.6, 6);
    expect(explode("p", cc).get("mantequilla")).toBeCloseTo(0.0625, 6);
  });
  it("simulación de precio con overrides", () => {
    const cc = ctx();
    cc.overrides = new Map([["lubina", 18.65 * 1.1]]);
    expect(recetaCost("lubina", cc).perUnit).toBeGreaterThan(5.75 + 0.4);
  });
});

describe("precio de venta y food cost (sobre venta neta)", () => {
  it("food cost sobre PVP sin IVA", () => expect(foodCost(5.75, 24, 10)).toBeCloseTo(5.75 / (24 / 1.1), 6));
  it("PVP para un objetivo", () => {
    const p = pvpParaFc(3, 30, 10);
    expect(p.net).toBeCloseTo(10, 6);
    expect(p.gross).toBeCloseTo(11, 6);
  });
  it("reventa: margen sobre precio de venta (no recargo)", () => {
    expect(revPvp(2.1, 68, 0)).toBeCloseTo(6.5625, 4);
    expect(revMargen(2.1, 6.5, 0)).toBeCloseTo(67.69, 2);
    expect(revPvp(2.1, 68, 10)).toBeCloseTo(6.5625 * 1.1, 4);
  });
  it("estado del food cost", () => {
    expect(estadoFC(0.3, 30).estado).toBe("ok");
    expect(estadoFC(0.325, 30).estado).toBe("warn");
    expect(estadoFC(0.34, 30).estado).toBe("crit");
    expect(estadoFC(null, 30).estado).toBe("none");
  });
  it("precio manual manda hasta que llega una compra posterior", () => {
    const a = { ...art("lubina"), precioManual: 20, precioManualAt: "2026-05-10T10:00:00Z", lastPurchaseAt: "2026-05-01T10:00:00Z" };
    expect(costeBase(a)).toBe(20);
    expect(costeBase({ ...a, lastPurchaseAt: "2026-05-12T10:00:00Z" })).toBe(18.65);
  });
});

describe("carta: resumen, cuadrantes y salud", () => {
  const c = ctx();
  const ds: DishStat[] = PLATOS.map(([id, pvp, ventas]) => ({ id, name: id, familia: "x", reventa: false, pvp, iva: 0, coste: recetaCost(id, c).perUnit, ventas, fcObjetivo: 30 }));
  ds.push({ id: "vino_copa", name: "vino", familia: "Vinos", reventa: true, pvp: 6.5, iva: 0, coste: 2.1, ventas: 96, fcObjetivo: 30 });
  ds.push({ id: "cana", name: "caña", familia: "Cervezas", reventa: true, pvp: 3.2, iva: 0, coste: 0.42, ventas: 240, fcObjetivo: 30 });
  ds.push({ id: "refresco", name: "refresco", familia: "Refrescos", reventa: true, pvp: 2.8, iva: 0, coste: 0.55, ventas: 150, fcObjetivo: 30 });
  it("resumen igual al del prototipo (sin IVA)", () => {
    const r = resumenCarta(ds);
    expect(r.ingresos).toBeCloseTo(12655.6, 1);
    expect(r.coste).toBeCloseTo(3244.76, 0);
    expect((r.fc ?? 0) * 100).toBeCloseTo(25.64, 1);
    expect(r.unidades).toBe(1227);
  });
  it("cuadrantes del prototipo", () => {
    const q = cuadrantes(ds);
    const by = Object.fromEntries(q.items.map((i) => [i.id, i.quad]));
    expect(by.lubina).toBe("estrella");
    expect(by.risotto).toBe("caballo");
    expect(by.canelon).toBe("enigma");
    expect(by.ensalada).toBe("perro");
    expect(by.vino_copa).toBe("perro");
  });
  it("salud del local", () => {
    expect(salud(0.2564, 4, 3, 30).estado).toBe("warn");
    expect(salud(0.25, 1, 0, 30).estado).toBe("ok");
    expect(salud(0.36, 6, 5, 30).estado).toBe("crit");
  });
});
