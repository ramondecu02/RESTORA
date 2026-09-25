import { afterEach, describe, expect, it, vi } from "vitest";
import { capitalize, fecha, fechaLarga, fechaNum, isoDate, ultimosMeses } from "@/lib/format";
import { decodeFlash } from "@/components/ui/toast";

describe("fechas en hora de Madrid", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("isoDate da el día de Madrid, no el del servidor", () => {
    expect(isoDate(new Date("2026-09-30T22:30:00Z"))).toBe("2026-10-01"); // 00:30 del 1 de octubre (verano)
    expect(isoDate(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01"); // 00:30 del 1 de enero (invierno)
    expect(isoDate(new Date("2026-12-31T22:30:00Z"))).toBe("2026-12-31");
    expect(isoDate(new Date("2026-03-05T10:00:00Z"))).toBe("2026-03-05");
  });

  it("isoDate() sin argumento es hoy en el restaurante", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-30T22:30:00Z"));
    expect(isoDate()).toBe("2026-10-01");
    expect(capitalize(fechaLarga(new Date()))).toBe("Jueves, 1 de octubre");
  });

  it("un día suelto (AAAA-MM-DD) se muestra tal cual", () => {
    expect(fecha("2026-09-24")).toBe("24 sept");
    expect(fechaNum("2026-01-01")).toBe("01/01/2026");
    expect(fechaNum("2026-12-31")).toBe("31/12/2026");
    expect(fecha("2026-03-29", { day: "numeric", month: "long", year: "numeric" })).toBe("29 de marzo de 2026");
    expect(fecha(null)).toBe("—");
  });

  it("las horas guardadas se muestran en hora de Madrid", () => {
    expect(fecha("2026-09-24T18:30:00.000Z", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })).toBe("24 sept, 20:30");
    expect(fecha("2026-01-15T18:30:00.000Z", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })).toBe("15 ene, 19:30");
    expect(fecha(new Date("2026-09-30T22:30:00Z").toISOString())).toBe("1 oct");
  });
});

describe("aviso tras redirección (rs_flash)", () => {
  // Así llega hoy: setFlash codifica y el serializador de cookies de Next vuelve a codificar.
  const doble = (s: string) => encodeURIComponent(encodeURIComponent(s));

  it("decodifica la doble codificación", () => {
    const msg = "Copia creada. Está fuera de la carta hasta que la actives.";
    expect(decodeFlash(doble(msg))).toBe(msg);
    expect(decodeFlash(doble("Descuento del 100 % aplicado"))).toBe("Descuento del 100 % aplicado");
    expect(decodeFlash(doble("Hecho."))).toBe("Hecho.");
  });

  it("también vale si solo se codifica una vez", () => {
    expect(decodeFlash(encodeURIComponent("Receta borrada."))).toBe("Receta borrada.");
    expect(decodeFlash(encodeURIComponent("Margen al 30 %"))).toBe("Margen al 30 %");
  });

  it("una cookie corrupta no muestra nada", () => {
    expect(decodeFlash("%E0%A4%A")).toBeNull();
  });
});

describe("ultimosMeses", () => {
  it("cuenta hacia atrás cruzando el año", () => {
    expect(ultimosMeses(6, "2026-02-15")).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(ultimosMeses(1, "2026-12-31")).toEqual(["2026-12"]);
  });
});
