import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { OnbShell } from "@/components/onb-shell";
import { requireOnboarding } from "@/server/ctx";

export const metadata = { title: "Bienvenida" };

export default async function Bienvenida() {
  const { s, org } = await requireOnboarding();
  if (org.onboardingDone) redirect("/hoy");
  const first = s.name.split(/\s+/)[0];
  return (
    <OnbShell step="negocio" foot={
      <div className="foot-in">
        <div className="foot-note"><Icon name="info" /><span>Preparamos {org.name} en 6 preguntas rápidas.</span></div>
        <div className="foot-btns"><Link className="btn" href="/alta/briefing">Empezar · 2 minutos</Link></div>
      </div>
    }>
      <div className="wel">
        <div className="wel-hero">
          <p className="eyebrow">Hola{first ? `, ${first}` : ""}</p>
          <h1>Cada plato tiene un coste real. Vamos a verlo.</h1>
          <p>RESTORA lee tus albaranes, pone al día el precio de cada ingrediente y te dice qué platos te hacen ganar dinero y cuáles no. Tú no tecleas: confirmas lo que hemos leído.</p>
        </div>
        <ul className="wel-list">
          <li><span className="wl-ic"><Icon name="camera" /></span><div><b>Una foto al albarán</b><span>Los precios de compra quedan al día, sin teclear.</span></div></li>
          <li><span className="wl-ic"><Icon name="book" /></span><div><b>Escandallos vivos</b><span>Si sube un ingrediente, el coste del plato se recalcula solo.</span></div></li>
          <li><span className="wl-ic"><Icon name="truck" /></span><div><b>Proveedores comparados</b><span>Ves quién te vende más barato y cuánto ahorrarías al año.</span></div></li>
        </ul>
      </div>
    </OnbShell>
  );
}
