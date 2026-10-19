import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Screen } from "@/components/shell/screen";
import { Icon } from "@/components/icons";
import { Esqueleto } from "@/components/ui/esqueleto";
import { Kpi, Kpis } from "@/components/ui/kpi";
import { hasPerm, requireApp, type AppCtx } from "@/server/ctx";
import { grupoData, mesesDelGrupo, type FilaGrupo } from "@/server/queries/grupo";
import { capitalize, eur, eur0, fecha, num, plural } from "@/lib/format";
import { cambiarLocal } from "../cuenta/actions";

export const metadata = { title: "Grupo" };
const cambio = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);
const fc = (neto: number, coste: number) => (neto > 0 ? (coste / neto) * 100 : null);

export default async function Grupo({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const ctx = await requireApp();
  // Es una vista de cifras de venta: solo para quien ve Ventas, y solo cuando hay más de un local que comparar
  if (!hasPerm(ctx, "ventas")) redirect("/hoy");
  if (ctx.locales.length < 2) redirect("/cuenta#locales");
  const { meses, elegido } = await mesesDelGrupo(ctx, (await searchParams).mes);
  const nombreMes = (m: string) => capitalize(fecha(`${m}-15`, { month: "long", year: "numeric" }));
  return (
    <Screen title="Grupo" sub={`Tus ${ctx.locales.length} locales, uno junto a otro · ${nombreMes(elegido)}`} sinBuscar>
      <nav className="chips" aria-label="Mes">
        {meses.map((m) => <Link key={m} className={`chip ${m === elegido ? "is-on" : ""}`} href={`/grupo?mes=${m}`} aria-current={m === elegido ? "page" : undefined}>{nombreMes(m)}</Link>)}
      </nav>
      <Suspense key={elegido} fallback={<Esqueleto kpis={4} filas={4} texto="Comparando tus locales…" />}><Contenido ctx={ctx} mes={elegido} /></Suspense>
    </Screen>
  );
}

function Atencion({ f }: { f: FilaGrupo }) {
  const t = [
    f.fuera ? [`${plural(f.fuera, "plato fuera de objetivo", "platos fuera de objetivo")}`, "tag-bad"] : null,
    f.avisos ? [plural(f.avisos, "aviso de precio", "avisos de precio"), "tag-warn"] : null,
    f.revisar ? [`${plural(f.revisar, "documento por revisar", "documentos por revisar")}`, "tag-warn"] : null,
    f.bajo ? [`${plural(f.bajo, "producto bajo mínimo", "productos bajo mínimo")}`, "tag-warn"] : null,
  ].filter(Boolean) as [string, string][];
  return t.length ? <span className="tags">{t.map(([x, c]) => <span key={x} className={`tag ${c}`}>{x}</span>)}</span> : <span className="tag tag-ok">Todo en orden</span>;
}

async function Contenido({ ctx, mes }: { ctx: AppCtx; mes: string }) {
  const { filas, precios } = await grupoData(ctx, mes, true);
  const sum = (k: keyof FilaGrupo) => filas.reduce((s, f) => s + (f[k] as number), 0);
  const neto = sum("neto"), coste = sum("coste"), netoAnt = sum("netoAnt"), costeAnt = sum("costeAnt");
  const fcG = fc(neto, coste), fcAnt = fc(netoAnt, costeAnt);
  const objetivo = (id: string) => ctx.locales.find((l) => l.id === id)?.fc_objetivo ?? ctx.local.fc_objetivo;
  const tono = (f: FilaGrupo) => { const x = fc(f.neto, f.coste); if (x == null) return ""; const o = objetivo(f.id); return x <= o ? "ok-t" : x <= o + 3 ? "warn-t" : "bad-t"; };
  const ir = (f: FilaGrupo) => f.actual
    ? <span className="tag">Trabajas aquí</span>
    : <button type="submit" name="local" value={f.id} className="btn btn-2 btn-xs">Ir a este local</button>;
  return (
    <>
      <Kpis label="El grupo en el mes elegido">
        <Kpi i={0} label="Ventas netas" value={neto} fmt="eur0" delta={cambio(neto, netoAnt)} vs="vs el mes anterior" sub="sin IVA · todos los locales" />
        <Kpi i={1} label="Margen" value={neto - coste} fmt="eur0" delta={cambio(neto - coste, netoAnt - costeAnt)} vs="vs el mes anterior" sub="ventas menos coste" />
        <Kpi i={2} label="Food cost ponderado" value={fcG} fmt="pct1" delta={fcG != null && fcAnt != null ? fcG - fcAnt : null} deltaSuffix="pp" goodWhenUp={false} vs="vs el mes anterior" hint="Aún sin ventas" />
        <Kpi i={3} label="Compras" value={sum("compras")} fmt="eur0" delta={cambio(sum("compras"), sum("comprasAnt"))} goodWhenUp={false} vs="vs el mes anterior" sub="sin IVA · lo guardado" />
      </Kpis>

      <section className="card" aria-labelledby="h-loc">
        <div className="card-h"><h2 className="h3" id="h-loc">Cada local</h2><span className="muted small">Mismo periodo, mismas cifras</span></div>
        <form action={cambiarLocal}>
          <div className="tbl-wrap pg-wide"><table className="tbl">
            <thead><tr><th>Local</th><th className="r">Ventas netas</th><th className="r">Margen</th><th className="r">Food cost</th><th className="r">Compras</th><th>Atención</th><th /></tr></thead>
            <tbody>{filas.map((f) => (
              <tr key={f.id}>
                <td><b>{f.name}</b></td>
                <td className="r">{eur0(f.neto)}</td><td className="r">{eur0(f.neto - f.coste)}</td>
                <td className="r"><b className={tono(f)}>{fc(f.neto, f.coste) != null ? num(fc(f.neto, f.coste), 1) + " %" : "—"}</b></td>
                <td className="r">{eur0(f.compras)}</td>
                <td><Atencion f={f} /></td><td className="r">{ir(f)}</td>
              </tr>))}</tbody>
          </table></div>
          <div className="list pg-narrow">{filas.map((f) => (
            <div key={f.id} className="grupo-li">
              <div className="grupo-h"><b>{f.name}</b>{ir(f)}</div>
              <dl className="grupo-d">
                <div><dt>Ventas netas</dt><dd>{eur0(f.neto)}</dd></div>
                <div><dt>Margen</dt><dd>{eur0(f.neto - f.coste)}</dd></div>
                <div><dt>Food cost</dt><dd className={tono(f)}>{fc(f.neto, f.coste) != null ? num(fc(f.neto, f.coste), 1) + " %" : "—"}</dd></div>
                <div><dt>Compras</dt><dd>{eur0(f.compras)}</dd></div>
              </dl>
              <Atencion f={f} />
            </div>))}</div>
        </form>
      </section>

      <section className="card" aria-labelledby="h-pre">
        <div className="card-h"><h2 className="h3" id="h-pre">El mismo artículo, a precio distinto</h2><span className="muted small">Lo que pagas en cada local</span></div>
        {precios.length ? (
          <div className="list">{precios.map((p) => (
            <div key={p.name + p.unit} className="li-wrap">
              <div className="li">
                <span className="li-ic"><Icon name="box" /></span>
                <span className="li-main"><b>{p.name}</b><small>{p.precios.map((x) => `${x.local}: ${eur(x.precio)}/${p.unit}`).join(" · ")}</small></span>
                <span className="li-end"><span className={`tag ${p.dif >= 10 ? "tag-bad" : p.dif >= 3 ? "tag-warn" : ""}`}>{p.dif < 0.5 ? "Igual" : `+${num(p.dif, 0)} %`}</span><small>{p.precios[0].local} es más barato</small></span>
              </div>
            </div>))}</div>
        ) : (
          <div className="empty"><span className="li-ic"><Icon name="box" /></span><b>Aún no hay artículos en común</b>
            <p>Cuando compres el mismo artículo (con el mismo nombre y unidad) en dos locales, verás aquí en cuál sale más caro.</p></div>
        )}
      </section>
      <p className="muted small"><Link className="link" href="/cuenta#locales">Gestionar locales</Link></p>
    </>
  );
}
