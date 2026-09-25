import Link from "next/link";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { EscNav } from "@/components/subnav";
import { PhotoButton } from "@/components/photo-button";
import { one, withTenant } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { dishStats } from "@/server/domain/carta";
import { estadoFC, foodCost, neto } from "@/lib/costing";
import { famRank } from "@/lib/briefing";
import { fotoUrl } from "@/lib/fotos";
import { eur, pct, qty, plural, fecha } from "@/lib/format";

export const metadata = { title: "Carta" };

export default async function Carta({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const ctx = await requireApp();
  const sp = await searchParams;
  const data = await withTenant(ctx.tenantId, async (c) => {
    const s = await dishStats(c, ctx.local);
    const ref = await one<{ id: string; created_at: Date; storage_key: string; mime: string }>(c, `select d.id, d.created_at, a.storage_key, a.mime from documentos d join documento_archivos a on a.documento_id = d.id
      where d.local_id = $1 and d.kind = 'carta' and d.status = 'guardado' order by d.created_at desc, a.idx limit 1`, [ctx.local.id]);
    return { stats: s.stats.filter((x) => x.en_carta), ref };
  });
  const fams = new Map<string, typeof data.stats>();
  for (const s of data.stats) fams.set(s.familia || "Otros", [...(fams.get(s.familia || "Otros") ?? []), s]);
  const orden = [...fams.keys()].sort((a, b) => famRank(a) - famRank(b) || a.localeCompare(b));
  const canEsc = hasPerm(ctx, "escandallos");
  const fam = sp.f && fams.has(sp.f) ? sp.f : null;
  const byOrden = (a: (typeof data.stats)[number], b: (typeof data.stats)[number]) => a.orden - b.orden || a.name.localeCompare(b.name);
  const shown = fam ? [...fams.get(fam)!].sort(byOrden) : orden.flatMap((f) => [...fams.get(f)!].sort(byOrden));
  return (
    <Screen title="Carta" sub="Tu carta, con la rentabilidad de cada plato" fab>
      <EscNav cur="carta" />
      <section className="carta-banner">
        <img src="/demo/carta.webp" alt="" />
        <div>
          <h2>La carta de {ctx.local.name}</h2>
          <p>{plural(data.stats.length, "producto", "productos")} · cada uno con su rentabilidad real detrás</p>
          <div className="row-wrap">
            {canEsc ? <Link className="btn btn-light btn-sm" href="/carta/subir"><Icon name="image" size={18} /> Subir carta</Link> : null}
            <Link className="btn btn-ghost-light btn-sm" href="/carta/imprimir" target="_blank"><Icon name="printer" size={18} /> Carta imprimible</Link>
            {canEsc ? <Link className="btn btn-ghost-light btn-sm" href="/escandallos/nuevo"><Icon name="plus" size={18} /> Nuevo producto</Link> : null}
          </div>
        </div>
      </section>
      {data.ref ? (
        <a className="card carta-ref" href={"/api/archivos/" + data.ref.storage_key} target="_blank" rel="noopener" style={{ flexDirection: "row", color: "inherit", textDecoration: "none" }}>
          <span className="li-ic">{data.ref.mime.startsWith("image/") ? <img src={"/api/archivos/" + data.ref.storage_key} alt="" /> : <Icon name="file" />}</span>
          <span className="li-main"><b>Carta subida el {fecha(new Date(data.ref.created_at).toISOString(), { day: "numeric", month: "long" })}</b><small>Referencia para transcribir · toca para abrirla</small></span>
        </a>
      ) : null}
      {orden.length ? (
        <section className="stack-sm" aria-label="Productos de la carta">
          {orden.length > 1 ? (
            <div className="chips" role="list" aria-label="Filtrar por familia">
              <Link role="listitem" className={`chip ${!fam ? "is-on" : ""}`} href="/carta" aria-current={!fam ? "page" : undefined}>Toda la carta <span className="cnt">{data.stats.length}</span></Link>
              {orden.map((f) => <Link role="listitem" key={f} className={`chip ${fam === f ? "is-on" : ""}`} href={`/carta?f=${encodeURIComponent(f)}`} aria-current={fam === f ? "page" : undefined}>{f} <span className="cnt">{fams.get(f)!.length}</span></Link>)}
            </div>
          ) : null}
          <div className="dishgrid">
            {shown.map((s) => {
              // Sin escandallo (o sin coste de compra en reventa) no hay food cost ni margen: nada de «0 % coste»
              const fc = s.sinCoste ? null : foodCost(s.coste, s.pvp, ctx.local.iva_venta);
              const est = estadoFC(fc, s.fcObjetivo);
              const m = s.pvp && !s.sinCoste ? neto(s.pvp, ctx.local.iva_venta) - s.coste : null;
              const url = fotoUrl(s.foto_key);
              return (
                <article key={s.id} className="dishcard">
                  <div className="dishcard-ph">
                    {url ? <img src={url} alt="" loading="lazy" /> : <span className="dishcard-ini" aria-hidden="true">{s.name[0]?.toUpperCase()}</span>}
                    <span className={`dishcard-fc tag ${est.estado === "ok" ? "tag-ok" : est.estado === "warn" ? "tag-warn" : est.estado === "crit" ? "tag-bad" : "tag-none"}`}>{fc != null ? `${pct(fc, 0)} coste` : !s.pvp ? "Sin PVP" : s.reventa ? "Sin coste" : "Sin escandallo"}</span>
                    {canEsc ? <PhotoButton recetaId={s.id} className="dishcard-cam" label={`Cambiar foto de ${s.name}`}><Icon name="camera" size={18} /></PhotoButton> : null}
                  </div>
                  <div className="dishcard-b">
                    <div><div className="dishcard-n">{s.name}</div><div className="dishcard-f">{s.familia}{s.reventa ? " · reventa" : ""}{(s.missing || s.sinCoste) && !s.reventa ? " · faltan ingredientes" : ""}</div></div>
                    <div className="dishcard-pvp">{eur(s.pvp)}</div>
                    <div className="dishcard-m">{m != null ? `${eur(m)} margen` : "—"} · {qty(s.ventas, 0)} uds</div>
                    <div className="dishcard-acts">
                      <Link className="btn btn-2 btn-xs" href={`/escandallos/${s.id}`}>{s.reventa ? "Editar precio" : "Escandallo"}</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="card"><div className="empty"><span className="li-ic"><Icon name="grid" /></span><b>Tu carta está vacía</b>
          <p>Sube una foto de tu carta y creamos los platos con su precio, o añádelos uno a uno.</p>
          <div className="empty-actions"><Link className="btn" href="/carta/subir"><Icon name="image" size={18} /> Subir carta</Link><Link className="btn btn-2" href="/escandallos/nuevo">Nuevo producto</Link></div></div></div>
      )}
    </Screen>
  );
}
