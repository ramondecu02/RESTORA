import { describe, expect, it } from "vitest";
import { buildDraft, draftCheck, needsEscalation, pendientes } from "@/lib/draft";
import { OcrAlbaran } from "@/lib/ocr-types";
import { parseCsv, rowsFromMapping } from "@/lib/csv";
import { MOCK_ALBARAN } from "@/server/ocr/mock-data";

const catalog = [
  { id: "tomate-pera", name: "Tomate pera", aliases: ["tomate"], unit: "kg" as const, categoryId: "verdura", rend: 95 },
  { id: "huevo-campero-l", name: "Huevo campero L", aliases: [], unit: "ud" as const, categoryId: "huevos", rend: 100 },
  { id: "aceite-oliva-ve", name: "Aceite de oliva virgen extra", aliases: ["aove"], unit: "L" as const, categoryId: "aceite_oliva", rend: 100 },
  { id: "cerveza-barril", name: "Cerveza de barril", aliases: [], unit: "L" as const, categoryId: "cerveza", rend: 100 },
  { id: "pollo-entero", name: "Pollo entero", aliases: [], unit: "kg" as const, categoryId: "carne", rend: 100 },
];
const catIva = new Map([["verdura", 4], ["huevos", 4], ["aceite_oliva", 4], ["cerveza", 21], ["carne", 10]]);

describe("borrador de validación", () => {
  const ocr = OcrAlbaran.parse(MOCK_ALBARAN);
  const d = buildDraft(ocr, { arts: [], catalog, catIva, provs: [], packs: new Map() });
  it("empareja con el catálogo y deduce envases", () => {
    const tomate = d.lineas.find((l) => l.texto === "TOMATE PERA")!;
    expect(tomate.match?.tipo).toBe("catalogo");
    expect(tomate.resuelto.articulo).toBe(true);
    const aceite = d.lineas.find((l) => l.texto.startsWith("ACEITE"))!;
    expect(aceite.factor).toBe(5);
    const huevo = d.lineas.find((l) => l.texto.startsWith("HUEVO"))!;
    expect(huevo.factor).toBe(30);
  });
  it("pregunta por el IVA cuando no cuadra con el esperado", () => {
    const cerveza = d.lineas.find((l) => l.texto.startsWith("CERVEZA"))!;
    expect(cerveza.decisiones.iva).toBe(true);
    expect(pendientes(cerveza)).toContain("iva");
  });
  it("marca la cantidad dudosa", () => {
    const pollo = d.lineas.find((l) => l.texto.startsWith("POLLO"))!;
    expect(pollo.decisiones.cantidad).toBe(true);
  });
  it("línea sin coincidencia pide decisión de artículo", () => {
    const mix = d.lineas.find((l) => l.texto.startsWith("MIX"))!;
    expect(mix.match).toBeNull();
    expect(mix.decisiones.articulo).toBe(true);
  });
  it("comprobación de totales con el albarán", () => {
    const ok = JSON.parse(JSON.stringify(d));
    for (const l of ok.lineas) { l.iva = l.iva ?? l.ivaLeido; }
    const cerveza = ok.lineas.find((l: { texto: string }) => l.texto.startsWith("CERVEZA"));
    cerveza.iva = 21;
    const c = draftCheck(ok);
    expect(c.total).toBeCloseTo(ocr.total!, 1);
    expect(c.cuadra).toBe(true);
  });
  it("no escala una lectura buena", () => expect(needsEscalation(ocr)).toBe(false));
  it("escala si hay muchas líneas dudosas", () => {
    const bad = { ...ocr, lineas: ocr.lineas.map((l) => ({ ...l, confianza: "baja" as const })) };
    expect(needsEscalation(bad)).toBe(true);
  });
});

describe("CSV de ventas", () => {
  it("detecta separador y columnas", () => {
    const p = parseCsv("Fecha;Producto;Unidades;Importe\n01/05/2026;Lubina a la brasa;12;288,00\n01/05/2026;Crema catalana;20;130,00\nTotal;;32;418\n");
    expect(p.mapping).not.toBeNull();
    const rows = rowsFromMapping(p.rows, p.mapping!);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ fecha: "2026-05-01", producto: "Lubina a la brasa", unidades: 12, importe: 288 });
  });
});
