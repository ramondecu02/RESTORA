import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { all, withTenant } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { dishStats } from "@/server/domain/carta";
import { eur, fechaNum } from "@/lib/format";
import { VentasBoard } from "./board";
import { BorrarImport } from "./borrar";

export const metadata = { title: "Ventas y rentabilidad" };

export default async function Ventas() {
  const ctx = await requireApp();
  if (!hasPerm(ctx, "ventas")) redirect("/hoy");
  const data = await withTenant(ctx.tenantId, async (c) => {
    const s = await dishStats(c, ctx.local);
    const imps = await all<{ id: string; filename: string; desde: string | null; hasta: string | null; filas: number; total: number; created_at: Date; demo: boolean }>(c,
      "select id, filename, desde, hasta, filas, total, created_at, demo from ventas_importes where local_id = $1 order by desde desc nulls last, created_at desc limit 12", [ctx.local.id]);
    return { stats: s.stats.filter((x) => x.en_carta), imps };
  });
  return (
    <Screen title="Ventas y rentabilidad" sub="Qué platos te sostienen y cuáles te cuestan dinero"
      actions={<Link className="btn btn-sm only-wide" href="/ventas/importar"><Icon name="upload" size={18} /> Importar ventas</Link>}>
      <VentasBoard stats={data.stats.map((s) => ({ id: s.id, name: s.name, familia: s.familia, reventa: s.reventa, pvp: s.pvp, iva: s.iva, coste: s.coste, ventas: s.ventas, fcObjetivo: s.fcObjetivo }))}
        comensales={ctx.local.comensales_dia} canPrecios={hasPerm(ctx, "carta:precios")} />
      <section className="card" aria-labelledby="h-imp">
        <div className="card-h"><h2 className="h3" id="h-imp">Ventas importadas</h2><Link className="btn btn-2 btn-xs" href="/ventas/importar"><Icon name="upload" size={16} /> Importar CSV</Link></div>
        {data.imps.length ? <div className="list">{data.imps.map((i) => (
          <div className="li" key={i.id}>
            <span className="li-ic"><Icon name="sheet" /></span>
            <span className="li-main"><b>{i.filename || "Ventas"}</b><small>{fechaNum(i.desde)} – {fechaNum(i.hasta)} · {i.filas} líneas{i.demo ? " · ejemplo" : ""}</small></span>
            <span className="li-end"><b>{eur(i.total)}</b></span>
            <BorrarImport id={i.id} />
          </div>))}</div>
          : <p className="muted small">Exporta las ventas de tu TPV en CSV (producto, unidades e importe) y súbelas: las unidades de cada plato se actualizan y el inventario descuenta lo vendido. Mientras tanto, puedes poner las unidades al mes a mano en la tabla.</p>}
      </section>
    </Screen>
  );
}
