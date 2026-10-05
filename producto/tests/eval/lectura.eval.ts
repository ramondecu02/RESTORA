// Evaluación de la lectura de albaranes contra documentos reales con su transcripción correcta (criterio P7 de «MVP terminado»).
// NO forma parte de `npm test`: llama a la API de verdad y cuesta dinero (≈ 8 céntimos por documento). Ver tests/eval/README.md.
import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readAlbaran } from "@/server/ocr";
import { compararLectura, cumpleCriterio, resumir, type Correcto, type ResultadoDoc } from "./comparar";

const DIR = process.env.EVAL_DIR;
const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" };
const pct = (n: number) => n.toFixed(1).replace(".", ",") + " %";

describe.skipIf(!DIR)("lectura de albaranes contra documentos reales", () => {
  it("cumple el criterio del MVP: al menos el 95 % de las líneas bien y como mucho un 1 % de errores sin avisar", async () => {
    const dir = path.resolve(DIR!);
    const docs = readdirSync(dir).filter((f) => MIME[path.extname(f).toLowerCase()] && existsSync(path.join(dir, path.basename(f, path.extname(f)) + ".json"))).sort();
    expect(docs.length, `No hay pares «archivo + .json» en ${dir}`).toBeGreaterThan(0);
    if (process.env.EVAL_YES !== "1") {
      console.log(`\nVoy a leer ${docs.length} documentos con la API de verdad (≈ ${(docs.length * 0.08).toFixed(2).replace(".", ",")} € de media, hasta ${(docs.length * 0.15).toFixed(2).replace(".", ",")} €).`);
      console.log("Para ejecutarlo de verdad: EVAL_YES=1 y ANTHROPIC_API_KEY en el entorno.\n");
      return;
    }
    // Con OCR_PROVIDER=mock se ejercita la herramienta sin gastar nada (la lectura devuelve el albarán simulado)
    if (process.env.OCR_PROVIDER !== "mock") expect(process.env.ANTHROPIC_API_KEY, "Falta ANTHROPIC_API_KEY").toBeTruthy();

    const resultados: { archivo: string; coste: number; ms: number; res: ResultadoDoc }[] = [];
    for (const archivo of docs) {
      const correcto = JSON.parse(readFileSync(path.join(dir, path.basename(archivo, path.extname(archivo)) + ".json"), "utf8")) as Correcto;
      const { ocr, usage } = await readAlbaran([{ data: readFileSync(path.join(dir, archivo)), mime: MIME[path.extname(archivo).toLowerCase()], name: archivo }], "Restaurante de pruebas");
      const res = compararLectura(ocr, correcto);
      resultados.push({ archivo, coste: usage.costUsd, ms: usage.ms, res });
      const mal = res.lineas.filter((l) => l.estado !== "bien");
      console.log(`${mal.length ? "✗" : "✓"} ${archivo}: ${res.lineas.length - mal.length}/${res.lineas.length} líneas bien${res.cabecera.some((c) => !c.bien) ? " · cabecera: " + res.cabecera.filter((c) => !c.bien).map((c) => `${c.campo} ${c.leido ?? "—"} (era ${c.esperado})`).join(", ") : ""}`);
      for (const l of mal) console.log(`    ${l.estado === "mal-sin-avisar" ? "‼ SIN AVISAR" : l.estado === "perdida" ? "· perdida" : "· avisada"} «${l.esperada.descripcion}» — ${l.fallos.join("; ")}`);
    }
    const r = resumir(resultados.map((x) => x.res));
    const coste = resultados.reduce((s, x) => s + x.coste, 0);
    console.log(`\n${r.documentos} documentos, ${r.lineas} líneas: ${r.bien} bien (${pct(r.pctBien)}), ${r.malAvisadas} mal pero avisadas, ${r.malSinAvisar} mal SIN avisar (${pct(r.pctSinAvisar)}), ${r.perdidas} perdidas, ${r.sobrantes} de más.`);
    console.log(`Cabeceras bien: ${resultados.flatMap((x) => x.res.cabecera).filter((c) => c.bien).length}/${resultados.flatMap((x) => x.res.cabecera).length}. Coste de la pasada: ${coste.toFixed(2)} $ (${(coste / r.documentos).toFixed(3)} $ por documento).`);
    const salida = path.resolve("tests/eval/out");
    mkdirSync(salida, { recursive: true });
    writeFileSync(path.join(salida, `informe-${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify({ resumen: r, coste, resultados }, null, 2));
    expect(cumpleCriterio(r), `No se cumple el criterio: ${pct(r.pctBien)} bien (mínimo 95 %) y ${pct(r.pctSinAvisar)} sin avisar (máximo 1 %)`).toBe(true);
  }, 3_600_000);
});
