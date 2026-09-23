import { withTenant } from "@/server/db";
import { requireApp } from "@/server/ctx";
import { dishStats } from "@/server/domain/carta";
import { famRank } from "@/lib/briefing";
import { eur } from "@/lib/format";
import { PrintButton } from "./print-button";

export const metadata = { title: "Carta imprimible" };

export default async function Imprimir() {
  const ctx = await requireApp();
  const { stats } = await withTenant(ctx.tenantId, (c) => dishStats(c, ctx.local));
  const list = stats.filter((s) => s.en_carta && s.pvp);
  const fams = new Map<string, typeof list>();
  for (const s of list) fams.set(s.familia || "Otros", [...(fams.get(s.familia || "Otros") ?? []), s]);
  const orden = [...fams.keys()].sort((a, b) => famRank(a) - famRank(b) || a.localeCompare(b));
  return (
    <main className="printpage">
      <div className="printbar"><span className="grow">Vista previa de tu carta con los precios actuales. Solo aparecen los platos en carta con precio.</span><PrintButton /></div>
      <article className="menu-sheet">
        <header className="menu-h"><h1>{ctx.local.name}</h1>{ctx.local.ciudad || ctx.local.lema ? <p>{[ctx.local.ciudad, ctx.local.lema].filter(Boolean).join(" · ")}</p> : null}</header>
        {orden.map((f) => (
          <section className="menu-fam" key={f}>
            <h2>{f}</h2>
            {fams.get(f)!.sort((a, b) => a.orden - b.orden || a.name.localeCompare(b.name)).map((s) => (
              <div key={s.id}>
                <div className="menu-it"><b>{s.name}</b><i /><span>{eur(s.pvp)}</span></div>
                {s.descripcion ? <p className="menu-d">{s.descripcion}</p> : null}
              </div>
            ))}
          </section>
        ))}
        {!orden.length ? <p style={{ textAlign: "center", color: "#6E6B5F" }}>Aún no hay platos con precio en tu carta.</p> : null}
        <p className="menu-f">IVA incluido · Carta generada con RESTORA</p>
      </article>
    </main>
  );
}
