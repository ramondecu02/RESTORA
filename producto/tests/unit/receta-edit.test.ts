import { describe, expect, it } from "vitest";
import { estadoFC, foodCost } from "@/lib/costing";
import { borradorAlRefrescar, borradorGuardado, convertirCantidad, editarBorrador, fusionReceta, margenDesdePvp, pvpDesdeMargen, vistaBorrador, type Borrador } from "@/lib/receta-edit";

// Reventa: el objetivo de food cost es 100 − margen. Con los redondeos, el producto no debe salir «Ajustado» por sí solo.
const estado = (coste: number, pvp: number, margen: number, iva = 10) => estadoFC(foodCost(coste, pvp, iva), 100 - margen).estado;

describe("reventa: PVP y margen redondeados sin salirse del objetivo", () => {
  it("casos de la revisión", () => {
    expect(pvpDesdeMargen(1.37, 70, 10)).toBe(5.03);
    expect(estado(1.37, 5.03, 70)).toBe("ok");
    expect(margenDesdePvp(0.55, 3.3, 10)).toBe(81.6);
    expect(estado(0.55, 3.3, 81.6)).toBe("ok");
  });
  it("exactos se quedan como están", () => {
    expect(pvpDesdeMargen(1, 75, 0)).toBe(4);
    expect(margenDesdePvp(1, 4, 0)).toBe(75);
    expect(margenDesdePvp(0.3, 3, 0)).toBe(90);
  });
  it("margen dentro de 0–99", () => {
    expect(margenDesdePvp(5, 2, 10)).toBe(0);
    expect(margenDesdePvp(0.01, 100, 10)).toBe(99);
  });
  it("barrido: margen tecleado → PVP, y PVP tecleado → margen", () => {
    let casos = 0;
    for (const coste of [0.37, 0.55, 1.2, 1.37, 2.1, 3.33, 7.49]) {
      for (let m = 0; m <= 95; m += 0.5) {
        expect(estado(coste, pvpDesdeMargen(coste, m, 10), m)).toBe("ok");
        casos++;
      }
      for (let c = 100; c <= 3000; c += 7) {
        const pvp = c / 100;
        if (pvp / 1.1 <= coste) continue; // por debajo del coste no hay margen que valga
        expect(estado(coste, pvp, margenDesdePvp(coste, pvp, 10))).toBe("ok");
        casos++;
      }
    }
    expect(casos).toBeGreaterThan(2000);
  });
});

describe("cambio de unidad de una línea", () => {
  it("no pierde cantidades pequeñas", () => {
    for (const g of [0.1, 0.15, 0.4, 0.5, 1.4, 2.5, 12.4, 70]) {
      const kg = convertirCantidad(g, "g", "kg");
      expect(kg).toBeGreaterThan(0);
      expect(convertirCantidad(kg, "kg", "g")).toBeCloseTo(g, 9);
    }
    expect(convertirCantidad(0.4, "g", "kg")).toBe(0.0004);
    expect(convertirCantidad(1500, "ml", "L")).toBe(1.5);
    expect(convertirCantidad(0.3, "kg", "g")).toBe(300);
  });
});

describe("guardado a tres bandas", () => {
  const origen = { name: "Croquetas", pvp: 9.5, ventasMes: 100, notas: "", lineas: [["a", null, null, 100, "g"]] };
  it("solo escribe lo que el usuario cambió y no pisa lo que cambió otro", () => {
    const actual = { ...origen, pvp: 10.5, ventasMes: 240 };
    const { cambiados, conflictos } = fusionReceta({ ...origen, notas: "corregido" }, origen, actual);
    expect(cambiados).toEqual(["notas"]);
    expect(conflictos).toEqual([]);
  });
  it("conflicto si los dos cambian lo mismo con valores distintos", () => {
    const r = fusionReceta({ ...origen, pvp: 11 }, origen, { ...origen, pvp: 10.5 });
    expect(r.conflictos).toEqual(["pvp"]);
    expect(fusionReceta({ ...origen, pvp: 10.5 }, origen, { ...origen, pvp: 10.5 }).conflictos).toEqual([]);
  });
  it("líneas: se comparan enteras", () => {
    const otras = [["a", null, null, 120, "g"]];
    expect(fusionReceta({ ...origen, lineas: otras }, origen, origen)).toEqual({ cambiados: ["lineas"], conflictos: [] });
    expect(fusionReceta({ ...origen, lineas: otras }, origen, { ...origen, lineas: [["b", null, null, 1, "ud"]] }).conflictos).toEqual(["lineas"]);
    expect(fusionReceta({ ...origen, name: "Croquetas caseras" }, origen, { ...origen, lineas: otras }).cambiados).toEqual(["name"]);
  });
  it("null e indefinido cuentan igual", () => {
    expect(fusionReceta({ a: undefined }, { a: null }, { a: null }).cambiados).toEqual([]);
  });
});

