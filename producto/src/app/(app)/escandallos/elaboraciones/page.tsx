import Link from "next/link";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { EscNav } from "@/components/subnav";
import { all, withTenant } from "@/server/db";
import { requireApp } from "@/server/ctx";
import { loadCostContext } from "@/server/domain/costs";
import { recetaCost } from "@/lib/costing";
import { eur, qty, plural } from "@/lib/format";

export const metadata = { title: "Elaboraciones" };

export default async function Elaboraciones() {
  const ctx = await requireApp();
  const data = await withTenant(ctx.tenantId, async (c) => {
    const l = await loadCostContext(c, ctx.local.id);
    // Solo cuentan las recetas vivas de este local: archivar un plato no borra sus líneas
    const usos = await all<{ subreceta_id: string; n: number }>(c, `select l.subreceta_id, count(distinct l.receta_id)::int as n from receta_lineas l join recetas r on r.id = l.receta_id
      where l.subreceta_id is not null and r.local_id = $1 and not r.archived group by 1`, [ctx.local.id]);
    return { ...l, usos: new Map(usos.map((u) => [u.subreceta_id, u.n])) };
  });
  const elabs = data.recetas.filter((r) => r.tipo === "elaboracion");
  return (
    <Screen title="Elaboraciones" sub="Salsas, fondos, masas y bases que usas en varios platos" fab
      actions={<Link className="btn btn-2 btn-sm only-wide" href="/escandallos/nuevo?tipo=elaboracion"><Icon name="plus" size={18} /> Nueva elaboración</Link>}>
      <EscNav cur="elaboraciones" />
      <section className="card">
        {elabs.length ? <div className="list">{elabs.map((r) => {
          const c = recetaCost(r.id, data.ctx);
          return (
            <Link key={r.id} className="li" href={`/escandallos/${r.id}`}>
              <span className="li-ic"><Icon name="layers" /></span>
              <span className="li-main"><b>{r.name}</b><small>{r.familia ? `${r.familia} · ` : ""}rinde {qty(r.rinde)} {r.rinde_unit} · {plural(c.lines.length, "ingrediente", "ingredientes")}{c.missing ? " · faltan precios" : ""}</small></span>
              <span className="li-end"><b>{c.vacio ? "—" : `${eur(c.perUnit)}/${r.rinde_unit}`}</b><small>{data.usos.get(r.id) ? `en ${plural(data.usos.get(r.id)!, "plato", "platos")}` : "sin usar"}</small></span>
            </Link>);
        })}</div> : <div className="empty"><span className="li-ic"><Icon name="layers" /></span><b>Sin elaboraciones</b><p>Crea tus salsas, fondos o masas una vez y úsalas como ingrediente en cualquier plato.</p>
          <div className="empty-actions"><Link className="btn" href="/escandallos/nuevo?tipo=elaboracion"><Icon name="plus" size={18} /> Nueva elaboración</Link></div></div>}
      </section>
      <Link className="btn btn-2 only-narrow" href="/escandallos/nuevo?tipo=elaboracion"><Icon name="plus" size={18} /> Nueva elaboración</Link>
    </Screen>
  );
}
