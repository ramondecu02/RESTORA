import type { ReactNode } from "react";
import { AppFrame } from "@/components/ui/frame";
import { SideNav } from "@/components/shell/side";
import { Tabs } from "@/components/shell/tabs";
import { AddSheet, Fab } from "@/components/shell/add";
import { buildNav } from "@/components/shell/nav";
import { requireApp } from "@/server/ctx";
import { navBadges } from "@/server/queries/badges";
import { ROLE_LABEL, can } from "@/server/rbac";
import { initials } from "@/lib/format";
import { avisoPlan } from "@/server/billing";
import Link from "next/link";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireApp();
  const b = await navBadges(ctx);
  const items = buildNav(ctx.role, b);
  const aviso = avisoPlan(ctx.org);
  return (
    <AppFrame>
      <div className="scr appx">
        <SideNav items={items} local={ctx.local.name} user={ctx.name} roleLabel={ROLE_LABEL[ctx.role]} initials={initials(ctx.name)} />
        <div className="main">
          {aviso ? (
            <div className="planbar" role="status">
              <span>{aviso}</span>
              {can(ctx.role, "facturacion") ? <Link href="/cuenta/facturacion">Ver planes</Link> : <span className="muted">Avisa a quien lleva la cuenta.</span>}
            </div>
          ) : null}
          {children}
          <Tabs badges={{ hoy: b.avisos, compras: b.revisar + b.bajo, esc: b.fuera, carta: 0, mas: 0 }} />
          <Fab />
        </div>
      </div>
      <AddSheet canVentas={can(ctx.role, "ventas")} />
    </AppFrame>
  );
}
