import { describe, expect, it } from "vitest";
import {
  agruparVentas, contarTickets, diasPeriodo, errorVentas, esIdTicket, fechaIsoValida, guessMapping, leerVentas, MAX_FILAS, ordenFechas,
  parseCsv, parseFechaEs, periodoPorDefecto, type FilaVenta,
} from "@/lib/csv";

const leer = (csv: string) => { const p = parseCsv(csv); return leerVentas(p.rows, p.mapping!); };

describe("CSV de ventas: columna del importe", () => {
  const imp = (h: string[], rows: string[][] = []) => guessMapping(h, rows)?.importe;
  it("no confunde punto, canal, tipo o fecha de venta con el importe", () => {
    expect(imp(["Punto de venta", "Fecha", "Producto", "Unidades", "Importe"])).toBe(4);
    expect(imp(["Fecha venta", "Producto", "Unidades", "Importe"])).toBe(3);
    expect(imp(["Canal de venta", "Producto", "Cantidad", "Importe"])).toBe(3);
    expect(imp(["Centro de venta", "Fecha", "Producto", "Unidades", "Importe"])).toBe(4);
    expect(imp(["Fecha", "Tipo de venta", "Producto", "Unidades", "Importe"])).toBe(4);
  });
  it("prefiere el total con IVA al neto y no toma el precio unitario", () => {
    expect(imp(["Producto", "Precio", "Unidades", "Importe neto", "Importe total"])).toBe(4);
    expect(imp(["Producto", "Precio venta", "Unidades", "Importe"])).toBe(3);
    expect(imp(["Producto", "Cantidad", "Precio", "Subtotal", "Total"])).toBe(4);
    expect(imp(["Producto", "Unidades", "Base imponible", "Total IVA", "Total con IVA"])).toBe(4);
  });
  it("si solo hay neto, lo usa como último recurso", () => expect(imp(["Producto", "Unidades", "Importe neto"])).toBe(2));
  it("descarta columnas sin números", () => {
    expect(imp(["Producto", "Ventas", "Importe"], [["Paella", "Sala", "12,00"], ["Tarta", "Terraza", "5,50"]])).toBe(2);
  });
  it("lee el importe correcto de punta a punta", () => {
    expect(leer("Punto de venta;Fecha;Producto;Unidades;Importe\nLocal Centro;01/09/2026;Hamburguesa;10;150,00\n").rows[0]).toMatchObject({ unidades: 10, importe: 150 });
    expect(leer("Producto;Precio;Unidades;Importe neto;Importe total\nHamburguesa;15,00;10;136,36;150,00\n").rows[0].importe).toBe(150);
  });
});

describe("CSV de ventas: tickets y comensales", () => {
  const csv = "Fecha;Nº Ticket;Producto;Cantidad;Importe\n01/08/2026;10234;Croquetas;2;12,00\n01/08/2026;10234;Bravas;1;6,50\n01/08/2026;10235;Croquetas;1;6,00\n02/08/2026;10236;Tarta;1;5,50\n";
  it("un número de ticket se cuenta, no se suma", () => {
    const p = parseCsv(csv);
    expect(p.mapping).toMatchObject({ fecha: 0, producto: 2, unidades: 3, importe: 4, tickets: 1 });
    expect(contarTickets(leerVentas(p.rows, p.mapping!).rows, p.headers[1])).toEqual({ n: 3, porId: true });
  });
  it("el mismo número en días distintos son tickets distintos", () => {
    const r = leer("Fecha;Ticket;Producto;Unidades\n01/08/2026;1;A;1\n02/08/2026;1;A;1\n02/08/2026;1;B;1\n");
    expect(contarTickets(r.rows, "Ticket")).toEqual({ n: 2, porId: true });
  });
  it("una cifra de comensales se suma", () => {
    const p = parseCsv("Fecha;Producto;Unidades;Comensales\n01/08/2026;Menú;40;40\n02/08/2026;Menú;35;35\n");
    expect(p.mapping!.tickets).toBe(3);
    expect(contarTickets(leerVentas(p.rows, p.mapping!).rows, "Comensales")).toEqual({ n: 75, porId: false });
  });
  it("códigos no numéricos se cuentan como tickets", () => {
    const r = leer("Producto;Unidades;Tickets\nA;1;T-1\nB;1;T-1\nC;1;T-2\n");
    expect(contarTickets(r.rows, "Tickets")).toEqual({ n: 2, porId: true });
  });
  it("reconoce las cabeceras de número de ticket", () => {
    expect(esIdTicket("Nº Ticket")).toBe(true);
    expect(esIdTicket("Id ticket")).toBe(true);
    expect(esIdTicket("Nº de tickets")).toBe(false);
    expect(esIdTicket("Nº comensales")).toBe(false);
    expect(guessMapping(["Producto", "Unidades", "Ticket medio"], [])?.tickets).toBeNull();
    expect(guessMapping(["Producto", "Unidades", "Total ticket", "Importe"], [])).toMatchObject({ importe: 3, tickets: null });
  });
});

