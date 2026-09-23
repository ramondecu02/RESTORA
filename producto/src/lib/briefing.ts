// Opciones del briefing inicial (las mismas del flujo aprobado).
export const TIPOS = ["Restaurante", "Bar o cafetería", "Hotel o colectividades", "Catering u obrador", "Grupo con varios locales", "Otro"];
export const PLATOS = ["Menos de 15", "15 a 40", "40 a 80", "Más de 80"];
export const COMPRAS: [string, string, string][] = [
  ["excel", "Excel u hoja de cálculo", "Alguien pasa los albaranes a mano"],
  ["papel", "Papel y carpeta", "Se guardan, pero no se analizan"],
  ["programa", "Un programa de gestión", "ERP o software de compras"],
  ["nada", "No llevo control", "Voy de memoria"],
];
export const TPVS = ["Ninguno o caja registradora", "Glop", "Revo", "Ágora", "Cuiner", "Square", "Otro"];
export const ROLES_BRIEF: [string, string][] = [["prop", "Propietario/a"], ["cocina", "Jefe/a de cocina"], ["costes", "Gestor/a de costes"], ["otro", "Otro"]];
export const ROLE_HINT: Record<string, string> = {
  prop: "Ves todo: compras, escandallos, ventas y la cuenta.",
  cocina: "Te enseñamos primero compras y escandallos.",
  costes: "Te enseñamos primero compras, ventas y escandallos.",
  otro: "Ves todo. Puedes cambiarlo cuando quieras.",
};
export const OBJ: [string, string][] = [
  ["margen", "Saber qué platos ganan dinero"],
  ["prov", "Controlar lo que me cobran los proveedores"],
  ["carta", "Tener los costes de la carta al día"],
  ["teclear", "Dejar de teclear albaranes"],
];
export const PROV_TIPOS = ["Fruta y verdura", "Carnes", "Pescados", "Bebidas", "Distribución general", "Lácteos y quesos", "Limpieza", "Otro"];
export const FAMILIAS = ["Entrantes", "Principales", "Pescados", "Carnes", "Arroces", "Postres", "Menús", "Vinos", "Cervezas", "Refrescos", "Bebidas", "Cafés", "Otros"];
/** Orden de las familias en la carta; las desconocidas van al final por orden alfabético. */
export const FAMILIA_ORDEN = ["Entrantes", "Principales", "Pescados", "Carnes", "Arroces", "Postres", "Menús", "Vinos", "Cervezas", "Refrescos", "Bebidas", "Cafés", "Otros"];
export const famRank = (f: string) => { const i = FAMILIA_ORDEN.indexOf(f); return i < 0 ? 90 : i; };
export const BEBIDAS = new Set(["Vinos", "Cervezas", "Refrescos", "Bebidas", "Cafés"]);
