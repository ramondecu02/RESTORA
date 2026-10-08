import { describe, expect, it } from "vitest";
import { baseDePvp, cantidadPorVenta, costeDeVenta, esReventa, familiaReventa, margenVenta, pistasPorEnvase, pvpDeBase, servidoPorDefecto, ventasPorUnidad } from "@/lib/venta-articulo";

describe("Artículos que se venden tal cual", () => {
  it("solo vinos, cervezas, licores y bebidas son producto final; el café y la cocina no", () => {
    for (const c of ["vino", "cerveza", "licor", "bebida", "refresco"]) expect(esReventa(c)).toBe(true);
    for (const c of ["cafe", "verdura", "aceite_oliva", "limpieza", "otros"]) expect(esReventa(c)).toBe(false);
    expect(familiaReventa("vino")).toBe("Vinos");
    expect(familiaReventa("cerveza")).toBe("Cervezas");
    expect(familiaReventa("bebida")).toBe("Refrescos"); expect(familiaReventa("refresco")).toBe("Refrescos");
    expect(familiaReventa("licor")).toBe("Bebidas");
  });
  it("una unidad suelta se sirve de una en una; en volumen o peso hay que decir cuánto", () => {
    expect(servidoPorDefecto("ud")).toEqual({ cantidad: 1, unidad: "ud", raciones: 1 });
    expect(servidoPorDefecto("L")).toBeNull();
    expect(servidoPorDefecto("kg")).toBeNull();
  });
  it("el coste de una venta sale del precio por unidad base y de lo que se sirve, en cualquier unidad compatible", () => {
    expect(costeDeVenta(2.4, 1, "ud", "ud")).toBeCloseTo(2.4);
    expect(costeDeVenta(8, 750, "ml", "L")).toBeCloseTo(6); // botella de 75 cl a 8 €/L
    expect(costeDeVenta(8, 0.2, "L", "L")).toBeCloseTo(1.6); // caña
    expect(costeDeVenta(null, 1, "ud", "ud")).toBeNull();
    expect(costeDeVenta(2, 1, "kg", "L")).toBeNull(); // unidad que no encaja
  });
  it("el margen se mide sobre la venta sin IVA", () => {
    // Vino: compra 6,00 €, PVP 18,15 € con IVA 21 % → neto 15 € → margen 60 %
    const m = margenVenta(6, 18.15, 21)!;
    expect(m.margen).toBeCloseTo(60, 5);
    expect(m.beneficio).toBeCloseTo(9, 5);
    // Agua: 0,30 € de compra y 1,65 € con IVA 10 % → neto 1,50 € → 80 %
    expect(margenVenta(0.3, 1.65, 10)!.margen).toBeCloseTo(80, 5);
  });
  it("sin precio de venta o sin coste no hay margen que enseñar", () => {
    expect(margenVenta(null, 3, 10)).toBeNull();
    expect(margenVenta(0, 3, 10)).toBeNull();
    expect(margenVenta(1, null, 10)).toBeNull();
    expect(margenVenta(1, 0, 10)).toBeNull();
  });
  it("una caja o un barril comprado como «ud» reparte su coste entre las ventas que salen de él", () => {
    // Caja de 24 refrescos a 13,18 € → 0,549 € cada uno
    expect(costeDeVenta(13.18, 1, "ud", "ud", 24)).toBeCloseTo(0.5492, 3);
    // Barril de 30 L a 77,97 € servido en cañas de 20 cl: 150 ventas
    expect(costeDeVenta(77.97, 1, "ud", "ud", 150)).toBeCloseTo(0.5198, 3);
    expect(costeDeVenta(10, 1, "ud", "ud", 0)).toBeNull();
    expect(ventasPorUnidad({ cantidad: 1, unidad: "ud", raciones: 24 })).toBe(24);
    expect(ventasPorUnidad({ cantidad: 2, unidad: "ud", raciones: 1 })).toBe(0.5); // una receta hecha a mano: 2 uds por venta
    expect(cantidadPorVenta({ cantidad: 750, unidad: "ml", raciones: 1 })).toBe(750);
  });
  it("el nombre del artículo da pistas de cuántas ventas salen de cada unidad", () => {
    expect(pistasPorEnvase("Refrescos (caja 24)").map((p) => p.n)).toEqual([24]);
    expect(pistasPorEnvase("Agua mineral (caja 12 × 1 L)").map((p) => p.n)).toEqual([12]);
    expect(pistasPorEnvase("Cerveza barril 30 L").map((p) => p.n)).toEqual([150, 90, 60]); // caña 20 cl, tercio 33 cl, pinta 50 cl
    expect(pistasPorEnvase("Coca-Cola")).toEqual([]);
    expect(pistasPorEnvase("Vino tinto 75 cl")).toEqual([]);
  });
  it("la base imponible y el PVP con IVA se convierten sin perder el margen", () => {
    expect(pvpDeBase(1.5, 10)).toBe(1.65);
    expect(baseDePvp(1.65, 10)).toBe(1.5);
    expect(pvpDeBase(15, 21)).toBe(18.15);
    // El margen sobre la base no depende del IVA del local: 1,50 € de base y 0,45 € de coste = 70 % con cualquier IVA
    for (const iva of [4, 10, 21]) expect(margenVenta(0.45, pvpDeBase(1.5, iva), iva)!.margen).toBeCloseTo(70, 0);
  });
});
