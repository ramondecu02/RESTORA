// Series mensuales para fichas y gráficas: lo real (ventas importadas) en los meses cerrados y, en el último, la cifra calculada con la carta.
export type HistMes = { mes: string; neto: number; coste: number; uds: number };

/** Una cifra por cada mes de `months` (AAAA-MM): la del histórico donde lo hay (huecos = null) y `actual` en el último, el mes en curso. */
export function serieMensual(months: string[], hist: HistMes[], f: (h: HistMes) => number | null, actual: number | null): (number | null)[] {
  const H = new Map(hist.map((h) => [h.mes, h]));
  return months.map((m, i) => (i === months.length - 1 ? actual : H.has(m) ? f(H.get(m)!) : null));
}

/** Variación en % del último valor frente al anterior (null si falta alguno o el anterior es 0). */
export function variacionPct(serie: (number | null)[]): number | null {
  const cur = serie[serie.length - 1], prev = serie[serie.length - 2];
  return cur != null && prev != null && prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : null;
}

/** Diferencia absoluta del último valor frente al anterior (para porcentajes: puntos). */
export function diferencia(serie: (number | null)[]): number | null {
  const cur = serie[serie.length - 1], prev = serie[serie.length - 2];
  return cur != null && prev != null ? cur - prev : null;
}
