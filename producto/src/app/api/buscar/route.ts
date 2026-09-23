import { NextResponse, type NextRequest } from "next/server";
import { all, withTenant } from "@/server/db";
import { getAppCtx } from "@/server/ctx";

export async function GET(req: NextRequest) {
  const ctx = await getAppCtx();
  if (!ctx) return NextResponse.json({ error: "no_session" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ items: [] });
  const like = "%" + q.replace(/[%_\\]/g, (m) => "\\" + m) + "%";
  const items = await withTenant(ctx.tenantId, (c) => all<{ href: string; label: string; kind: string }>(c, `
    (select '/articulos/' || id as href, name as label, 'Artículo' as kind from articulos where local_id = $1 and not archived and (name ilike $2 or array_to_string(aliases, ' ') ilike $2) order by name limit 6)
    union all
    (select '/escandallos/' || id, name, case when tipo = 'elaboracion' then 'Elaboración' when reventa then 'Reventa' else 'Plato' end from recetas where local_id = $1 and not archived and name ilike $2 order by name limit 6)
    union all
    (select '/proveedores/' || id, name, 'Proveedor' from proveedores where local_id = $1 and not archived and name ilike $2 order by name limit 4)`,
    [ctx.local.id, like]));
  return NextResponse.json({ items: items.slice(0, 12) });
}
