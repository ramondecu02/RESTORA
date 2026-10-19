// Los locales del negocio: cambiar de uno a otro (en Más y en Mi local) y, en Mi local, añadir otro si el plan lo permite.
import Link from "next/link";
import { Icon } from "@/components/icons";
import { hasPerm, type AppCtx } from "@/server/ctx";
import { localesDe } from "@/lib/planes";
import { cambiarLocal } from "./cuenta/actions";
import { NuevoLocal } from "./cuenta/forms";

export function Locales({ ctx, conAlta = false }: { ctx: AppCtx; conAlta?: boolean }) {
  const tope = localesDe(ctx.org);
  const puedeAnadir = conAlta && hasPerm(ctx, "local:editar");
  if (ctx.locales.length < 2 && !puedeAnadir) return null;
  return (
    <section className="card" id="locales" aria-labelledby="h-locales">
      <div className="card-h"><h2 className="h3" id="h-locales">Tus locales</h2><span className="tag">{ctx.locales.length} de {tope}</span></div>
      {ctx.locales.length > 1 ? (
        <form className="more-list" action={cambiarLocal}>{ctx.locales.map((l) => l.id === ctx.local.id ? (
          <div key={l.id} className="more-i" aria-current="true"><span className="li-ic"><Icon name="store" /></span><span className="li-main"><b>{l.name}</b><small>Trabajas aquí</small></span><Icon name="check" size={18} /></div>
        ) : (
          <button key={l.id} className="more-i" type="submit" name="local" value={l.id}><span className="li-ic"><Icon name="store" /></span><span className="li-main"><b>{l.name}</b><small>Cambiar a este local</small></span><Icon name="swap" size={18} /></button>
        ))}</form>
      ) : null}
      {puedeAnadir ? (ctx.locales.length < tope ? <NuevoLocal /> : (
        <p className="muted small">{tope === 1 ? "Tu plan incluye un solo local. Con Pro tienes hasta 2 y con Max hasta 5. " : `Tu plan incluye hasta ${tope} locales y ya los tienes. `}
          <Link className="link" href="/cuenta/facturacion">Ver planes</Link></p>
      )) : null}
    </section>
  );
}