describe("CSV de ventas: fechas", () => {
  it("solo acepta fechas que existen", () => {
    expect(parseFechaEs("31/02/2024")).toBeNull();
    expect(parseFechaEs("09/23/2024")).toBeNull();
    expect(parseFechaEs("2024-13-01")).toBeNull();
    expect(parseFechaEs("29/02/2024")).toBe("2024-02-29");
    expect(parseFechaEs("1/9/26")).toBe("2026-09-01");
    expect(parseFechaEs("2024/09/01")).toBe("2024-09-01");
    expect(parseFechaEs("01.09.2026 13:45")).toBe("2026-09-01");
    expect(fechaIsoValida("2024-02-30")).toBe(false);
    expect(fechaIsoValida("2026-09-01")).toBe(true);
  });
  it("detecta el formato mes/día de EE. UU.", () => {
    expect(ordenFechas(["09/23/2024", "09/01/2024"])).toBe("mdy");
    expect(ordenFechas(["23/09/2024", "09/01/2024"])).toBe("dmy");
    expect(ordenFechas(["01/02/2024", "03/04/2024"])).toBe("dmy");
    expect(parseFechaEs("09/23/2024", "mdy")).toBe("2024-09-23");
    const r = leer("Date;Item;Qty\n09/01/2024;Burger;3\n09/12/2024;Burger;2\n09/30/2024;Burger;1\n");
    expect(r.orden).toBe("mdy");
    expect(r.rows.map((x) => x.fecha)).toEqual(["2024-09-01", "2024-09-12", "2024-09-30"]);
  });
  it("deja fuera y cuenta las filas con una fecha que no se entiende", () => {
    const r = leer("Fecha;Producto;Unidades\n01/09/2026;Paella;3\n31/02/2026;Paella;2\n;Paella;1\n");
    expect(r.fechasNoValidas).toBe(1);
    expect(r.rows.map((x) => x.fecha)).toEqual(["2026-09-01", null]);
  });
});

