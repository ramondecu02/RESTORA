// Cambio de negocio para quien pertenece a varios (en Más y en Mi local).
import { Icon } from "@/components/icons";
import { userOrgs } from "@/server/ctx";
import { ROLE_LABEL } from "@/server/rbac";
import { cambiarNegocio } from "../(auth)/actions";

export async function Negocios({ userId, actual }: { userId: string; actual: string }) {
  const orgs = await userOrgs(userId);
  if (orgs.length < 2) return null;
  return (
    <section className="card">
      <p className="eyebrow">Tus negocios</p>
      <form className="more-list" action={cambiarNegocio}>{orgs.map((o) => o.id === actual ? (
        <div key={o.id} className="more-i" aria-current="true"><span className="li-ic"><Icon name="store" /></span><span className="li-main"><b>{o.name}</b><small>{ROLE_LABEL[o.role]} · estás aquí</small></span><Icon name="check" size={18} /></div>
      ) : (
        <button key={o.id} className="more-i" type="submit" name="org" value={o.id}><span className="li-ic"><Icon name="store" /></span><span className="li-main"><b>{o.name}</b><small>{ROLE_LABEL[o.role]}</small></span><Icon name="swap" size={18} /></button>
      ))}</form>
    </section>
  );
}
