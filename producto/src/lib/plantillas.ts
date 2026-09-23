// Plantillas de escandallo con ingredientes del catálogo base: el primer dato útil tras el primer albarán.
import type { LineUnit } from "./units";

export type Plantilla = { key: string; name: string; familia: string; raciones: number; pvp: number; lineas: { cat: string; q: number; u: LineUnit }[] };

export const PLANTILLAS: Plantilla[] = [
  { key: "tortilla", name: "Tortilla de patatas", familia: "Entrantes", raciones: 8, pvp: 2.5, lineas: [
    { cat: "patata-agria", q: 1000, u: "g" }, { cat: "huevo-campero-l", q: 8, u: "ud" }, { cat: "cebolla-dulce", q: 200, u: "g" }, { cat: "aceite-oliva-ve", q: 200, u: "ml" }, { cat: "sal-marina", q: 10, u: "g" }] },
  { key: "ensalada", name: "Ensalada de tomate con vinagreta", familia: "Entrantes", raciones: 1, pvp: 8.5, lineas: [
    { cat: "tomate-pera", q: 300, u: "g" }, { cat: "cebolla-dulce", q: 40, u: "g" }, { cat: "lechuga-romana", q: 0.25, u: "ud" }, { cat: "aceite-oliva-ve", q: 25, u: "ml" }, { cat: "vinagre-jerez", q: 8, u: "ml" }, { cat: "sal-marina", q: 2, u: "g" }] },
  { key: "pollo", name: "Pollo asado con patatas", familia: "Principales", raciones: 1, pvp: 12.5, lineas: [
    { cat: "pollo-entero", q: 600, u: "g" }, { cat: "patata-agria", q: 250, u: "g" }, { cat: "limon", q: 50, u: "g" }, { cat: "aceite-oliva-ve", q: 20, u: "ml" }, { cat: "sal-marina", q: 5, u: "g" }] },
  { key: "bravas", name: "Patatas bravas", familia: "Entrantes", raciones: 1, pvp: 6.5, lineas: [
    { cat: "patata-agria", q: 350, u: "g" }, { cat: "aceite-oliva-ve", q: 40, u: "ml" }, { cat: "tomate-triturado", q: 60, u: "g" }, { cat: "pimenton-picante", q: 3, u: "g" }, { cat: "ajo", q: 5, u: "g" }] },
  { key: "gazpacho", name: "Gazpacho andaluz", familia: "Entrantes", raciones: 1, pvp: 6.5, lineas: [
    { cat: "tomate-pera", q: 250, u: "g" }, { cat: "pepino", q: 50, u: "g" }, { cat: "pimiento-verde", q: 30, u: "g" }, { cat: "ajo", q: 3, u: "g" }, { cat: "aceite-oliva-ve", q: 30, u: "ml" }, { cat: "vinagre-jerez", q: 10, u: "ml" }, { cat: "pan-barra", q: 30, u: "g" }] },
  { key: "crema", name: "Crema catalana", familia: "Postres", raciones: 1, pvp: 6.5, lineas: [
    { cat: "leche-entera", q: 150, u: "ml" }, { cat: "huevo-campero-l", q: 1.5, u: "ud" }, { cat: "azucar", q: 35, u: "g" }, { cat: "limon", q: 5, u: "g" }, { cat: "canela", q: 1, u: "g" }] },
];
