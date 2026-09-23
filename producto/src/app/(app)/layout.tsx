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

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireApp();
  const b = await navBadges(ctx);
  const items = buildNav(ctx.role, b);
  return (
    <AppFrame>
      <div className="scr appx">
        <SideNav items={items} local={ctx.local.name} user={ctx.name} roleLabel={ROLE_LABEL[ctx.role]} initials={initials(ctx.name)} />
        <div className="main">
          {children}
          <Tabs badges={{ hoy: b.avisos, compras: b.revisar + b.bajo, esc: b.fuera, carta: 0, mas: 0 }} />
          <Fab />
        </div>
      </div>
      <AddSheet canVentas={can(ctx.role, "ventas")} />
    </AppFrame>
  );
}
