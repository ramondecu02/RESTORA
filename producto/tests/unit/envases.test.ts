import { describe, expect, it } from "vitest";
import { convertir } from "@/lib/draft";
import { inferPackFactor } from "@/lib/units";

// Antes, «CAJA 6 × 1 L» daba factor 1 L (el de UNA botella): el precio por litro salía 6 veces mayor y además se «aprendía» mal.
describe("envases con varias piezas (N × tamaño)", () => {
  const f = (t: string, base: "kg" | "L" | "ud", unidad = "") => inferPackFactor(t, base, unidad)?.factor;

  it("N × tamaño antes de la medida", () => {
    expect(f("CERVEZA CAJA 24X33CL", "L", "caja")).toBeCloseTo(7.92, 6);
    expect(f("REFRESCO 6X1L", "L", "ud")).toBe(6);
    expect(f("ACEITE GIRASOL 3X5L", "L")).toBe(15);
    expect(f("ARROZ FARDO 10 X 1 KG", "kg", "fardo")).toBe(10);
    expect(f("HARINA 4 x 500g", "kg")).toBeCloseTo(2, 6);
    expect(f("AGUA 12 × 50 cl", "L")).toBeCloseTo(6, 6);
  });
  it("tamaño × N después de la medida", () => {
    expect(f("VINO TINTO 75CL X 6", "L")).toBeCloseTo(4.5, 6);
    expect(f("LECHE 1L x 12", "L")).toBe(12);
    expect(f("YOGUR 125 G X 8", "kg")).toBeCloseTo(1, 6);
  });
  it("con decimales con coma y sin espacios", () => {
    expect(f("COLA 24X0,33L", "L")).toBeCloseTo(7.92, 6);
    expect(f("VINO 6x0,75l", "L")).toBeCloseTo(4.5, 6);
  });
  it("«24 uds» + tamaño solo se multiplica si lo que se compra es una caja, un pack o un fardo", () => {
    expect(f("REFRESCO 33CL 24 UDS", "L", "caja")).toBeCloseTo(7.92, 6);
    expect(f("REFRESCO 33CL 24 UDS", "L", "pack")).toBeCloseTo(7.92, 6);
    expect(f("REFRESCO 33CL 24 UDS", "L", "ud")).toBeCloseTo(0.33, 6); // se compra la botella suelta: no se multiplica
    expect(f("REFRESCO 33CL 24 UDS", "L")).toBeCloseTo(0.33, 6);
    expect(f("GALLETAS 125G 12 UD", "kg", "caja")).toBeCloseTo(1.5, 6);
  });
  it("artículo por unidades: cuenta las piezas del envase", () => {
    expect(f("REFRESCO CAJA 6X1L", "ud", "caja")).toBe(6);
    expect(f("REFRESCO 24X33CL", "ud")).toBe(24);
    expect(f("HUEVO CAMPERO L EST.30", "ud")).toBe(30);
    expect(f("CAJA 24", "ud")).toBe(24);
  });
  it("lo que ya funcionaba sigue igual", () => {
    expect(f("ACEITE OLIVA V.EXTRA 5L", "L")).toBe(5);
    expect(f("MIX GOURMET 125G", "kg")).toBeCloseTo(0.125, 6);
    expect(f("CERVEZA BARRIL 30L", "L")).toBe(30);
    expect(f("COCA COLA 33CL", "L", "ud")).toBeCloseTo(0.33, 6);
    expect(f("TOMATE PERA", "kg")).toBeUndefined();
    expect(f("ACEITE 1X5L", "L")).toBe(5); // 1 × 5 L: una sola pieza
  });
  it("no mezcla tipos: un peso no sirve para un artículo en litros y al revés", () => {
    expect(f("ARROZ 6X1KG", "L")).toBeUndefined();
    expect(f("ACEITE 6X1L", "kg")).toBeUndefined();
  });
  it("la etiqueta explica la cuenta", () => {
    expect(inferPackFactor("CERVEZA 24X33CL", "L")?.label).toBe("24 × 33 cl");
    expect(inferPackFactor("ACEITE 3X5L", "L")?.label).toBe("3 × 5 L");
  });
});

describe("conversión de la unidad de compra", () => {
  it("una caja de 6 × 1 L: la unidad impresa es «caja» → 6 L", () => {
    expect(convertir("REFRESCO 6X1L", "caja", "L")).toMatchObject({ factor: 6, fuente: "texto", unidad: "caja" });
  });
  it("si lo impreso ya es la unidad base, manda la unidad y no el texto", () => {
    expect(convertir("TOMATE 2 X 1 KG", "kg", "kg")).toMatchObject({ factor: 1, fuente: "unidad" });
    expect(convertir("REFRESCO 6X1L", "L", "L")).toMatchObject({ factor: 1, fuente: "unidad" });
  });
});
