import { describe, expect, it } from "vitest";
import { applyPurchase, lineaCoste, replay } from "@/lib/pmp";
import { cantidadPedido, coberturaDias, estadoStock } from "@/lib/inventory";
import { inferPackFactor, toBase, defaultLineUnit } from "@/lib/units";
import { bestMatches, similarity } from "@/lib/fuzzy";
import { parseNum } from "@/lib/format";

describe("PMP y coste de línea", () => {
  it("pondera existencias y compra", () => expect(applyPurchase(10, 2, 10, 4)).toBeCloseTo(3, 6));
  it("sin existencias toma el precio de la compra", () => expect(applyPurchase(0, 2, 5, 4)).toBe(4));
  it("existencias negativas no distorsionan", () => expect(applyPurchase(-3, 2, 5, 4)).toBe(4));
  it("rehace stock y PMP al borrar un albarán", () => {
    const r = replay([
      { cantidad: 10, costeUnit: 2, tipo: "compra", fecha: "2026-01-01" },
      { cantidad: -5, costeUnit: null, tipo: "venta", fecha: "2026-01-02" },
      { cantidad: 5, costeUnit: 4, tipo: "compra", fecha: "2026-01-03" },
    ]);
    expect(r.stock).toBe(10);
    expect(r.pmp).toBeCloseTo(3, 6);
  });
  it("6+1 bonificada a 10 € → 8,57 €/ud", () => expect(lineaCoste(6, 10, 0, 1, 1).costeUnit).toBeCloseTo(60 / 7, 6));
  it("descuento de línea y factor de envase", () => {
    const r = lineaCoste(2, 34.5, 10, 0, 5); // 2 garrafas de 5 L con 10 %
    expect(r.importe).toBeCloseTo(62.1, 6);
    expect(r.costeUnit).toBeCloseTo(6.21, 6);
  });
});

describe("inventario", () => {
  it("cobertura en días", () => {
    expect(coberturaDias(6, 12)).toBeCloseTo(3.5, 6);
    expect(coberturaDias(6, 0)).toBe(99);
  });
  it("estado y pedido sugerido (2·mínimo − stock)", () => {
    expect(estadoStock(6, 8, 3.5).estado).toBe("crit");
    expect(estadoStock(9, 4, 5).estado).toBe("warn");
    expect(estadoStock(9, 4, 15).label).toBe("Correcto");
    expect(cantidadPedido(6, 8)).toBe(10);
    expect(cantidadPedido(1.8, 2)).toBe(2.2);
    expect(cantidadPedido(9, 4)).toBe(0);
  });
});

describe("unidades y envases", () => {
  it("deduce el factor del texto", () => {
    expect(inferPackFactor("ACEITE OLIVA V.EXTRA 5L", "L")?.factor).toBe(5);
    expect(inferPackFactor("MIX GOURMET 125G", "kg")?.factor).toBeCloseTo(0.125, 6);
    expect(inferPackFactor("HUEVO CAMPERO L EST.30", "ud")?.factor).toBe(30);
    expect(inferPackFactor("CERVEZA BARRIL 30L", "L")?.factor).toBe(30);
    expect(inferPackFactor("TOMATE PERA", "kg")).toBeNull();
  });
  it("unidades de receta", () => {
    expect(toBase(180, "g")).toBeCloseTo(0.18, 6);
    expect(defaultLineUnit("L")).toBe("ml");
  });
});

describe("emparejado difuso", () => {
  const items = [
    { id: "1", n: "Aceite de oliva virgen extra", a: ["aove"] },
    { id: "2", n: "Tomate pera", a: [] as string[] },
    { id: "3", n: "Huevo campero L", a: [] as string[] },
    { id: "4", n: "Brotes tiernos", a: ["brotes", "mezclum"] },
  ];
  it("empareja textos de albarán", () => {
    expect(bestMatches("ACEITE OLIVA V.EXTRA 5L", items, (i) => [i.n, ...i.a])[0].item.id).toBe("1");
    expect(bestMatches("TOMATE PERA", items, (i) => [i.n])[0].score).toBeGreaterThan(0.84);
    expect(bestMatches("HUEVO CAMPERO L EST.30", items, (i) => [i.n])[0].item.id).toBe("3");
  });
  it("no se inventa coincidencias", () => expect(similarity("MIX GOURMET 125G", "Tomate pera")).toBeLessThan(0.4));
  it("números con coma", () => {
    expect(parseNum("1.234,56")).toBeCloseTo(1234.56, 6);
    expect(parseNum("0.25")).toBe(0.25);
    expect(parseNum("")).toBeNull();
  });
});
