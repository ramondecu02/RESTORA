// Roles y permisos. Tres roles en V1: propietario, cocina y costes.
export type Role = "propietario" | "cocina" | "costes";
export const ROLES: Role[] = ["propietario", "costes", "cocina"];
export const ROLE_LABEL: Record<Role, string> = { propietario: "Propietario", costes: "Responsable de costes", cocina: "Cocina" };
export const ROLE_DESC: Record<Role, string> = {
  propietario: "Todo, incluidos usuarios y facturación.",
  costes: "Compras, proveedores, escandallos, carta y ventas. No gestiona usuarios ni cobros.",
  cocina: "Sube albaranes, gestiona inventario y escandallos. Ve proveedores sin editarlos; no ve ventas.",
};

export type Perm =
  | "compras" | "inventario" | "escandallos" | "proveedores:editar" | "carta:precios"
  | "ventas" | "local:editar" | "usuarios" | "facturacion" | "demo";

const M: Record<Perm, Role[]> = {
  compras: ["propietario", "costes", "cocina"],
  inventario: ["propietario", "costes", "cocina"],
  escandallos: ["propietario", "costes", "cocina"],
  "proveedores:editar": ["propietario", "costes"],
  "carta:precios": ["propietario", "costes"],
  ventas: ["propietario", "costes"],
  "local:editar": ["propietario"],
  usuarios: ["propietario"],
  facturacion: ["propietario"],
  demo: ["propietario"],
};
export const can = (role: Role | null | undefined, p: Perm) => !!role && M[p].includes(role);
export const isRole = (r: unknown): r is Role => r === "propietario" || r === "cocina" || r === "costes";
