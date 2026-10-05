import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { Esqueleto } from "@/components/ui/esqueleto";
import { all, withTenant } from "@/server/db";
import { requireApp, hasPerm, type AppCtx } from "@/server/ctx";
import { dishStats } from "@/server/domain/carta";
import { histVentas } from "@/server/queries/historico";
import { eur, fechaNum, ultimosMeses } from "@/lib/format";
import { VentasBoard } from "./board";
import { BorrarImport } from "./borrar";

export const metadata = { title: "Ventas y rentabilidad" };

export default async function Ventas() {
  // Primero la sesión, el plan y el permiso (si toca, redirige antes de enviar nada); después el contenido, que llega con su esqueleto
  const ctx = await requireApp();
  if (!hasPerm(ctx, "ventas")) redirect("/hoy");
  return (
    <Screen title="Ventas y rentabilidad" sub="Qué platos te sostienen y cuáles te cuestan dinero"
      actions={<Link className="btn btn-sm only-wide" href="/ventas/importar"><Icon name="upload" size={18} /> Importar ventas</Link>}>
      <Suspense fallback={<Esqueleto kpis={4} filas={6} texto="Cargando tus ventas…" />}><VentasContenido ctx={ctx} /></Suspense>
    </Screen>
  );
}

async function VentasContenido({ ctx }: { ctx: AppCtx }) {
  const data = await withTenant(ctx.tenantId, async (c) => {
    const s = await dishStats(c, ctx.local);
    const hist = await histVentas(c, ctx.local.id);
    const imps = await all<{ id: string; filename: string; desde: string | null; hasta: string | null; filas: number; total: number; created_at: Date; demo: boolean }>(c,
      "select id, filename, desde, hasta, filas, total, created_at, demo from ventas_importes where local_id = $1 order by desde desc nulls last, created_at desc limit 12", [ctx.local.id]);
    // Una reventa enlazada a un artículo toma el coste de él: en la tabla no se edita la compra.
    return { stats: s.stats.filter((x) => x.en_carta).map((x) => ({ ...x, conLineas: !!s.ctx.recetas.get(x.id)?.lineas.length })), imps, hist };
  });
  const mesAnt = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15).toLocaleDateString("es-ES", { month: "long" });
  return (
    <>
      <VentasBoard stats={data.stats.map((s) => ({ id: s.id, name: s.name, familia: s.familia, reventa: s.reventa, pvp: s.pvp, iva: s.iva, coste: s.coste, ventas: s.ventas, fcObjetivo: s.fcObjetivo, conLineas: s.conLineas }))}
        comensales={ctx.local.comensales_dia} canPrecios={hasPerm(ctx, "carta:precios")} hist={data.hist} meses={ultimosMeses(6)} mesAnt={mesAnt} fcObjetivo={ctx.local.fc_objetivo} />
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
    </>
  );
}
