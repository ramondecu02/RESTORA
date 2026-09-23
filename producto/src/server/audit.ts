import type { Db } from "./db";
export async function audit(c: Db, tenantId: string, userId: string | null, action: string, entity: string, entityId: string | null, data: Record<string, unknown> = {}) {
  await c.query("insert into audit_log (tenant_id, user_id, action, entity, entity_id, data) values ($1,$2,$3,$4,$5,$6)",
    [tenantId, userId, action, entity, entityId, JSON.stringify(data)]);
}
