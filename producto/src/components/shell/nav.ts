// Menú de la app según rol, con contadores (lo que pide atención).
import type { IconName } from "../icons";
import type { Role } from "@/server/rbac";

export type NavItem = { href: string; label: string; icon: IconName; badge?: number; ro?: boolean; match?: string[] } | { group: string };
export type Badges = { revisar: number; fuera: number; bajo: number; avisos: number };

export function buildNav(role: Role, b: Badges): NavItem[] {
  const cocina = role === "cocina", prop = role === "propietario";
  const it: NavItem[] = [
    { href: "/hoy", label: "Hoy", icon: "home", match: ["/hoy"] },
    { href: "/hoy/avisos", label: "Avisos", icon: "bell", badge: b.avisos },
    { group: "Compras" },
    { href: "/compras", label: "Albaranes y facturas", icon: "receipt", badge: b.revisar, match: ["/compras"] },
    { href: "/articulos", label: "Artículos", icon: "box", match: ["/articulos"] },
    { href: "/proveedores", label: "Proveedores", icon: "truck", ro: cocina, match: ["/proveedores"] },
    { href: "/inventario", label: "Inventario y pedidos", icon: "cart", badge: b.bajo, match: ["/inventario"] },
    { group: "Escandallos" },
    { href: "/escandallos", label: "Platos y márgenes", icon: "book", badge: b.fuera, match: ["/escandallos"] },
    { href: "/escandallos/elaboraciones", label: "Elaboraciones", icon: "layers", match: ["/escandallos/elaboraciones"] },
    { href: "/carta", label: "Carta", icon: "grid", match: ["/carta"] },
  ];
  if (!cocina) it.push({ group: "Ventas" }, { href: "/ventas", label: "Ventas y rentabilidad", icon: "chart", match: ["/ventas"] });
  it.push({ group: "Cuenta" }, { href: "/cuenta", label: "Mi local", icon: "store", ro: !prop, match: ["/cuenta"] });
  if (prop) it.push({ href: "/cuenta/usuarios", label: "Usuarios y roles", icon: "users", match: ["/cuenta/usuarios"] }, { href: "/cuenta/facturacion", label: "Facturación", icon: "card", match: ["/cuenta/facturacion"] });
  return it;
}

/** El elemento activo es el de coincidencia más larga con la ruta actual. */
export function activeHref(items: NavItem[], path: string): string | null {
  let best: string | null = null, len = -1;
  for (const i of items) {
    if ("group" in i) continue;
    for (const m of i.match ?? [i.href]) {
      if ((path === m || path.startsWith(m + "/")) && m.length > len) { best = i.href; len = m.length; }
    }
  }
  return best;
}

export const TABS: { key: string; href: string; label: string; icon: IconName; prefixes: string[] }[] = [
  { key: "hoy", href: "/hoy", label: "Hoy", icon: "home", prefixes: ["/hoy"] },
  { key: "compras", href: "/compras", label: "Compras", icon: "receipt", prefixes: ["/compras", "/articulos", "/proveedores", "/inventario"] },
  { key: "esc", href: "/escandallos", label: "Escandallos", icon: "book", prefixes: ["/escandallos"] },
  { key: "carta", href: "/carta", label: "Carta", icon: "grid", prefixes: ["/carta"] },
  { key: "mas", href: "/mas", label: "Más", icon: "more", prefixes: ["/mas", "/ventas", "/cuenta"] },
];
