import Link from "next/link";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { Tour } from "@/components/shell/tour";
import { requireApp } from "@/server/ctx";
import { fechaLarga, capitalize } from "@/lib/format";

export const metadata = { title: "Hoy" };

export default async function Hoy({ searchParams }: { searchParams: Promise<{ tour?: string }> }) {
  const ctx = await requireApp();
  const sp = await searchParams;
  const first = ctx.name.split(/\s+/)[0];
  return (
    <Screen title="Hoy" sub={ctx.local.name} fab>
      <div className="greet"><p>{capitalize(fechaLarga(new Date()))}</p><h2>Hola, {first}</h2></div>
      <section className="hero" data-tour="hero">
        <p className="eyebrow">Tu primer paso</p>
        <h2 className="hero-t">Sube un albarán y en 30 segundos sabrás lo que te cuesta cada ingrediente.</h2>
        <div className="hero-actions"><Link className="btn btn-light" href="/compras/subir"><Icon name="camera" size={18} /> Subir albarán</Link></div>
      </section>
      <Tour k="hoy" show={sp.tour === "1" || !ctx.prefs.seen?.hoy} steps={[
        { sel: '[data-tour="hero"]', h: "Esto es Hoy", p: "Cada día te decimos qué mirar y qué hacer primero. Nunca verás esta pantalla vacía." },
        { sel: ['[data-tour="add-top"]', '[data-tour="add-fab"]'], h: "Todo entra por Añadir", p: "Albaranes y facturas, artículos nuevos, platos y tu carta. Un solo sitio." },
        { sel: ['[data-tour="side"]', '[data-tour="tabs"]'], h: "Tu menú", p: "Compras, Escandallos y el resto. Ves lo que corresponde a tu rol." },
      ]} />
    </Screen>
  );
}