describe("CSV de ventas: unidades, devoluciones y periodo", () => {
  it("sin columna de unidades no inventa 1 por fila", () => {
    const r = leer("Fecha;Producto;Importe\n01/09/2026;Lubina a la brasa;240\n30/09/2026;Lubina a la brasa;480\n");
    expect(r.rows.map((x) => x.unidades)).toEqual([null, null]);
    expect(agruparVentas(r.rows).filas).toEqual([[0, "2026-09-01", null, 240], [0, "2026-09-30", null, 480]]);
  });
  it("las devoluciones y anulaciones restan", () => {
    const r = leer("Producto;Unidades;Importe\nPaella;5;60\nPaella;-1;-12\nTarta;1;5\nTarta;-1;-5\n");
    expect(r.rows).toHaveLength(4);
    expect(agruparVentas(r.rows)).toEqual({ productos: ["Paella", "Tarta"], filas: [[0, null, 4, 48]] });
  });
  it("periodo por defecto: el mes anterior sin fechas, el día si hay una", () => {
    expect(periodoPorDefecto([], "2026-09-25")).toEqual({ desde: "2026-08-01", hasta: "2026-08-31" });
    expect(periodoPorDefecto([], "2026-01-10")).toEqual({ desde: "2025-12-01", hasta: "2025-12-31" });
    expect(periodoPorDefecto(["2026-09-30"], "2026-10-02")).toEqual({ desde: "2026-09-30", hasta: "2026-09-30" });
    expect(diasPeriodo("2026-08-01", "2026-08-31")).toBe(31);
    expect(diasPeriodo("2026-03-01", "2026-03-31")).toBe(31);
    expect(diasPeriodo("2026-09-30", "2026-09-30")).toBe(1);
  });
});

describe("CSV de ventas: envío al servidor", () => {
  it("junta cada producto y día, con los nombres normalizados", () => {
    const r = leer("Fecha;Producto;Unidades;Importe\n01/09/2026;Lubina a la brasa;1;24\n01/09/2026;LUBINA A LA BRASA;2;48\n02/09/2026;Lubina a la brasa;1;24\n01/09/2026;Caña;0,1;0,2\n01/09/2026;Caña;0,2;0,1\n");
    const g = agruparVentas(r.rows);
    expect(g.productos).toEqual(["Lubina a la brasa", "Caña"]);
    expect(g.filas).toEqual([[0, "2026-09-01", 3, 72], [0, "2026-09-02", 1, 24], [1, "2026-09-01", 0.3, 0.3]]);
  });
  it("no mezcla filas con y sin unidades", () => {
    const r = leer("Producto;Unidades;Importe\nPaella;2;24\nPaella;;12\n");
    expect(agruparVentas(r.rows).filas).toEqual([[0, null, 2, 24], [0, null, null, 12]]);
  });
  it("un año de ventas por producto y día cabe en un envío", () => {
    const lines = ["Fecha;Producto;Unidades;Importe"];
    for (let d = 0; d < 82; d++) for (let p = 0; p < 370; p++) lines.push(`${String((d % 28) + 1).padStart(2, "0")}/${String(Math.floor(d / 28) + 1).padStart(2, "0")}/2026;Producto de la carta número ${p};${(p % 7) + 1};${((p % 7) + 1) * 12.5}`);
    const g = agruparVentas(leer(lines.join("\n")).rows);
    expect(g.filas.length).toBe(82 * 370);
    expect(new TextEncoder().encode(JSON.stringify(g)).length).toBeLessThan(1_500_000);
    expect(errorVentas(g.productos, g.filas)).toBeNull();
  });
  it("el servidor rechaza datos que no cuadran", () => {
    const ok: FilaVenta[] = [[0, "2026-09-01", 2, 24]];
    expect(errorVentas(["Paella"], ok)).toBeNull();
    expect(errorVentas(["Paella"], [])).toBe("No hay filas que importar.");
    expect(errorVentas(["Paella"], [[0, "2024-23-09", 1, 1]])).toMatch(/fecha/);
    expect(errorVentas(["Paella"], [[1, null, 1, 1]])).toBe("Datos no válidos.");
    expect(errorVentas(["Paella"], [[0, null, Number.NaN, 1]])).toMatch(/no son válidos/);
    expect(errorVentas(["Paella"], [{ producto: "Paella" }])).toBe("Datos no válidos.");
    expect(errorVentas("Paella", ok)).toBe("Datos no válidos.");
    expect(errorVentas(["Paella"], Array.from({ length: MAX_FILAS + 1 }, () => ok[0]))).toMatch(/demasiado grande/);
  });
});
