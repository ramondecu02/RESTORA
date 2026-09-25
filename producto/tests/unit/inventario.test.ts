import { describe, expect, it } from "vitest";
import { cantidadPedido, coberturaDias, coberturaMedia, numValido } from "@/lib/inventory";
import { redondeoBench } from "@/server/queries/bench";

describe("pedido sugerido: cubrir dos semanas", () => {
  it("con consumo conocido pide dos semanas de consumo sin bajar del mínimo", () => {
    // Lubina de la demo: stock 6, mínimo 8, consumo 12/semana → 2·12 + 8 − 6
    expect(cantidadPedido(6, 8, 12)).toBe(26);
    const tras = 6 + cantidadPedido(6, 8, 12);
    expect(coberturaDias(tras - 8, 12)).toBeGreaterThanOrEqual(14);
  });
  it("pide aunque no esté bajo mínimo si quedan menos de dos semanas", () => {
    // stock 3, mínimo 2, consumo 20/semana: ~1 día de cobertura
    expect(cantidadPedido(3, 2, 20)).toBe(39);
    expect(cantidadPedido(20, 8, 12)).toBe(12);
    expect(cantidadPedido(10, null, 7)).toBe(4);
  });
  it("no pide nada con dos semanas o más cubiertas y por encima del mínimo", () => {
    expect(cantidadPedido(30, 8, 12)).toBe(0);
    expect(cantidadPedido(24, null, 12)).toBe(0);
  });
  it("bajo mínimo con mucho stock para el consumo, repone hasta el mínimo más dos semanas", () => {
    expect(cantidadPedido(30, 40, 5)).toBe(20);
  });
  it("sin consumo sigue la regla del doble del mínimo", () => {
    expect(cantidadPedido(6, 8)).toBe(10);
    expect(cantidadPedido(6, 8, null)).toBe(10);
    expect(cantidadPedido(6, 8, 0)).toBe(10);
    expect(cantidadPedido(9, 4, null)).toBe(0);
    expect(cantidadPedido(5, null, null)).toBe(0);
  });
});

describe("cobertura media", () => {
  it("solo cuenta lo que tiene consumo", () => {
    expect(coberturaMedia([{ stock: 2, consumo: 7 }, { stock: 3, consumo: 7 }, { stock: 10, consumo: null }])).toBeCloseTo(2.5, 6);
  });
  it("sin ningún consumo no hay media", () => {
    expect(coberturaMedia([{ stock: 10, consumo: null }, { stock: 1, consumo: 0 }])).toBeNull();
    expect(coberturaMedia([])).toBeNull();
  });
  it("limita a 99 días lo que sobra", () => {
    expect(coberturaMedia([{ stock: 1000, consumo: 1 }, { stock: 1, consumo: 7 }])).toBeCloseTo(50, 6);
  });
});

describe("validación de cantidades y precios", () => {
  it("acepta cero y positivos finitos", () => {
    expect(numValido(0)).toBe(true);
    expect(numValido(2.5)).toBe(true);
  });
  it("rechaza negativos, NaN, infinitos, textos y valores absurdos", () => {
    expect(numValido(-3)).toBe(false);
    expect(numValido(Number.NaN)).toBe(false);
    expect(numValido(Number.POSITIVE_INFINITY)).toBe(false);
    expect(numValido("3")).toBe(false);
    expect(numValido(null)).toBe(false);
    expect(numValido(2e7)).toBe(false);
    expect(numValido(2e6, 1e6)).toBe(false);
  });
});

describe("precio de referencia", () => {
  it("se publica redondeado a dos cifras significativas", () => {
    expect(redondeoBench(13.37)).toBe(13);
    expect(redondeoBench(1.234)).toBe(1.2);
    expect(redondeoBench(0.456)).toBe(0.46);
    expect(redondeoBench(145.6)).toBe(150);
    expect(redondeoBench(9.99)).toBe(10);
  });
});
