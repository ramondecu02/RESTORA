// Compara la lectura de un albarán con su transcripción correcta (hecha a mano) y cuenta qué líneas están bien.
// Es lógica pura: la usan la evaluación contra la API real (lectura.eval.ts) y sus pruebas unitarias.
import { dice, norm } from "@/lib/fuzzy";
import type { OcrAlbaran } from "@/lib/ocr-types";

/** Una línea de producto como debería haberse leído. Lo que no se pone no se comprueba. */
export type LineaCorrecta = { descripcion: string; cantidad?: number; unidad?: string; precio_unitario?: number; importe?: number };
export type Correcto = {
  proveedor_cif?: string; numero?: string; fecha?: string; total?: number;
  lineas: LineaCorrecta[];
};

export type EstadoLinea = "bien" | "mal-avisada" | "mal-sin-avisar" | "perdida";
export type ResultadoLinea = { esperada: LineaCorrecta; leida: OcrAlbaran["lineas"][number] | null; estado: EstadoLinea; fallos: string[] };
export type ResultadoDoc = {
  lineas: ResultadoLinea[]; sobrantes: OcrAlbaran["lineas"]; cabecera: { campo: string; esperado: unknown; leido: unknown; bien: boolean }[];
};

const cerca = (a: number, b: number, relativo = 0.005, absoluto = 0.02) => Math.abs(a - b) <= Math.max(absoluto, Math.abs(b) * relativo);
const solo = (s: string | null | undefined) => (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
/** Unidades que se dicen de varias maneras: «Kg», «kilo», «kg.» son la misma. */
const unidad = (u: string | null | undefined) => {
  const n = norm(u ?? "").replace(/\./g, "");
  if (/^(kg|kgs|kilo|kilos|kilogramo|kilogramos)$/.test(n)) return "kg";
  if (/^(ud|uds|und|unds|unidad|unidades|u)$/.test(n)) return "ud";
  if (/^(l|lt|lts|litro|litros)$/.test(n)) return "l";
  return n;
};
/** Sin avisar = la lectura dice estar segura de la línea y de sus dos cifras, y no apunta ninguna duda. */
export const avisada = (l: OcrAlbaran["lineas"][number]) => l.confianza !== "alta" || l.confianza_cantidad !== "alta" || l.confianza_precio !== "alta" || !!l.duda;

function fallosDe(e: LineaCorrecta, l: OcrAlbaran["lineas"][number]): string[] {
  const f: string[] = [];
  if (e.cantidad != null && (l.cantidad == null || !cerca(l.cantidad, e.cantidad, 0.001, 0.005))) f.push(`cantidad ${l.cantidad ?? "—"} en vez de ${e.cantidad}`);
  if (e.precio_unitario != null && (l.precio_unitario == null || !cerca(l.precio_unitario, e.precio_unitario, 0.005, 0.005))) f.push(`precio ${l.precio_unitario ?? "—"} en vez de ${e.precio_unitario}`);
  if (e.importe != null && (l.importe == null || !cerca(l.importe, e.importe))) f.push(`importe ${l.importe ?? "—"} en vez de ${e.importe}`);
  if (e.unidad != null && unidad(l.unidad) !== unidad(e.unidad)) f.push(`unidad «${l.unidad ?? "—"}» en vez de «${e.unidad}»`);
  return f;
}

/** Empareja cada línea correcta con la leída que más se le parece (por el texto y, a igualdad, por el importe) y comprueba sus cifras. */
export function compararLectura(ocr: OcrAlbaran, correcto: Correcto): ResultadoDoc {
  const candidatas = ocr.lineas.filter((l) => (l.tipo ?? "producto") === "producto");
  const libres = new Set(candidatas.keys());
  const lineas: ResultadoLinea[] = correcto.lineas.map((esperada) => {
    let mejor = -1, puntos = 0;
    for (const i of libres) {
      const l = candidatas[i];
      const texto = dice(norm(l.descripcion), norm(esperada.descripcion));
      const bonus = esperada.importe != null && l.importe != null && cerca(l.importe, esperada.importe) ? 0.3 : 0;
      if (texto + bonus > puntos) { puntos = texto + bonus; mejor = i; }
    }
    // Un parecido escaso no es la misma línea: se da por perdida
    if (mejor < 0 || puntos < 0.4) return { esperada, leida: null, estado: "perdida" as const, fallos: ["no aparece en la lectura"] };
    libres.delete(mejor);
    const leida = candidatas[mejor];
    const fallos = fallosDe(esperada, leida);
    return { esperada, leida, estado: fallos.length ? (avisada(leida) ? "mal-avisada" as const : "mal-sin-avisar" as const) : "bien" as const, fallos };
  });
  const cab = (campo: string, esperado: unknown, leido: unknown, bien: boolean) => ({ campo, esperado, leido, bien });
  const cabecera = [
    ...(correcto.proveedor_cif != null ? [cab("CIF", correcto.proveedor_cif, ocr.proveedor_cif, solo(ocr.proveedor_cif) === solo(correcto.proveedor_cif))] : []),
    ...(correcto.numero != null ? [cab("número", correcto.numero, ocr.numero, solo(ocr.numero) === solo(correcto.numero))] : []),
    ...(correcto.fecha != null ? [cab("fecha", correcto.fecha, ocr.fecha, ocr.fecha === correcto.fecha)] : []),
    ...(correcto.total != null ? [cab("total", correcto.total, ocr.total ?? ocr.total_sin_iva, (ocr.total ?? ocr.total_sin_iva) != null && cerca((ocr.total ?? ocr.total_sin_iva)!, correcto.total))] : []),
  ];
  return { lineas, sobrantes: [...libres].map((i) => candidatas[i]), cabecera };
}

export type Resumen = { documentos: number; lineas: number; bien: number; malAvisadas: number; malSinAvisar: number; perdidas: number; sobrantes: number; pctBien: number; pctSinAvisar: number };
export function resumir(docs: ResultadoDoc[]): Resumen {
  const todas = docs.flatMap((d) => d.lineas);
  const n = (e: EstadoLinea) => todas.filter((l) => l.estado === e).length;
  const total = todas.length;
  return {
    documentos: docs.length, lineas: total, bien: n("bien"), malAvisadas: n("mal-avisada"), malSinAvisar: n("mal-sin-avisar"), perdidas: n("perdida"),
    sobrantes: docs.reduce((s, d) => s + d.sobrantes.length, 0),
    pctBien: total ? (n("bien") / total) * 100 : 0, pctSinAvisar: total ? (n("mal-sin-avisar") / total) * 100 : 0,
  };
}
/** El criterio del MVP (P7): al menos el 95 % de las líneas bien y no más de un 1 % de errores sin avisar. */
export const cumpleCriterio = (r: Resumen) => r.lineas > 0 && r.pctBien >= 95 && r.pctSinAvisar <= 1;
