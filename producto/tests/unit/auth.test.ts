import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/nav";
import { codeBoxInput } from "@/lib/code-box";

describe("safeNext (destino tras entrar)", () => {
  it("acepta rutas internas", () => {
    expect(safeNext("/compras/123?x=1#y")).toBe("/compras/123?x=1#y");
    expect(safeNext("/invitacion/abc_DEF-123")).toBe("/invitacion/abc_DEF-123");
    expect(safeNext("/hoy%09x")).toBe("/hoy%09x");
    expect(safeNext("/")).toBe("/");
  });
  it("rechaza vacíos, rutas relativas y otros dominios", () => {
    for (const n of [undefined, null, "", "hoy", "https://example.com", "//example.com", "/\\example.com", "javascript:alert(1)"]) {
      expect(safeNext(n)).toBe("/hoy");
    }
  });
  it("rechaza tabuladores, saltos de línea, espacios y barras invertidas", () => {
    for (const n of ["/\t/example.com", "/\t\\example.com", "/\n/example.com", "/\r/example.com", "/ /example.com", "/a\\b", "/\x00x", "/\x7fx", "/á"]) {
      expect(safeNext(n)).toBe("/hoy");
    }
  });
  it("no se fía de valores que no son texto", () => {
    expect(safeNext(["/a", "/b"] as unknown as string)).toBe("/hoy");
  });
});

describe("casillas del código", () => {
  it("una cifra en una casilla vacía", () => {
    expect(codeBoxInput("", "7")).toEqual({ digit: "7" });
    expect(codeBoxInput("3", "")).toEqual({ digit: "" });
    expect(codeBoxInput("", "a")).toEqual({ digit: "" });
  });
  it("una cifra escrita sobre otra la sustituye, esté el cursor antes o después", () => {
    expect(codeBoxInput("3", "39", "9")).toEqual({ digit: "9" });
    expect(codeBoxInput("3", "93", "9")).toEqual({ digit: "9" });
    expect(codeBoxInput("3", "39")).toEqual({ digit: "9" });
    expect(codeBoxInput("3", "93")).toEqual({ digit: "9" });
    expect(codeBoxInput("3", "33")).toEqual({ digit: "3" });
  });
  it("varias cifras de golpe (autorrelleno) se reparten", () => {
    expect(codeBoxInput("", "123456")).toEqual({ spread: "123456" });
    expect(codeBoxInput("3", "123456")).toEqual({ spread: "123456" });
    expect(codeBoxInput("", "12")).toEqual({ spread: "12" });
  });
});
