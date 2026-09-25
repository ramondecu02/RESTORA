import { describe, expect, it } from "vitest";
import { leerLocal, parseEntero } from "@/app/(onb)/alta/local/datos";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("enteros escritos a la española", () => {
  it("el punto y el espacio agrupan miles", () => {
    expect(parseEntero("1.200")).toBe(1200);
    expect(parseEntero("1 200")).toBe(1200);
    expect(parseEntero("12.000.000")).toBe(12000000);
    expect(parseEntero("1200")).toBe(1200);
    expect(parseEntero("120,0")).toBe(120);
  });
  it("vacío es null y lo que no es entero es NaN", () => {
    expect(parseEntero("")).toBeNull();
    expect(parseEntero("  ")).toBeNull();
    expect(parseEntero(null)).toBeNull();
    expect(parseEntero("1,5")).toBeNaN();
    expect(parseEntero("1,200")).toBeNaN();
    expect(parseEntero("1.5")).toBeNaN();
    expect(parseEntero("12.00")).toBe(12);
    expect(parseEntero("abc")).toBeNaN();
  });
});

describe("formulario «Tu local» del alta", () => {
  const base = { name: "Casa Pujol", address: " Calle Mayor 12 ", postal_code: "43003", ciudad: "Tarragona", iva_venta: "10", fc_objetivo: "30", comensales_dia: "" };
  it("lee los valores limpios", () => {
    const d = leerLocal(form({ ...base, iva_venta: "21", fc_objetivo: "28,5", comensales_dia: "1.200" }));
    expect(d.fields).toBeUndefined();
    expect(d.vals).toEqual({ name: "Casa Pujol", address: "Calle Mayor 12", postal_code: "43003", ciudad: "Tarragona", iva_venta: 21, fc_objetivo: 28.5, comensales_dia: 1200 });
  });
  it("sin food cost usa el 30 % y sin comensales guarda null; 0 equivale a vacío", () => {
    expect(leerLocal(form({ ...base, fc_objetivo: "" })).vals.fc_objetivo).toBe(30);
    expect(leerLocal(form(base)).vals.comensales_dia).toBeNull();
    const cero = leerLocal(form({ ...base, comensales_dia: "0" }));
    expect(cero.fields).toBeUndefined();
    expect(cero.vals.comensales_dia).toBeNull();
    expect(leerLocal(form({ ...base, iva_venta: "7" })).vals.iva_venta).toBe(10);
  });
  it("los comensales fuera de rango o con decimales dan error en el campo (no se guardan redondeados ni rompen la página)", () => {
    for (const c of ["3000000000", "100001", "-5", "1,5", "1,200", "muchos"]) {
      expect(leerLocal(form({ ...base, comensales_dia: c })).fields?.comensales_dia, c).toBeTruthy();
    }
    expect(leerLocal(form({ ...base, comensales_dia: "100.000" })).fields).toBeUndefined();
  });
  it("el food cost fuera de rango o ilegible da error en el campo", () => {
    for (const fc of ["3", "81", "abc"]) expect(leerLocal(form({ ...base, fc_objetivo: fc })).fields?.fc_objetivo, fc).toBeTruthy();
  });
  it("devuelve lo que escribió el usuario para volver a mostrarlo", () => {
    const d = leerLocal(form({ ...base, address: "Calle Mayor 12", ciudad: "Reus", fc_objetivo: "3" }));
    expect(d.fields?.fc_objetivo).toBeTruthy();
    expect(d.values).toMatchObject({ address: "Calle Mayor 12", ciudad: "Reus", fc_objetivo: "3", postal_code: "43003" });
  });
  it("un nombre de una letra es un error; vacío lo decide la acción", () => {
    expect(leerLocal(form({ ...base, name: "X" })).fields?.name).toBeTruthy();
    const d = leerLocal(form({ ...base, name: "  " }));
    expect(d.fields).toBeUndefined();
    expect(d.vals.name).toBe("");
  });
});
