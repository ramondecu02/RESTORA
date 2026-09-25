import { afterEach, describe, expect, it, vi } from "vitest";
import { applyPurchase, lineaCoste, replay, type Mov } from "@/lib/pmp";
import { cantidadPedido, coberturaDias, estadoStock } from "@/lib/inventory";
import { inferPackFactor, toBase, defaultLineUnit } from "@/lib/units";
import { bestMatches, similarity } from "@/lib/fuzzy";
import { parseNum } from "@/lib/format";
import { confirmarAlbaran, validDate } from "@/server/domain/compras";
import type { AppCtx } from "@/server/ctx";
import type { Draft, DraftLine } from "@/lib/ocr-types";

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
  it("un recuento fija el stock contado en su fecha: lo anterior que llega o se borra después no lo mueve", () => {
    const base: Mov[] = [
      { cantidad: 40, costeUnit: 2, tipo: "compra", fecha: "2026-09-01T12:00:00Z" },
      { cantidad: 10, costeUnit: null, tipo: "recuento", fecha: "2026-09-20T09:00:00Z" },
    ];
    expect(replay(base).stock).toBe(10);
    // Albarán del día 18 subido después del recuento: ya estaba en lo contado
    expect(replay([...base, { cantidad: 5, costeUnit: 3, tipo: "compra", fecha: "2026-09-18T12:00:00Z" }]).stock).toBe(10);
    // Borrar la compra anterior al recuento tampoco cambia lo contado
    expect(replay(base.slice(1)).stock).toBe(10);
    // Lo posterior sí cuenta
    expect(replay([...base, { cantidad: -1, costeUnit: null, tipo: "merma", fecha: "2026-09-21T10:00:00Z" }]).stock).toBe(9);
  });
  it("el recuento no cambia el PMP y pondera la compra siguiente con lo contado", () => {
    const r = replay([
      { cantidad: 40, costeUnit: 2, tipo: "compra", fecha: "2026-09-01" },
      { cantidad: 10, costeUnit: null, tipo: "recuento", fecha: "2026-09-20" },
      { cantidad: 10, costeUnit: 4, tipo: "compra", fecha: "2026-09-22" },
    ]);
    expect(r.stock).toBe(20);
    expect(r.pmp).toBeCloseTo(3, 6);
  });
  it("quitar los datos de ejemplo tras un recuento deja lo contado", () => {
    const user: Mov[] = [{ cantidad: 10, costeUnit: 1, tipo: "inicial", fecha: "2026-09-01" }, { cantidad: 12, costeUnit: null, tipo: "recuento", fecha: "2026-09-10" }];
    const demo: Mov = { cantidad: 36, costeUnit: 1, tipo: "compra", fecha: "2026-09-05" };
    expect(replay([...user, demo]).stock).toBe(12);
    expect(replay(user).stock).toBe(12);
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

describe("fechas de albarán", () => {
  afterEach(() => { vi.useRealTimers(); });
  it("rechaza días que no existen en vez de pasarlos al mes siguiente", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-07-15T10:00:00Z"));
    expect(validDate("2026-06-30")).toBe("2026-06-30");
    expect(validDate("2026-06-31")).toBeNull();
    expect(validDate("2026-02-29")).toBeNull();
    expect(validDate("2024-02-29")).toBe("2024-02-29");
    expect(validDate("2026-04-31")).toBeNull();
    expect(validDate("2026-13-01")).toBeNull();
    expect(validDate("31/05/2026")).toBeNull();
    expect(validDate("2026-07-30")).toBeNull(); // más de 3 días en el futuro
    expect(validDate(null)).toBeNull();
  });
});

describe("confirmar albarán: validación de líneas", () => {
  const ctx = { tenantId: "00000000-0000-4000-8000-000000000001", userId: "u", local: { id: "l" } } as unknown as AppCtx;
  const linea = (p: Partial<DraftLine>): DraftLine => ({
    id: "m1", texto: "TOMATE", cantidad: 2, cantidadTexto: "2", unidadCompra: "kg", factor: 1, factorFuente: "unidad", precio: 5, descuento: 0, bonificadas: 0,
    importe: null, ivaLeido: 4, iva: 4, ivaEsperado: 4, conf: { linea: "alta", cantidad: "alta", precio: "alta" }, duda: null,
    match: { tipo: "tuyo", id: "a1", score: 1, porUsuario: true }, nuevo: null, candidatos: [],
    decisiones: { articulo: false, iva: false, cantidad: false, unidad: false }, resuelto: { articulo: true, iva: true, cantidad: true, unidad: true }, ...p,
  });
  const draft = (l: DraftLine, total: number | null = null): Draft => ({
    proveedor: { nombreLeido: null, cif: null, id: null, conf: "alta", nuevo: true, nombre: "Proveedor" }, numero: null, numeroAlt: null, confNumero: "alta",
    numeroRevisado: true, fecha: "2026-07-01", confFecha: "alta", total, confTotal: "alta", desglose: [], lineas: [l], observaciones: null,
  });
  const err = async (p: Partial<DraftLine>, total: number | null = null) => {
    const r = await confirmarAlbaran(ctx, "00000000-0000-4000-8000-000000000002", draft(linea(p), total), {});
    return r.ok ? null : r.error;
  };
  it("rechaza descuentos fuera de 0–100 % y regalos negativos (darían costes negativos)", async () => {
    expect(await err({ descuento: 150 })).toMatch(/descuento/);
    expect(await err({ descuento: -5 })).toMatch(/descuento/);
    expect(await err({ bonificadas: -1 })).toMatch(/regalo/);
  });
  it("rechaza cifras fuera de rango o que no son números", async () => {
    expect(await err({ cantidad: 1e9 })).toMatch(/cantidad/);
    expect(await err({ cantidad: "2" as unknown as number })).toMatch(/cantidad/);
    expect(await err({ precio: Infinity })).toMatch(/precio/);
    expect(await err({ factor: 1e7 })).toMatch(/conversión/);
    expect(await err({ iva: 10.5 })).toMatch(/IVA/);
    expect(await err({ cantidad: 1e6, precio: 1e6 })).toMatch(/demasiado grandes/);
    expect(await err({}, 1e12)).toMatch(/total/);
  });
});
