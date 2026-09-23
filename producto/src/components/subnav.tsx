// Subnavegación en móvil (en escritorio la hace el menú lateral).
import Link from "next/link";

const COMPRAS = [["albaranes", "/compras", "Albaranes"], ["articulos", "/articulos", "Artículos"], ["proveedores", "/proveedores", "Proveedores"], ["inventario", "/inventario", "Inventario"]] as const;
const ESC = [["platos", "/escandallos", "Platos"], ["elaboraciones", "/escandallos/elaboraciones", "Elaboraciones"], ["carta", "/carta", "Carta"]] as const;

function Seg({ items, cur, label }: { items: readonly (readonly [string, string, string])[]; cur: string; label: string }) {
  return (
    <nav className="seg subnav" aria-label={label} data-tour="seg">
      {items.map(([k, href, l]) => <Link key={k} href={href} className={cur === k ? "is-on" : ""} aria-current={cur === k ? "page" : undefined}>{l}</Link>)}
    </nav>
  );
}
export const ComprasNav = ({ cur }: { cur: string }) => <Seg items={COMPRAS} cur={cur} label="Secciones de compras" />;
export const EscNav = ({ cur }: { cur: string }) => <Seg items={ESC} cur={cur} label="Secciones de escandallos" />;
