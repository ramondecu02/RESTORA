import { describe, expect, it } from "vitest";
import { MOCK_ALBARAN } from "@/server/ocr/mock-data";
import type { OcrAlbaran } from "@/lib/ocr-types";
import { compararLectura, cumpleCriterio, resumir, type Correcto } from "../eval/comparar";

type L = OcrAlbaran["lineas"][number];
const linea = (descripcion: string, cantidad: number, unidad: string, precio: number, extra: Partial<L> = {}): L => ({
  descripcion, cantidad, cantidad_texto: String(cantidad), unidad, precio_unitario: precio, descuento_pct: null, bonificadas: null,
  importe: Math.round(cantidad * precio * 100) / 100, iva_pct: 10, confianza: "alta", confianza_cantidad: "alta", confianza_precio: "alta", duda: null, ...extra,
});
const doc = (lineas: L[]): OcrAlbaran => ({ ...MOCK_ALBARAN, lineas, proveedor_cif: "B43123456", numero: "A-2231", fecha: "2026-10-04", total: 187.2 });
const correcto: Correcto = {
  proveedor_cif: "B-43123456", numero: "a 2231", fecha: "2026-10-04", total: 187.2,
  lineas: [
    { descripcion: "Aceite oliva virgen extra 5 L", cantidad: 4, unidad: "garrafa", precio_unitario: 45, importe: 180 },
    { descripcion: "Tomate rama", cantidad: 12.5, unidad: "kg", precio_unitario: 2.1, importe: 26.25 },
  ],
};

describe("evaluación de la lectura: comparar con la transcripción correcta", () => {
  it("todo bien: las unidades se igualan («Kg.») y la cabecera se compara sin mayúsculas ni signos", () => {
    const r = compararLectura(doc([linea("ACEITE OLIVA V.EXTRA 5L", 4, "garrafa", 45), linea("TOMATE RAMA", 12.5, "Kg.", 2.1)]), correcto);
    expect(r.lineas.map((l) => l.estado)).toEqual(["bien", "bien"]);
    expect(r.cabecera.every((c) => c.bien)).toBe(true);
    expect(r.sobrantes).toHaveLength(0);
  });

  it("separa el error avisado del error sin avisar: una cantidad mal leída con «confianza alta» es la peligrosa", () => {
    const sin = compararLectura(doc([linea("ACEITE OLIVA V.EXTRA 5L", 4, "garrafa", 45), linea("TOMATE RAMA", 125, "kg", 2.1)]), correcto);
    expect(sin.lineas[1].estado).toBe("mal-sin-avisar");
    expect(sin.lineas[1].fallos.join()).toContain("cantidad 125 en vez de 12.5");
    const avisada = compararLectura(doc([linea("ACEITE OLIVA V.EXTRA 5L", 4, "garrafa", 45), linea("TOMATE RAMA", 125, "kg", 2.1, { confianza_cantidad: "baja", duda: "el 12,5 se lee 125" })]), correcto);
    expect(avisada.lineas[1].estado).toBe("mal-avisada");
  });

  it("una línea que no aparece está perdida y una que sobra se cuenta aparte; portes y devoluciones no son producto", () => {
    const r = compararLectura(doc([linea("ACEITE OLIVA V.EXTRA 5L", 4, "garrafa", 45), linea("PORTES", 1, "ud", 5, { tipo: "portes" }), linea("LIMONES", 3, "kg", 1.5)]), correcto);
    expect(r.lineas[1].estado).toBe("perdida");
    expect(r.sobrantes.map((l) => l.descripcion)).toEqual(["LIMONES"]);
  });

  it("la tolerancia es pequeña: el precio con un 2 % de diferencia ya es error, un céntimo de redondeo no", () => {
    const mal = compararLectura(doc([linea("ACEITE OLIVA V.EXTRA 5L", 4, "garrafa", 45.9), linea("TOMATE RAMA", 12.5, "kg", 2.1)]), correcto);
    expect(mal.lineas[0].estado).toBe("mal-sin-avisar");
    const redondeo = compararLectura(doc([linea("ACEITE OLIVA V.EXTRA 5L", 4, "garrafa", 45, { importe: 180.01 }), linea("TOMATE RAMA", 12.5, "kg", 2.1)]), correcto);
    expect(redondeo.lineas[0].estado).toBe("bien");
  });

  it("el criterio del MVP: 95 % de líneas bien y no más de un 1 % sin avisar", () => {
    const bien = Array.from({ length: 100 }, (_, i) => ({ lineas: [{ esperada: { descripcion: "x" + i }, leida: null, estado: "bien" as const, fallos: [] }], sobrantes: [], cabecera: [] }));
    const con = (n: number, estado: "mal-avisada" | "mal-sin-avisar") => bien.map((d, i) => (i < n ? { ...d, lineas: [{ ...d.lineas[0], estado }] } : d));
    expect(cumpleCriterio(resumir(bien))).toBe(true);
    expect(cumpleCriterio(resumir(con(5, "mal-avisada")))).toBe(true);
    expect(cumpleCriterio(resumir(con(6, "mal-avisada")))).toBe(false);
    expect(cumpleCriterio(resumir(con(1, "mal-sin-avisar")))).toBe(true);
    expect(cumpleCriterio(resumir(con(2, "mal-sin-avisar")))).toBe(false);
  });
});
