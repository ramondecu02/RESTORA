import { describe, expect, it } from "vitest";
import { buildDraft, convertir, draftCheck, esUnidadBase, lineImporte, matchProveedor, needsEscalation, pendientes, tipoIva, type ArtRef, type PackMemory } from "@/lib/draft";
import { bestMatches, similarity } from "@/lib/fuzzy";
import { OcrAlbaran, type OcrLinea } from "@/lib/ocr-types";
import { parseCsv, rowsFromMapping } from "@/lib/csv";
import { MOCK_ALBARAN, MOCK_ALBARAN_GIL } from "@/server/ocr/mock-data";

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

// Albarán de una sola línea para probar casos sueltos
const linea = (descripcion: string, cantidad: number | null, unidad: string | null, precio: number | null, extra: Partial<OcrLinea> = {}): OcrLinea => ({
  descripcion, cantidad, cantidad_texto: cantidad == null ? "" : String(cantidad), unidad, precio_unitario: precio, descuento_pct: null, bonificadas: null,
  importe: cantidad != null && precio != null ? Math.round(cantidad * precio * 100) / 100 : null, iva_pct: 4,
  confianza: "alta", confianza_cantidad: "alta", confianza_precio: "alta", duda: null, ...extra,
});
const albaran = (lineas: OcrLinea[], extra: Partial<OcrAlbaran> = {}): OcrAlbaran => OcrAlbaran.parse({ ...MOCK_ALBARAN, lineas, desglose_iva: [], total: null, ...extra });
const patata: ArtRef = { id: "a-patata", name: "Patata agria", aliases: [], unit: "kg", categoryId: "verdura", iva: 4, rend: 90 };
const refresco: ArtRef = { id: "a-refresco", name: "Refresco de cola", aliases: [], unit: "ud", categoryId: "refresco", iva: 21, rend: 100 };
const ctxCon = (packs: PackMemory, arts: ArtRef[] = [patata, refresco]) => ({ arts, catalog, catIva, provs: [], packs });
const unaLinea = (l: OcrLinea, packs: PackMemory = new Map(), arts?: ArtRef[]) => buildDraft(albaran([l]), ctxCon(packs, arts)).lineas[0];

describe("unidades y envases del borrador", () => {
  it("la unidad impresa manda sobre el tamaño del texto", () => {
    const saco25kg = unaLinea(linea("PATATA AGRIA SACO 25KG", 25, "kg", 0.57));
    expect(saco25kg).toMatchObject({ factor: 1, unidadCompra: "kg", factorFuente: "unidad" });
    expect(saco25kg.decisiones.unidad).toBe(false);
    expect(unaLinea(linea("PATATA AGRIA SACO 25KG", 25, "kilos", 0.57)).factor).toBe(1);
    const huevo = buildDraft(albaran([linea("HUEVO CAMPERO L EST.30", 60, "ud", 0.27)]), { arts: [], catalog, catIva, provs: [], packs: new Map() }).lineas[0];
    expect(huevo.factor).toBe(1);
    const barril = buildDraft(albaran([linea("CERVEZA BARRIL 30L", 30, "L", 2.1)]), { arts: [], catalog, catIva, provs: [], packs: new Map() }).lineas[0];
    expect(barril.factor).toBe(1);
  });
  it("con un envase, el tamaño del texto da el factor", () => {
    expect(unaLinea(linea("PATATA AGRIA SACO 25KG", 1, "saco", 14.25))).toMatchObject({ factor: 25, unidadCompra: "saco", factorFuente: "texto" });
    expect(convertir("ACEITE OLIVA 5L", "garrafa", "L")).toEqual({ factor: 5, fuente: "texto", unidad: "garrafa" });
    expect(convertir("ACEITE OLIVA 5L", "", "L")).toEqual({ factor: 5, fuente: "texto", unidad: "5 L" });
    expect(convertir("TOMATE PERA", "", "kg")).toEqual({ factor: 1, fuente: "unidad", unidad: "kg" });
    expect(convertir("TOMATE PERA", "caja", "kg")).toBeNull();
    expect(esUnidadBase("Kilos", "kg")).toBe(true);
    expect(esUnidadBase("unidades", "ud")).toBe(true);
    expect(esUnidadBase("caja", "ud")).toBe(false);
    expect(esUnidadBase("", "kg")).toBe(false);
  });
  it("el envase recordado no sustituye a una unidad leída distinta", () => {
    // Recordado «saco» de 25 kg (albarán de Gil) y ahora llega en kg (Martínez): 25 kg, no 625
    const kg = unaLinea(linea("PATATA AGRIA", 25, "kg", 0.62), new Map([["a-patata", { unidadCompra: "saco", factor: 25, propio: true }]]));
    expect(kg).toMatchObject({ unidadCompra: "kg", factor: 1, factorFuente: "unidad" });
    // Recordado kg y llega «caja» sin tamaño: se pregunta, no se apunta como kg
    const caja = unaLinea(linea("PATATA AGRIA", 2, "caja", 12), new Map([["a-patata", { unidadCompra: "kg", factor: 1, propio: true }]]));
    expect(caja.unidadCompra).toBe("caja");
    expect(caja.factor).toBeNull();
    expect(caja.decisiones.unidad).toBe(true);
    expect(pendientes(caja)).toContain("unidad");
  });
  it("el envase recordado vale con la misma unidad o sin unidad", () => {
    const mem: PackMemory = new Map([["a-refresco", { unidadCompra: "caja", factor: 24, propio: true }]]);
    expect(unaLinea(linea("REFRESCO DE COLA", 2, "caja", 13.2), mem)).toMatchObject({ factor: 24, factorFuente: "articulo", unidadCompra: "caja" });
    const sin = unaLinea(linea("REFRESCO DE COLA", 2, null, 13.2), mem);
    expect(sin).toMatchObject({ factor: 24, factorFuente: "articulo", unidadCompra: "caja" });
    expect(sin.decisiones.unidad).toBe(false);
  });
  it("el envase de otro proveedor solo se sugiere", () => {
    const l = unaLinea(linea("REFRESCO DE COLA", 2, "caja", 13.2), new Map([["a-refresco", { unidadCompra: "caja", factor: 24, propio: false }]]));
    expect(l.factor).toBe(24);
    expect(l.decisiones.unidad).toBe(true);
    expect(l.resuelto.unidad).toBe(false);
    // Si otro proveedor lo servía por la unidad base, no hay nada que preguntar
    const base = unaLinea(linea("PATATA AGRIA", 25, null, 0.62), new Map([["a-patata", { unidadCompra: "kg", factor: 1, propio: false }]]));
    expect(base).toMatchObject({ factor: 1, unidadCompra: "kg" });
    expect(base.decisiones.unidad).toBe(false);
  });
});

