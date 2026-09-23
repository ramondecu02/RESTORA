import { all, withTenant } from "../db";

export async function proveedoresAlta(orgId: string) {
  return withTenant(orgId, (c) => all<{ id: string; name: string; tipo: string }>(c, "select id, name, tipo from proveedores where not archived order by created_at"));
}
