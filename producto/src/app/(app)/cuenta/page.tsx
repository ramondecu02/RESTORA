import Link from "next/link";
import { Screen } from "@/components/shell/screen";
import { Icon } from "@/components/icons";
import { Atencion, porGravedad, type Foco } from "@/components/ui/atencion";
import { Kpi, Kpis, type KpiProps } from "@/components/ui/kpi";
import { one, sys, withTenant } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { ROLE_LABEL } from "@/server/rbac";
import { demoCargado } from "@/server/demo/seed";
import { bloqueado, estadoPlan } from "@/server/plan";
import { fecha, plural } from "@/lib/format";
import { salir } from "../../(auth)/actions";
import { Negocios } from "../negocios";
import { LocalForm, PerfilForm, PasswordForm, TemaForm, DemoCard, OtrasSesiones, EliminarNegocio } from "./forms";

export const metadata = { title: "Mi local" };
/** Por qué está limitado el acceso (el mismo motivo que enseña /bloqueado). */
const MOTIVO: Record<string, string> = {
  terminada: "Tu prueba gratuita ha terminado.",
  cancelada: "Tu suscripción está cancelada.",
  impago: "No hemos podido cobrar tu suscripción y el acceso está limitado.",
};

export default async function Cuenta() {
  const ctx = await requireApp({ permitirBloqueo: true });
  // Lo tuyo, sin contar el restaurante de ejemplo
  const { demo, mio } = await withTenant(ctx.tenantId, async (c) => ({
    demo: await demoCargado(c, ctx.local.id),
    mio: (await one<{ compras: number; proveedores: number; articulos: number }>(c,
      `select (select count(*)::int from documentos where local_id = $1 and status = 'guardado' and not demo) as compras,
              (select count(*)::int from proveedores where local_id = $1 and not archived and not demo) as proveedores,
              (select count(*)::int from articulos where local_id = $1 and not archived and not demo) as articulos`, [ctx.local.id]))!,
  }));
  const equipo = (await sys((c) => one<{ miembros: number; invitaciones: number }>(c,
    `select (select count(*)::int from memberships where org_id = $1) as miembros,
            (select count(*)::int from invitations where org_id = $1 and accepted_at is null and expires_at > now()) as invitaciones`, [ctx.tenantId])))!;
  const canLocal = hasPerm(ctx, "local:editar");
  const local = { name: ctx.local.name, address: ctx.local.address, postal_code: ctx.local.postal_code, ciudad: ctx.local.ciudad, lema: ctx.local.lema,
    iva_venta: ctx.local.iva_venta, fc_objetivo: ctx.local.fc_objetivo, comensales_dia: ctx.local.comensales_dia };
  const exports = ([["articulos", "Artículos", "compras"], ["proveedores", "Proveedores", "compras"], ["compras", "Compras", "compras"],
    ["escandallos", "Escandallos", "escandallos"], ["ventas", "Ventas", "ventas"]] as const).filter(([, , p]) => hasPerm(ctx, p));
  // El plan, con las mismas palabras que Más y Facturación
  const plan = estadoPlan(ctx.org);
  const verPlan = hasPerm(ctx, "facturacion") ? "/cuenta/facturacion" : null;
  const fichaPlan: Omit<KpiProps, "i"> =
    plan.clave === "prueba" && plan.dias != null ? { label: plan.titulo, value: plan.dias, fmt: "int", unit: plan.dias === 1 ? "día" : "días", tone: plan.tono ?? undefined, sub: `hasta el ${fecha(ctx.org.trialEndsAt, { day: "numeric", month: "long" })}`, href: verPlan }
    : plan.clave === "impago" && plan.dias ? { label: "Para actualizar el pago", value: plan.dias, fmt: "int", unit: plan.dias === 1 ? "día" : "días", tone: "bad", sub: "antes de que se bloquee el acceso", href: verPlan }
    : { label: plan.titulo, value: null, fmt: "int", text: { prueba: "En marcha", terminada: "Terminada", activa: "Activa", impago: "Pendiente", cancelada: "Cancelada" }[plan.clave],
        tone: plan.tono ?? undefined, sub: { prueba: "sin fecha de fin", terminada: "suscríbete para seguir", activa: "todo en orden", impago: "actualiza la tarjeta", cancelada: "tus datos siguen aquí" }[plan.clave], href: verPlan };

  // Lo que conviene dejar a punto: solo lo que tiene efecto real en la app
  const focos: Foco[] = [];
  if (demo) focos.push({ tono: "warn", ic: "flask", k: "Datos de ejemplo", t: "Tienes el restaurante de ejemplo cargado", p: "Quítalo cuando empieces con tus datos: lo que hayas creado tú se queda.", a: ["Quitarlos", "#demo"] });
  if (canLocal && !ctx.local.postal_code) focos.push({ tono: "info", ic: "pin", k: "Tu local", t: "Falta el código postal", p: "Con él, cuando cinco restaurantes de tu provincia compren un producto, ves el rango de precios que pagan. Es anónimo.", a: ["Añadirlo", "#local"] });
  if (canLocal && ctx.local.comensales_dia == null) focos.push({ tono: "info", ic: "users", k: "Hoy", t: "Sin comensales al día", p: "Con ellos, Hoy calcula el ticket por comensal; sin ellos, usa el ticket por plato vendido.", a: ["Indicarlos", "#local"] });
  if (hasPerm(ctx, "usuarios") && equipo.miembros === 1 && !equipo.invitaciones) focos.push({ tono: "info", ic: "users", k: "Equipo", t: "Hoy solo estás tú", p: "Invita a cocina y a costes con su rol: cada persona ve y toca lo que le corresponde.", a: ["Invitar", "/cuenta/usuarios"] });

  return (
    <Screen title="Mi local" sub={`${ctx.org.name} · tu rol: ${ROLE_LABEL[ctx.role]}`}>
      {bloqueado(ctx.org) ? <div className="note note-warn" role="status"><Icon name="lock" /><p>{MOTIVO[plan.clave] ?? MOTIVO.terminada} Aquí puedes descargar tus datos o borrar el negocio. <Link className="link" href="/bloqueado">Cómo seguir usando RESTORA</Link></p></div> : null}
      <Kpis label="Resumen de tu cuenta">
        <Kpi i={0} {...fichaPlan} />
        <Kpi i={1} label="Tus compras guardadas" value={mio.compras} fmt="int" sub={mio.compras ? `${plural(mio.proveedores, "proveedor", "proveedores")} · ${plural(mio.articulos, "artículo", "artículos")}` : "sube tu primer albarán"}
          href={hasPerm(ctx, "compras") ? (mio.compras ? "/compras" : "/compras/subir") : null} />
        <Kpi i={2} label="Equipo" value={equipo.miembros} fmt="int" unit={equipo.miembros === 1 ? "persona" : "personas"}
          sub={equipo.invitaciones ? `${plural(equipo.invitaciones, "invitación pendiente", "invitaciones pendientes")}` : `tu rol: ${ROLE_LABEL[ctx.role]}`} href={hasPerm(ctx, "usuarios") ? "/cuenta/usuarios" : null} />
        <Kpi i={3} label="Food cost objetivo" value={ctx.local.fc_objetivo} fmt="pct1" sub="el que miden Escandallos y Carta" href="#local" />
      </Kpis>
      <Atencion focos={porGravedad(focos)} titulo="Para dejarlo a punto" id="h-punto" compacta max={4} />
      <div className="two">
        <div className="stack">
          {/* La clave rehace el formulario cuando cambian los datos guardados: nunca se edita (ni se guarda) una copia antigua */}
          <LocalForm key={JSON.stringify(local)} canEdit={canLocal} l={local} />
          <section className="card">
            <div className="card-h"><h2 className="h3">Tu negocio</h2>{ctx.role === "propietario" ? <Link className="linkbtn" href="/alta/briefing?editar=1">Cambiar respuestas</Link> : null}</div>
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
          <Negocios userId={ctx.userId} actual={ctx.org.id} />
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