describe("emparejado de productos elaborados", () => {
  const cat = [
    { id: "cebolla", name: "Cebolla", aliases: [] as string[] },
    { id: "cebolla-dulce", name: "Cebolla dulce", aliases: ["cebolla fuentes"] },
    { id: "patata", name: "Patata", aliases: ["patatas"] },
    { id: "ajo", name: "Ajo", aliases: ["ajos"] },
    { id: "tomate-pera", name: "Tomate pera", aliases: ["tomate"] },
    { id: "aceite-oliva-suave", name: "Aceite de oliva suave", aliases: ["aceite oliva 0.4"] },
    { id: "atun-aceite", name: "Atún en aceite", aliases: [] as string[] },
    { id: "anchoa", name: "Anchoa en aceite", aliases: [] as string[] },
    { id: "limon", name: "Limón", aliases: ["limones"] },
    { id: "chipiron", name: "Chipirón", aliases: [] as string[] },
    { id: "merluza", name: "Merluza", aliases: [] as string[] },
  ];
  const top = (t: string) => bestMatches(t, cat, (c) => [c.name, ...c.aliases], 0.4, 3, true)[0];
  it("no empareja solo un producto elaborado con el fresco", () => {
    for (const t of ["CEBOLLA FRITA 1KG", "CEBOLLA CARAMELIZADA", "PATATAS FRITAS BOLSA", "PATATA CHIPS", "AJO EN POLVO", "AJO NEGRO", "SALSA DE TOMATE", "ACEITUNA RELLENA ANCHOA", "LIMONADA"]) {
      expect(top(t)?.score ?? 0, t).toBeLessThan(0.84);
    }
    expect(top("ATUN EN ACEITE DE OLIVA").item.id).toBe("atun-aceite");
  });
  it("sigue emparejando variedades, orígenes y plurales", () => {
    expect(top("CEBOLLA DULCE FUENTES")).toMatchObject({ item: { id: "cebolla-dulce" } });
    expect(top("CEBOLLA DULCE FUENTES").score).toBeGreaterThanOrEqual(0.84);
    expect(top("LIMON PRIMOFIORI").score).toBeGreaterThanOrEqual(0.84);
    expect(top("MERLUZA DEL CANTABRICO").score).toBeGreaterThanOrEqual(0.84);
    expect(top("TOMATES PERA").item.id).toBe("tomate-pera");
    expect(top("TOMATES PERA").score).toBeGreaterThanOrEqual(0.84);
  });
  it("las reglas de producto no afectan a los proveedores", () => {
    expect(similarity("CEBOLLA FRITA", "Cebolla", true)).toBeLessThan(0.84);
    expect(matchProveedor("FRUTAS Y VERDURAS DE LA HUERTA S.L.", null, [{ id: "p1", name: "La Huerta", cif: "" }])?.id).toBe("p1");
  });
  it("en el borrador queda como candidato para decidir", () => {
    const l = buildDraft(albaran([linea("CEBOLLA FRITA 1KG", 2, "ud", 6)]), { arts: [], catalog: [{ id: "cebolla", name: "Cebolla", aliases: [], unit: "kg", categoryId: "verdura", rend: 90 }], catIva, provs: [], packs: new Map() }).lineas[0];
    expect(l.match).toBeNull();
    expect(l.decisiones.articulo).toBe(true);
    expect(l.candidatos[0]?.id).toBe("cebolla");
  });
});

