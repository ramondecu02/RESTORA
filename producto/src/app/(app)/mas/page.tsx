import Link from "next/link";
import { Screen } from "@/components/shell/screen";
import { Icon } from "@/components/icons";
import { buildNav } from "@/components/shell/nav";
import { requireApp } from "@/server/ctx";
import { navBadges } from "@/server/queries/badges";
import { salir } from "../../(auth)/actions";
import { ThemeQuick } from "./theme";

export const metadata = { title: "Más" };

export default async function Mas() {
  const ctx = await requireApp();
  const b = await navBadges(ctx);
  const items = buildNav(ctx.role, b);
  return (
    <Screen title="Más" sub={ctx.local.name}>
      {(() => {
        const groups: { title: string; items: Exclude<(typeof items)[number], { group: string }>[] }[] = [];
        for (const it of items) { if ("group" in it) groups.push({ title: it.group, items: [] }); else (groups[groups.length - 1] ?? (groups[0] = { title: "General", items: [] })).items.push(it); }
        if (!groups.length || groups[0].title !== "General") groups.unshift({ title: "General", items: items.filter((x) => !("group" in x)).slice(0, 2) as never[] });
        return groups.filter((g) => g.items.length).map((g) => (
          <section className="card" key={g.title}>
            <p className="eyebrow">{g.title}</p>
            <div className="more-list">{g.items.map((it) => (
              <Link key={it.href} className="more-i" href={it.href}><span className="li-ic"><Icon name={it.icon} /></span><span className="li-main"><b>{it.label}</b></span>{it.badge ? <span className="badge">{it.badge}</span> : <Icon name="chevR" size={18} />}</Link>))}</div>
          </section>
        ));
      })()}
      <section className="card"><p className="eyebrow">Apariencia</p><ThemeQuick actual={ctx.prefs.theme ?? "system"} /></section>
      <form action={salir}><button className="btn btn-2 btn-block" type="submit"><Icon name="logout" size={18} /> Salir</button></form>
    </Screen>
  );
}