describe("borrador de la ficha", () => {
  type D = { name: string; notas: string; precios: Record<string, number> };
  const igual = (a: D, b: D) => JSON.stringify(a) === JSON.stringify(b);
  const limpio = (x: D) => ({ ...x, precios: {} });
  const v1: D = { name: "Arroz", notas: "", precios: {} };
  const edit = (b: Borrador<D> | null, base: D, f: (x: D) => D) => editarBorrador(b, base, igual, f, limpio);

  it("sin cambios sigue a los datos del servidor", () => {
    expect(vistaBorrador(null, v1, igual)).toEqual({ d: v1, orig: v1, dirty: false });
    const v2 = { ...v1, name: "Arroz de carabineros" };
    expect(vistaBorrador(borradorAlRefrescar<D>(null), v2, igual).d).toBe(v2);
  });
  it("subir la foto (refresco) no borra lo que estabas escribiendo", () => {
    const b = edit(null, v1, (x) => ({ ...x, name: "Arroz EDITADO", notas: "sin guardar" }));
    const v2 = { ...v1 }; // mismo contenido, objeto nuevo tras router.refresh()
    const tras = borradorAlRefrescar(b);
    expect(tras).toBe(b);
    expect(vistaBorrador(tras, v2, igual)).toMatchObject({ d: { name: "Arroz EDITADO", notas: "sin guardar" }, orig: v1, dirty: true });
  });
  it("tras guardar muestra lo guardado y luego lo que llega del servidor", () => {
    const b = edit(null, v1, (x) => ({ ...x, precios: { a: 25 } }));
    const g = borradorGuardado(b, b.d);
    expect(vistaBorrador(g, v1, igual)).toMatchObject({ d: { precios: { a: 25 } }, dirty: false });
    const v2 = { ...v1, notas: "del servidor" };
    expect(vistaBorrador(borradorAlRefrescar(g), v2, igual)).toEqual({ d: v2, orig: v2, dirty: false });
    // editar antes de que lleguen los datos parte de lo guardado, sin volver a aplicar los precios
    expect(edit(g, v1, (x) => ({ ...x, notas: "otra" })).d).toEqual({ name: "Arroz", notas: "otra", precios: {} });
  });
  it("lo escrito mientras se guardaba sigue pendiente", () => {
    const b = edit(null, v1, (x) => ({ ...x, name: "Arroz 2" }));
    const b2 = edit(b, v1, (x) => ({ ...x, notas: "escrito durante el guardado" }));
    const g = borradorGuardado(b2, b.d)!;
    expect(g.saved).toBeFalsy();
    expect(vistaBorrador(borradorAlRefrescar(g), { ...v1, name: "Arroz 2" }, igual)).toMatchObject({ d: { notas: "escrito durante el guardado" }, orig: { name: "Arroz 2" }, dirty: true });
  });
  it("si deshaces a mano, el siguiente cambio parte de lo último del servidor", () => {
    const b = edit(null, v1, (x) => ({ ...x, name: "X" }));
    const b2 = edit(b, v1, (x) => ({ ...x, name: "Arroz" }));
    const v2 = { ...v1, notas: "nuevo" };
    expect(vistaBorrador(b2, v2, igual).d).toBe(v2);
    expect(edit(b2, v2, (x) => ({ ...x, name: "Y" }))).toEqual({ d: { ...v2, name: "Y" }, o: v2 });
  });
});
