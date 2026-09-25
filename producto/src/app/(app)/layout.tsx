import type { ReactNode } from "react";
import { cookies } from "next/headers";
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
import { ThemeSync } from "./mas/theme";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireApp();
  const b = await navBadges(ctx);
  const items = buildNav(ctx.role, b);
  const aviso = avisoPlan(ctx.org);
  // El tema se guarda en la cuenta; si este dispositivo no lo tiene en su cookie (otro navegador, cookies borradas), se le aplica
  const tema = ctx.prefs.theme === "light" || ctx.prefs.theme === "dark" ? ctx.prefs.theme : "system";
  const ck = (await cookies()).get("rs_theme")?.value;
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
      {(ck === "light" || ck === "dark" ? ck : "system") !== tema ? <ThemeSync theme={tema} /> : null}
    </AppFrame>
  );
}
