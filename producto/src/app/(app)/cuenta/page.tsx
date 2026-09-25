import Link from "next/link";
import { Screen } from "@/components/shell/screen";
import { Icon } from "@/components/icons";
import { withTenant } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { ROLE_LABEL } from "@/server/rbac";
import { demoCargado } from "@/server/demo/seed";
import { salir } from "../../(auth)/actions";
import { LocalForm, PerfilForm, PasswordForm, TemaForm, DemoCard, OtrasSesiones, EliminarNegocio } from "./forms";

export const metadata = { title: "Mi local" };

export default async function Cuenta() {
  const ctx = await requireApp();
  const demo = await withTenant(ctx.tenantId, (c) => demoCargado(c, ctx.local.id));
  const canLocal = hasPerm(ctx, "local:editar");
  const local = { name: ctx.local.name, address: ctx.local.address, postal_code: ctx.local.postal_code, ciudad: ctx.local.ciudad, lema: ctx.local.lema,
    iva_venta: ctx.local.iva_venta, fc_objetivo: ctx.local.fc_objetivo, comensales_dia: ctx.local.comensales_dia };
  const exports = ([["articulos", "Artículos", "compras"], ["proveedores", "Proveedores", "compras"], ["compras", "Compras", "compras"],
    ["escandallos", "Escandallos", "escandallos"], ["ventas", "Ventas", "ventas"]] as const).filter(([, , p]) => hasPerm(ctx, p));
  return (
    <Screen title="Mi local" sub={`${ctx.org.name} · tu rol: ${ROLE_LABEL[ctx.role]}`}>
      <div className="two">
        <div className="stack">
          {/* La clave rehace el formulario cuando cambian los datos guardados: nunca se edita (ni se guarda) una copia antigua */}
          <LocalForm key={JSON.stringify(local)} canEdit={canLocal} l={local} />
          <section className="card">
            <div className="card-h"><h2 className="h3">Tu negocio</h2><Link className="linkbtn" href="/alta/briefing?editar=1">Cambiar respuestas</Link></div>
            <p className="muted small">Tipo de negocio, cómo llevas las compras, tu papel y tu objetivo. Ordenan lo que te enseñamos en Hoy.</p>
          </section>
          {hasPerm(ctx, "demo") ? <DemoCard cargado={demo} /> : null}
          {exports.length ? (
            <section className="card" aria-labelledby="h-exp">
              <div className="card-h"><h2 className="h3" id="h-exp">Tus datos</h2></div>
              <p className="muted small">Descárgalos cuando quieras en CSV, listos para abrir en Excel.</p>
              <div className="row-wrap">{exports.map(([tipo, label]) => (
                <a key={tipo} className="btn btn-2 btn-sm" href={`/api/exportar/${tipo}`} download><Icon name="download" size={18} /> {label}</a>))}</div>
            </section>
          ) : null}
        </div>
        <div className="stack">
          <PerfilForm name={ctx.name} email={ctx.email} />
          <PasswordForm />
          <TemaForm actual={ctx.prefs.theme ?? "system"} />
          <section className="card">
            <div className="card-h"><h2 className="h3">Sesión</h2></div>
            <div className="row-wrap">
              <form action={salir}><button className="btn btn-2 btn-sm" type="submit"><Icon name="logout" size={18} /> Salir</button></form>
              <OtrasSesiones />
            </div>
          </section>
          {ctx.role === "propietario" ? <EliminarNegocio nombre={ctx.org.name} /> : null}
        </div>
      </div>
    </Screen>
  );
}
