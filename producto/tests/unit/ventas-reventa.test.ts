import { describe, expect, it } from "vitest";
import { editarReventa, type CambioRev, type FilaRev } from "@/app/(app)/ventas/reventa";
import { estadoFC, foodCost } from "@/lib/costing";

/** Aplica cambios como lo haría la tabla: cada uno sobre el estado que dejó el anterior. Devuelve la fila y el último envío. */
function teclear(s: FilaRev, cambios: CambioRev[]) {
  let envio = null;
  for (const c of cambios) {
    const r = editarReventa(s, c);
    if (!r) continue;
    s = { ...s, coste: r.coste, pvp: r.pvp, mRef: r.mRef };
    envio = r.envio;
  }
  return { s, envio };
}
const refresco: FilaRev = { coste: 0.55, pvp: 2.8, iva: 10, conLineas: false };

describe("Ventas: tabla de reventa", () => {
  it("teclear una compra que empieza por 0 no deja el PVP a 0", () => {
    expect(editarReventa(refresco, { coste: 0 })).toBeNull();
    expect(editarReventa(refresco, { coste: null })).toBeNull();
    const { s, envio } = teclear(refresco, [{ coste: 0 }, { coste: 0 }, { coste: 0.6 }]);
    expect(s.pvp).toBeGreaterThan(2.8);
    expect(envio).toMatchObject({ coste: 0.6, pvp: s.pvp });
    expect(envio!.margen).toBeGreaterThan(70);
  });
  it("el margen se mantiene mientras se escribe: volver a la compra de antes devuelve el PVP de antes", () => {
    const { s } = teclear(refresco, [{ coste: 0 }, { coste: 0.5 }, { coste: 0.55 }]);
    expect(s.pvp).toBe(2.8);
  });
  it("cambiar el PVP justo después de la compra no pierde la compra", () => {
    const priorat: FilaRev = { coste: 2.1, pvp: 6.5, iva: 10, conLineas: false };
    const { envio } = teclear(priorat, [{ coste: 2.5 }, { pvp: 7 }]);
    expect(envio).toEqual({ coste: 2.5, pvp: 7, margen: 60.7 });
  });
  it("si sale de un artículo, la compra no se edita ni se envía", () => {
    const cerveza: FilaRev = { coste: 0.421, pvp: 3.2, iva: 10, conLineas: true };
    expect(editarReventa(cerveza, { coste: 1 })).toBeNull();
    const r = editarReventa(cerveza, { pvp: 3.5 });
    expect(r!.envio.coste).toBeNull();
    expect(r!.envio.pvp).toBe(3.5);
  });
  it("el margen guardado nunca deja el producto fuera de objetivo", () => {
    for (const m of [60, 67, 70, 75, 80, 85, 88]) for (const coste of [0.37, 0.55, 1.13, 2.1]) {
      const r = editarReventa({ coste, pvp: 3, iva: 10, conLineas: false }, { margen: m })!;
      expect(estadoFC(foodCost(r.coste, r.envio.pvp, 10), 100 - r.envio.margen!).estado).toBe("ok");
    }
  });
  it("borrar el PVP lo quita, y después la compra no se inventa uno", () => {
    const { s, envio } = teclear(refresco, [{ pvp: null }, { coste: 0.7 }]);
    expect(s.pvp).toBeNull();
    expect(envio).toEqual({ coste: 0.7, margen: null, pvp: null });
  });
  it("sin compra conocida, cambiarla no dispara el PVP", () => {
    const { envio } = teclear({ coste: 0, pvp: 2.5, iva: 10, conLineas: false }, [{ coste: 0.8 }]);
    expect(envio).toMatchObject({ coste: 0.8, pvp: 2.5 });
  });
});