describe("IVA y descuentos leídos", () => {
  it("un IVA que no es entero (recargo de equivalencia) no se da por leído", () => {
    expect(tipoIva(5.2)).toBeNull();
    expect(tipoIva(1.4)).toBeNull();
    expect(tipoIva(21)).toBe(21);
    expect(tipoIva(10.0000001)).toBe(10);
    expect(tipoIva(null)).toBeNull();
    const l = unaLinea(linea("PATATA AGRIA", 25, "kg", 0.62, { iva_pct: 5.2 }));
    expect(l.ivaLeido).toBeNull();
    expect(l.iva).toBeNull();
    expect(l.decisiones.iva).toBe(true);
    expect(l.duda).toMatch(/5,2 %/);
    const pie = buildDraft(albaran([linea("PATATA AGRIA", 25, "kg", 0.62, { iva_pct: null })], { desglose_iva: [{ tipo: 5.2, base: 15.5, cuota: 0.81 }] }), ctxCon(new Map())).lineas[0];
    expect(pie.ivaLeido).toBeNull();
  });
  it("sin precio unitario, se deduce del importe deshaciendo el descuento", () => {
    const l = unaLinea(linea("PATATA AGRIA", 10, "kg", null, { descuento_pct: 10, importe: 9 }));
    expect(l.precio).toBe(1);
    expect(l.descuento).toBe(10);
    expect(lineImporte(l)).toBeCloseTo(9, 6);
    const sinCant = unaLinea(linea("PATATA AGRIA", null, "kg", 1, { descuento_pct: 10, importe: 9 }));
    expect(sinCant.cantidad).toBe(10);
    const gratis = unaLinea(linea("PATATA AGRIA", 10, "kg", null, { descuento_pct: 100, importe: 0 }));
    expect(gratis.precio).toBeNull();
  });
});

describe("albaranes de ejemplo", () => {
  it("el tutorial pide las mismas decisiones", () => {
    const ocr = OcrAlbaran.parse(MOCK_ALBARAN);
    const cat = [...catalog,
      { id: "cebolla-dulce", name: "Cebolla dulce", aliases: ["cebolla fuentes"], unit: "kg" as const, categoryId: "verdura", rend: 90 },
      { id: "patata-agria", name: "Patata agria", aliases: [], unit: "kg" as const, categoryId: "verdura", rend: 90 },
      { id: "limon", name: "Limón", aliases: ["limones"], unit: "kg" as const, categoryId: "fruta", rend: 100 },
      { id: "lechuga-romana", name: "Lechuga romana", aliases: ["romana"], unit: "ud" as const, categoryId: "verdura", rend: 90 },
      { id: "vinagre-jerez", name: "Vinagre de Jerez", aliases: [], unit: "L" as const, categoryId: "condimento", rend: 100 },
      { id: "sal-marina", name: "Sal marina", aliases: ["sal gorda"], unit: "kg" as const, categoryId: "condimento", rend: 100 },
    ];
    const iva = new Map([...catIva, ["fruta", 4], ["condimento", 10]]);
    const d = buildDraft(ocr, { arts: [], catalog: cat, catIva: iva, provs: [], packs: new Map() });
    const dec = Object.fromEntries(d.lineas.map((l) => [l.texto, Object.entries(l.decisiones).filter(([, v]) => v).map(([k]) => k).join("+")]));
    expect(dec).toEqual({
      "TOMATE PERA": "", "CEBOLLA DULCE": "", "PATATA AGRIA": "", "HUEVO CAMPERO L EST.30": "", "LIMON": "", "LECHUGA ROMANA": "",
      "ACEITE OLIVA V.EXTRA 5L": "", "VINAGRE JEREZ 1L": "", "SAL MARINA 1KG": "", "POLLO ENTERO": "cantidad", "CERVEZA BARRIL 30L": "iva", "MIX GOURMET 125G": "articulo",
    });
    const gil = buildDraft(OcrAlbaran.parse(MOCK_ALBARAN_GIL), { arts: [], catalog: cat, catIva: iva, provs: [], packs: new Map() });
    expect(gil.lineas.every((l) => pendientes(l).length === 0)).toBe(true);
    expect(gil.lineas.find((l) => l.texto.startsWith("PATATA"))?.factor).toBe(25);
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
