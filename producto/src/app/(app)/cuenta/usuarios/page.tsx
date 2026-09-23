import { redirect } from "next/navigation";
import { Screen } from "@/components/shell/screen";
import { all, sys } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { ROLE_DESC, ROLE_LABEL, ROLES } from "@/server/rbac";
import { Equipo } from "./equipo";

export const metadata = { title: "Usuarios y roles" };

export default async function Usuarios() {
  const ctx = await requireApp();
  if (!hasPerm(ctx, "usuarios")) redirect("/cuenta");
  const data = await sys(async (c) => ({
    miembros: await all<{ user_id: string; name: string; email: string; role: string; created_at: Date }>(c, "select m.user_id, u.name, u.email, m.role, m.created_at from memberships m join users u on u.id = m.user_id where m.org_id = $1 order by m.created_at", [ctx.tenantId]),
    invit: await all<{ id: string; email: string; role: string; expires_at: Date }>(c, "select id, email, role, expires_at from invitations where org_id = $1 and accepted_at is null and expires_at > now() order by created_at desc", [ctx.tenantId]),
  }));
  return (
    <Screen title="Usuarios y roles" sub="Quién entra y qué puede hacer" back="/cuenta">
      <Equipo me={ctx.userId} miembros={data.miembros.map((m) => ({ id: m.user_id, name: m.name, email: m.email, role: m.role }))}
        invit={data.invit.map((i) => ({ id: i.id, email: i.email, role: i.role, expires: new Date(i.expires_at).toISOString() }))}
        roles={ROLES.map((r) => ({ id: r, label: ROLE_LABEL[r], desc: ROLE_DESC[r] }))} />
    </Screen>
  );
}
