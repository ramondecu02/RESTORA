import { describe, expect, it } from "vitest";
import { assessGray, BLUR_BELOW, DARK_BELOW, flagged, qualityHint, qualityTag, toGray } from "@/lib/imgcheck";

// Rellena un gris uniforme (sin bordes → nitidez 0).
const uniform = (w: number, h: number, v: number) => new Uint8ClampedArray(w * h).fill(v);
// Tablero de ajedrez 0/255 (muchos bordes → nitidez altísima).
function checker(w: number, h: number): Uint8ClampedArray {
  const g = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y * w + x] = (x + y) % 2 ? 255 : 0;
  return g;
}

describe("imgcheck · brillo", () => {
  it("marca oscura una foto por debajo del umbral", () => {
    const q = assessGray(uniform(40, 40, DARK_BELOW - 20), 40, 40);
    expect(q.brightness).toBeCloseTo(DARK_BELOW - 20, 0);
    expect(q.dark).toBe(true);
  });
  it("no marca oscura una foto bien iluminada", () => {
    expect(assessGray(uniform(40, 40, 190), 40, 40).dark).toBe(false);
  });
});

describe("imgcheck · nitidez", () => {
  it("marca movida una foto plana (sin bordes) con luz suficiente", () => {
    const q = assessGray(uniform(40, 40, 160), 40, 40);
    expect(q.sharpness).toBeLessThan(BLUR_BELOW);
    expect(q.blur).toBe(true);
  });
  it("no marca movida una foto con mucho detalle", () => {
    const q = assessGray(checker(40, 40), 40, 40);
    expect(q.sharpness).toBeGreaterThan(BLUR_BELOW);
    expect(q.blur).toBe(false);
  });
  it("no acusa de movida cuando en realidad está oscura (la poca luz baja la nitidez)", () => {
    const q = assessGray(uniform(40, 40, 20), 40, 40); // plana y oscura
    expect(q.dark).toBe(true);
    expect(q.blur).toBe(false); // no la llamamos movida: primero que haya luz
  });
});

describe("imgcheck · avisos", () => {
  it("qualityTag da una palabra y prioriza la falta de luz", () => {
    expect(qualityTag({ brightness: 20, sharpness: 0, dark: true, blur: false })).toBe("Oscura");
    expect(qualityTag({ brightness: 160, sharpness: 10, dark: false, blur: true })).toBe("Movida");
    expect(qualityTag({ brightness: 160, sharpness: 999, dark: false, blur: false })).toBeNull();
  });
  it("qualityHint da una frase corta", () => {
    expect(qualityHint({ brightness: 20, sharpness: 0, dark: true, blur: false })).toMatch(/oscura/i);
    expect(qualityHint({ brightness: 160, sharpness: 10, dark: false, blur: true })).toMatch(/movida/i);
    expect(qualityHint({ brightness: 160, sharpness: 999, dark: false, blur: false })).toBeNull();
  });
  it("flagged distingue foto con aviso de foto sin datos", () => {
    expect(flagged(null)).toBe(false);
    expect(flagged({ brightness: 160, sharpness: 999, dark: false, blur: false })).toBe(false);
    expect(flagged({ brightness: 20, sharpness: 0, dark: true, blur: false })).toBe(true);
  });
});

describe("imgcheck · toGray y bordes", () => {
  it("convierte RGBA a luminancia perceptual", () => {
    // Blanco → 255, negro → 0, rojo puro → 76 (0.299·255)
    const rgba = [255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255];
    const g = toGray(rgba, 4, 1);
    expect(g[0]).toBe(255);
    expect(g[1]).toBe(0);
    expect(g[2]).toBe(76);
    expect(g[3]).toBe(150); // verde puro → 0.587·255 = 149.69, redondeado por Uint8ClampedArray
  });
  it("no rompe ni avisa con una muestra vacía o incompleta", () => {
    const q = assessGray(new Uint8ClampedArray(0), 0, 0);
    expect(q.dark).toBe(false);
    expect(q.blur).toBe(false);
    expect(assessGray(new Uint8ClampedArray(3), 40, 40).dark).toBe(false); // menos datos que píxeles
  });
});
