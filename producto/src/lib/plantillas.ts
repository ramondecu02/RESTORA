// Plantillas de escandallo con ingredientes del catálogo base: el primer dato útil tras el primer albarán.
// Cantidades orientativas por el nº de raciones indicado. Unidades según la del catálogo: peso en g, volumen en ml, unidades en ud.
import type { LineUnit } from "./units";

export type Plantilla = { key: string; name: string; familia: string; raciones: number; pvp: number; lineas: { cat: string; q: number; u: LineUnit }[] };

export const PLANTILLAS: Plantilla[] = [
  // ---- Entrantes y para compartir ----
  { key: "tortilla", name: "Tortilla de patatas", familia: "Entrantes", raciones: 8, pvp: 2.5, lineas: [
    { cat: "patata-agria", q: 1000, u: "g" }, { cat: "huevo-campero-l", q: 8, u: "ud" }, { cat: "cebolla-dulce", q: 200, u: "g" }, { cat: "aceite-oliva-ve", q: 200, u: "ml" }, { cat: "sal-marina", q: 10, u: "g" }] },
  { key: "ensalada", name: "Ensalada de tomate con vinagreta", familia: "Entrantes", raciones: 1, pvp: 8.5, lineas: [
    { cat: "tomate-pera", q: 300, u: "g" }, { cat: "cebolla-dulce", q: 40, u: "g" }, { cat: "lechuga-romana", q: 0.25, u: "ud" }, { cat: "aceite-oliva-ve", q: 25, u: "ml" }, { cat: "vinagre-jerez", q: 8, u: "ml" }, { cat: "sal-marina", q: 2, u: "g" }] },
  { key: "cesar", name: "Ensalada César", familia: "Entrantes", raciones: 1, pvp: 10.5, lineas: [
    { cat: "lechuga-romana", q: 1, u: "ud" }, { cat: "pechuga-pollo", q: 120, u: "g" }, { cat: "parmesano", q: 25, u: "g" }, { cat: "pan-barra", q: 0.15, u: "ud" }, { cat: "mayonesa", q: 30, u: "g" }, { cat: "anchoa", q: 10, u: "g" }] },
  { key: "bravas", name: "Patatas bravas", familia: "Entrantes", raciones: 1, pvp: 6.5, lineas: [
    { cat: "patata-agria", q: 350, u: "g" }, { cat: "aceite-oliva-ve", q: 40, u: "ml" }, { cat: "tomate-triturado", q: 60, u: "g" }, { cat: "pimenton-picante", q: 3, u: "g" }, { cat: "ajo", q: 5, u: "g" }] },
  { key: "gazpacho", name: "Gazpacho andaluz", familia: "Entrantes", raciones: 1, pvp: 6.5, lineas: [
    { cat: "tomate-pera", q: 250, u: "g" }, { cat: "pepino", q: 50, u: "g" }, { cat: "pimiento-verde", q: 30, u: "g" }, { cat: "ajo", q: 3, u: "g" }, { cat: "aceite-oliva-ve", q: 30, u: "ml" }, { cat: "vinagre-jerez", q: 10, u: "ml" }, { cat: "pan-barra", q: 0.12, u: "ud" }] },
  { key: "croquetas", name: "Croquetas de jamón", familia: "Entrantes", raciones: 6, pvp: 7, lineas: [
    { cat: "leche-entera", q: 1000, u: "ml" }, { cat: "harina-trigo", q: 120, u: "g" }, { cat: "mantequilla", q: 100, u: "g" }, { cat: "jamon-serrano", q: 200, u: "g" }, { cat: "cebolla", q: 100, u: "g" }, { cat: "huevo-campero-l", q: 2, u: "ud" }, { cat: "pan-rallado", q: 150, u: "g" }, { cat: "aceite-girasol", q: 300, u: "ml" }] },
  { key: "ensaladilla", name: "Ensaladilla rusa", familia: "Entrantes", raciones: 4, pvp: 6.5, lineas: [
    { cat: "patata", q: 600, u: "g" }, { cat: "zanahoria", q: 120, u: "g" }, { cat: "guisante-cong", q: 100, u: "g" }, { cat: "atun-aceite", q: 120, u: "g" }, { cat: "huevo-campero-l", q: 2, u: "ud" }, { cat: "mayonesa", q: 200, u: "g" }, { cat: "aceituna-verde", q: 40, u: "g" }] },
  { key: "gambas-ajillo", name: "Gambas al ajillo", familia: "Entrantes", raciones: 1, pvp: 12, lineas: [
    { cat: "gamba-blanca", q: 150, u: "g" }, { cat: "ajo", q: 10, u: "g" }, { cat: "aceite-oliva-ve", q: 40, u: "ml" }, { cat: "guindilla", q: 2, u: "g" }, { cat: "perejil", q: 0.05, u: "ud" }] },
  { key: "calamares", name: "Calamares a la romana", familia: "Entrantes", raciones: 1, pvp: 11, lineas: [
    { cat: "calamar", q: 200, u: "g" }, { cat: "harina-trigo", q: 60, u: "g" }, { cat: "huevo-campero-l", q: 1, u: "ud" }, { cat: "aceite-girasol", q: 80, u: "ml" }, { cat: "limon", q: 40, u: "g" }] },
  { key: "pulpo", name: "Pulpo a la gallega", familia: "Entrantes", raciones: 1, pvp: 16, lineas: [
    { cat: "pulpo", q: 200, u: "g" }, { cat: "patata", q: 150, u: "g" }, { cat: "aceite-oliva-ve", q: 20, u: "ml" }, { cat: "pimenton-dulce", q: 4, u: "g" }, { cat: "sal-escamas", q: 3, u: "g" }] },
  { key: "pan-tomate", name: "Pan con tomate", familia: "Entrantes", raciones: 1, pvp: 3.5, lineas: [
    { cat: "pan-barra", q: 0.5, u: "ud" }, { cat: "tomate-rama", q: 100, u: "g" }, { cat: "aceite-oliva-ve", q: 15, u: "ml" }, { cat: "ajo", q: 3, u: "g" }, { cat: "sal-marina", q: 2, u: "g" }] },

  // ---- Arroces ----
  { key: "paella-marisco", name: "Paella de marisco", familia: "Arroces", raciones: 2, pvp: 19, lineas: [
    { cat: "arroz-bomba", q: 180, u: "g" }, { cat: "gamba-blanca", q: 150, u: "g" }, { cat: "mejillon", q: 200, u: "g" }, { cat: "calamar", q: 150, u: "g" }, { cat: "caldo-pescado", q: 500, u: "ml" }, { cat: "tomate-triturado", q: 80, u: "g" }, { cat: "pimiento-rojo", q: 60, u: "g" }, { cat: "ajo", q: 8, u: "g" }, { cat: "azafran", q: 0.3, u: "g" }, { cat: "aceite-oliva-ve", q: 40, u: "ml" }] },
  { key: "paella-mixta", name: "Paella mixta", familia: "Arroces", raciones: 2, pvp: 17, lineas: [
    { cat: "arroz-bomba", q: 180, u: "g" }, { cat: "contramuslo-pollo", q: 250, u: "g" }, { cat: "gamba-blanca", q: 120, u: "g" }, { cat: "calamar", q: 120, u: "g" }, { cat: "judia-verde", q: 80, u: "g" }, { cat: "tomate-triturado", q: 80, u: "g" }, { cat: "caldo-pollo", q: 500, u: "ml" }, { cat: "pimiento-rojo", q: 60, u: "g" }, { cat: "azafran", q: 0.3, u: "g" }, { cat: "aceite-oliva-ve", q: 40, u: "ml" }] },
  { key: "arroz-negro", name: "Arroz negro", familia: "Arroces", raciones: 2, pvp: 18, lineas: [
    { cat: "arroz-bomba", q: 180, u: "g" }, { cat: "sepia", q: 200, u: "g" }, { cat: "calamar", q: 120, u: "g" }, { cat: "caldo-pescado", q: 500, u: "ml" }, { cat: "tomate-triturado", q: 80, u: "g" }, { cat: "ajo", q: 8, u: "g" }, { cat: "aceite-oliva-ve", q: 40, u: "ml" }] },
  { key: "risotto", name: "Risotto de setas", familia: "Arroces", raciones: 1, pvp: 13, lineas: [
    { cat: "arroz-redondo", q: 90, u: "g" }, { cat: "setas-variadas", q: 120, u: "g" }, { cat: "caldo-pollo", q: 300, u: "ml" }, { cat: "parmesano", q: 25, u: "g" }, { cat: "mantequilla", q: 20, u: "g" }, { cat: "cebolla", q: 40, u: "g" }, { cat: "vino-cocina", q: 40, u: "ml" }, { cat: "aceite-oliva-ve", q: 10, u: "ml" }] },

  // ---- Pescados ----
  { key: "lubina", name: "Lubina a la plancha", familia: "Pescados", raciones: 1, pvp: 22, lineas: [
    { cat: "lubina", q: 350, u: "g" }, { cat: "patata", q: 150, u: "g" }, { cat: "aceite-oliva-ve", q: 20, u: "ml" }, { cat: "limon", q: 30, u: "g" }, { cat: "sal-marina", q: 3, u: "g" }] },
  { key: "dorada", name: "Dorada a la plancha", familia: "Pescados", raciones: 1, pvp: 18, lineas: [
    { cat: "dorada", q: 350, u: "g" }, { cat: "patata", q: 150, u: "g" }, { cat: "aceite-oliva-ve", q: 20, u: "ml" }, { cat: "ajo", q: 5, u: "g" }, { cat: "perejil", q: 0.05, u: "ud" }] },
  { key: "salmon", name: "Salmón a la plancha", familia: "Pescados", raciones: 1, pvp: 17, lineas: [
    { cat: "salmon", q: 200, u: "g" }, { cat: "aceite-oliva-ve", q: 15, u: "ml" }, { cat: "limon", q: 30, u: "g" }, { cat: "sal-escamas", q: 3, u: "g" }] },
  { key: "bacalao-pilpil", name: "Bacalao al pil pil", familia: "Pescados", raciones: 1, pvp: 19, lineas: [
    { cat: "bacalao-desalado", q: 200, u: "g" }, { cat: "aceite-oliva-ve", q: 80, u: "ml" }, { cat: "ajo", q: 10, u: "g" }, { cat: "guindilla", q: 2, u: "g" }] },
  { key: "merluza-romana", name: "Merluza a la romana", familia: "Pescados", raciones: 1, pvp: 16, lineas: [
    { cat: "merluza", q: 200, u: "g" }, { cat: "harina-trigo", q: 50, u: "g" }, { cat: "huevo-campero-l", q: 1, u: "ud" }, { cat: "aceite-girasol", q: 80, u: "ml" }, { cat: "limon", q: 30, u: "g" }] },

  // ---- Carnes ----
  { key: "pollo", name: "Pollo asado con patatas", familia: "Carnes", raciones: 1, pvp: 12.5, lineas: [
    { cat: "pollo-entero", q: 600, u: "g" }, { cat: "patata-agria", q: 250, u: "g" }, { cat: "limon", q: 50, u: "g" }, { cat: "aceite-oliva-ve", q: 20, u: "ml" }, { cat: "sal-marina", q: 5, u: "g" }] },
  { key: "entrecot", name: "Entrecot a la parrilla", familia: "Carnes", raciones: 1, pvp: 22, lineas: [
    { cat: "entrecot", q: 300, u: "g" }, { cat: "patata", q: 150, u: "g" }, { cat: "aceite-oliva-ve", q: 15, u: "ml" }, { cat: "sal-escamas", q: 4, u: "g" }] },
  { key: "solomillo", name: "Solomillo de ternera", familia: "Carnes", raciones: 1, pvp: 26, lineas: [
    { cat: "solomillo-ternera", q: 220, u: "g" }, { cat: "patata", q: 150, u: "g" }, { cat: "aceite-oliva-ve", q: 15, u: "ml" }, { cat: "sal-escamas", q: 4, u: "g" }] },
  { key: "secreto", name: "Secreto ibérico", familia: "Carnes", raciones: 1, pvp: 18, lineas: [
    { cat: "secreto-iberico", q: 250, u: "g" }, { cat: "pimiento-padron", q: 100, u: "g" }, { cat: "aceite-oliva-ve", q: 15, u: "ml" }, { cat: "sal-escamas", q: 4, u: "g" }] },
  { key: "hamburguesa", name: "Hamburguesa completa", familia: "Carnes", raciones: 1, pvp: 13.5, lineas: [
    { cat: "hamburguesa-ternera", q: 1, u: "ud" }, { cat: "pan-hamburguesa", q: 1, u: "ud" }, { cat: "queso-semicurado", q: 30, u: "g" }, { cat: "bacon", q: 30, u: "g" }, { cat: "lechuga-iceberg", q: 0.1, u: "ud" }, { cat: "tomate-rama", q: 40, u: "g" }, { cat: "cebolla", q: 30, u: "g" }, { cat: "patatas-fritas-cong", q: 150, u: "g" }] },
  { key: "carrillera", name: "Carrillera al vino tinto", familia: "Carnes", raciones: 1, pvp: 16, lineas: [
    { cat: "carrillera", q: 300, u: "g" }, { cat: "vino-cocina", q: 120, u: "ml" }, { cat: "cebolla", q: 80, u: "g" }, { cat: "zanahoria", q: 60, u: "g" }, { cat: "caldo-pollo", q: 200, u: "ml" }, { cat: "harina-trigo", q: 15, u: "g" }, { cat: "aceite-oliva-ve", q: 15, u: "ml" }] },
  { key: "costillas", name: "Costillas a la barbacoa", familia: "Carnes", raciones: 1, pvp: 15, lineas: [
    { cat: "costilla-cerdo", q: 400, u: "g" }, { cat: "salsa-barbacoa", q: 60, u: "g" }, { cat: "patata", q: 150, u: "g" }] },

  // ---- Pastas (van en Principales) ----
  { key: "carbonara", name: "Espaguetis carbonara", familia: "Principales", raciones: 1, pvp: 12, lineas: [
    { cat: "espagueti", q: 100, u: "g" }, { cat: "panceta", q: 60, u: "g" }, { cat: "huevo-campero-l", q: 1, u: "ud" }, { cat: "parmesano", q: 30, u: "g" }, { cat: "nata-cocinar", q: 40, u: "ml" }, { cat: "pimienta-negra", q: 1, u: "g" }] },
  { key: "bolonesa", name: "Espaguetis a la boloñesa", familia: "Principales", raciones: 1, pvp: 11.5, lineas: [
    { cat: "espagueti", q: 100, u: "g" }, { cat: "carne-picada-ternera", q: 120, u: "g" }, { cat: "tomate-triturado", q: 120, u: "g" }, { cat: "cebolla", q: 50, u: "g" }, { cat: "zanahoria", q: 40, u: "g" }, { cat: "ajo", q: 5, u: "g" }, { cat: "aceite-oliva-ve", q: 15, u: "ml" }] },
  { key: "lasana", name: "Lasaña de carne", familia: "Principales", raciones: 1, pvp: 12.5, lineas: [
    { cat: "lasana", q: 80, u: "g" }, { cat: "carne-picada-mixta", q: 120, u: "g" }, { cat: "tomate-triturado", q: 100, u: "g" }, { cat: "leche-entera", q: 150, u: "ml" }, { cat: "harina-trigo", q: 15, u: "g" }, { cat: "mantequilla", q: 15, u: "g" }, { cat: "queso-rallado", q: 40, u: "g" }, { cat: "cebolla", q: 40, u: "g" }] },
  { key: "macarrones", name: "Macarrones con chorizo", familia: "Principales", raciones: 1, pvp: 10, lineas: [
    { cat: "macarron", q: 100, u: "g" }, { cat: "tomate-frito", q: 120, u: "g" }, { cat: "chorizo", q: 60, u: "g" }, { cat: "queso-rallado", q: 30, u: "g" }] },

  // ---- Postres ----
  { key: "crema", name: "Crema catalana", familia: "Postres", raciones: 1, pvp: 6.5, lineas: [
    { cat: "leche-entera", q: 150, u: "ml" }, { cat: "huevo-campero-l", q: 1.5, u: "ud" }, { cat: "azucar", q: 35, u: "g" }, { cat: "limon", q: 5, u: "g" }, { cat: "canela", q: 1, u: "g" }] },
  { key: "tarta-queso", name: "Tarta de queso", familia: "Postres", raciones: 8, pvp: 6, lineas: [
    { cat: "queso-crema", q: 600, u: "g" }, { cat: "nata-montar", q: 200, u: "ml" }, { cat: "huevo-campero-l", q: 3, u: "ud" }, { cat: "azucar", q: 150, u: "g" }, { cat: "harina-trigo", q: 30, u: "g" }] },
  { key: "flan", name: "Flan de huevo", familia: "Postres", raciones: 6, pvp: 5, lineas: [
    { cat: "leche-entera", q: 500, u: "ml" }, { cat: "huevo-campero-l", q: 4, u: "ud" }, { cat: "azucar", q: 150, u: "g" }] },
  { key: "tiramisu", name: "Tiramisú", familia: "Postres", raciones: 6, pvp: 6.5, lineas: [
    { cat: "queso-crema", q: 400, u: "g" }, { cat: "nata-montar", q: 150, u: "ml" }, { cat: "huevo-campero-l", q: 3, u: "ud" }, { cat: "azucar", q: 100, u: "g" }, { cat: "cafe-molido", q: 20, u: "g" }, { cat: "cacao-polvo", q: 15, u: "g" }] },
  { key: "natillas", name: "Natillas caseras", familia: "Postres", raciones: 4, pvp: 5, lineas: [
    { cat: "leche-entera", q: 500, u: "ml" }, { cat: "huevo-campero-l", q: 3, u: "ud" }, { cat: "azucar", q: 100, u: "g" }, { cat: "canela", q: 2, u: "g" }] },
];
