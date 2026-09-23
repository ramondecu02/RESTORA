import { Screen } from "@/components/shell/screen";
import { Icon } from "@/components/icons";
import { all, withTenant } from "@/server/db";
import { requireApp } from "@/server/ctx";
import { eur, fecha, qty } from "@/lib/format";
import { PedidoAcciones } from "./acciones";

export const metadata = { title: "Pedidos" };
const ESTADO: Record<string, [string, string]> = { borrador: ["Preparado", "tag"], enviado: ["Enviado", "tag tag-warn"], recibido: ["Recibido", "tag tag-ok"], cancelado: ["Cancelado", "tag tag-none"] };

export default async function Pedidos() {
  const ctx = await requireApp();
  const data = await withTenant(ctx.tenantId, async (c) => {
    const peds = await all<{ id: string; estado: string; created_at: Date; enviado_at: Date | null; recibido_at: Date | null; proveedor: string | null; phone: string | null; email: string | null }>(c, `
      select pe.id, pe.estado, pe.created_at, pe.enviado_at, pe.recibido_at, p.name as proveedor, p.phone, p.email from pedidos pe left join proveedores p on p.id = pe.proveedor_id
      where pe.local_id = $1 order by (pe.estado in ('borrador','enviado')) desc, pe.created_at desc limit 40`, [ctx.local.id]);
    const lineas = peds.length ? await all<{ pedido_id: string; name: string; cantidad: number; unidad: string; precio_estimado: number | null }>(c, `
      select pl.pedido_id, a.name, pl.cantidad, pl.unidad, pl.precio_estimado from pedido_lineas pl join articulos a on a.id = pl.articulo_id where pl.pedido_id = any($1::uuid[]) order by a.name`, [peds.map((p) => p.id)]) : [];
    return { peds, lineas };
  });
  return (
    <Screen title="Pedidos" sub="Preparados desde el inventario. Los envías tú." back="/inventario">
      {data.peds.length ? data.peds.map((p) => {
        const ls = data.lineas.filter((l) => l.pedido_id === p.id);
        const total = ls.reduce((s, l) => s + l.cantidad * (l.precio_estimado ?? 0), 0);
        const [label, cls] = ESTADO[p.estado];
        const texto = `Hola, soy de ${ctx.local.name}. Pedido:\n` + ls.map((l) => `- ${l.name}: ${qty(l.cantidad)} ${l.unidad}`).join("\n") + "\nGracias.";
        return (
          <section key={p.id} className="card">
            <div className="card-h"><h2 className="h3">{p.proveedor ?? "Sin proveedor asignado"}</h2><span className={cls}>{label}</span></div>
            <p className="muted small">Creado el {fecha(new Date(p.created_at).toISOString(), { day: "numeric", month: "long" })}{p.recibido_at ? ` · recibido el ${fecha(new Date(p.recibido_at).toISOString())}` : ""} · total estimado {eur(total)}</p>
            <div className="list">{ls.map((l, i) => <div className="li" key={i}><span className="li-main"><b>{l.name}</b></span><span className="li-end"><b>{qty(l.cantidad)} {l.unidad}</b><small>{eur(l.cantidad * (l.precio_estimado ?? 0))}</small></span></div>)}</div>
            {p.estado === "borrador" || p.estado === "enviado" ? <PedidoAcciones id={p.id} estado={p.estado} phone={p.phone} email={p.email} texto={texto} local={ctx.local.name} /> : null}
          </section>
        );
      }) : <div className="card"><div className="empty"><span className="li-ic"><Icon name="cart" /></span><b>Sin pedidos</b><p>Prepáralos desde el inventario con «Preparar pedido»: calculamos lo que falta para cubrir dos semanas.</p></div></div>}
    </Screen>
  );
}
