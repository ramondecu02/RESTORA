// Fugas entre negocios por rutas, ids y acciones (Task 13 / B2 del plan). Complementa rls.mjs (que prueba la base de datos tabla a
// tabla): aquí se ataca la aplicación como lo haría alguien con la sesión del negocio A que conoce, o adivina, los ids del negocio B.
//  1) Rutas con id (páginas y API): la respuesta es 404, con el MISMO cuerpo que para un id que no existe (nunca 403: confirmaría
//     que el id existe), y también sin sesión. B sí ve lo suyo.
//  2) Archivos privados: claves de B, rutas con «..» y variantes codificadas, claves raras en el propio negocio: nunca 200 ni 5xx.
//  3) Búsqueda y exportaciones CSV de A: ni un solo dato de B (marcas únicas), y el número de filas es el de A.
//  4) Acciones de servidor (borrar, guardar, cerrar…): cada una que recibe un id se llama con la sesión de A y los ids de B (y con
//     ids inexistentes): responde igual en los dos casos, no devuelve nada de B y deja los datos de B idénticos (huella de todas
//     sus tablas antes y después). Una acción nueva sin clasificar aquí hace fallar la prueba.
//  5) Invitaciones y cambio de negocio: un usuario de A no puede aceptar la invitación de B (ni reenviando el formulario de la
//     persona invitada), ni cambiar a B, ni aunque la sesión apunte a B en la base de datos.
//  6) Concurrencia: borrar un albarán mientras se importan ventas no deja ventas con el coste congelado de un albarán que ya no
//     existe sin que nadie haya elegido qué hacer con ellas.
import http from "node:http";
import https from "node:https";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { BASE, DB, accionesDelServidor, launch, llamarAccion, negocios, signup, sql, watch } from "./lib.mjs";

const stamp = Date.now();
const CAN = "zq" + stamp.toString(36); // marca que no puede aparecer por casualidad en los datos de otro negocio
let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.log("✗", msg); } };
/** Una sección de la prueba: si algo revienta por dentro (una pantalla que ya no está, un tiempo de espera), se anota como fallo y siguen las demás. */
async function paso(titulo, fn) {
  console.log("\n— " + titulo);
  try { await fn(); } catch (e) { fails++; checks++; console.log(`✗ ${titulo}: error inesperado: ${String(e.message).split("\n")[0]}`); }
}
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(q, params, cond, ms = 15000) {
  const t = Date.now();
  for (;;) {
    const r = await sql(q, params);
    if (cond(r) || Date.now() - t > ms) return r;
    await espera(250);
  }
}
const errores = [];
const b = await launch();
const { A, B } = await negocios(b);
watch(A.page, errores); watch(B.page, errores);
const reqA = A.ctx.request, reqB = B.ctx.request;

// ───────────────────────── Datos: marcas únicas en A y en B ─────────────────────────
/** Pone una marca única en el nombre de un proveedor, un artículo, un plato, una elaboración, un albarán y una venta del negocio, y devuelve sus ids. */
async function marca(t) {
  const k = `${CAN}-${t.tag}`;
  const una = async (q, valor) => (await sql(q, [t.id, valor]))[0]?.id ?? null;
  const ids = {
    prov: await una("update proveedores set name = $2 where id = (select id from proveedores where tenant_id = $1 and not archived order by created_at limit 1) returning id", `${k}-prov`),
    art: await una("update articulos set name = $2 where id = (select id from articulos where tenant_id = $1 and not archived order by created_at limit 1) returning id", `${k}-art`),
    rec: await una("update recetas set name = $2 where id = (select id from recetas where tenant_id = $1 and tipo = 'plato' and not archived order by created_at limit 1) returning id", `${k}-plato`),
    elab: await una("update recetas set name = $2 where id = (select id from recetas where tenant_id = $1 and tipo = 'elaboracion' and not archived order by created_at limit 1) returning id", `${k}-elab`),
    doc: await una("update documentos set numero = $2 where id = (select id from documentos where tenant_id = $1 and kind = 'albaran' and status = 'guardado' order by created_at limit 1) returning id", `${k}-num`),
    venta: await una("update ventas_lineas set nombre = $2 where id = (select id from ventas_lineas where tenant_id = $1 order by fecha limit 1) returning id", `${k}-venta`),
  };
  const uno = async (q) => (await sql(q, [t.id]))[0] ?? {};
  Object.assign(ids, {
    carta: (await uno("select id from documentos where tenant_id = $1 and kind = 'carta' order by created_at limit 1")).id,
    file: (await uno("select storage_key from documento_archivos where tenant_id = $1 order by created_at limit 1")).storage_key,
    pedido: (await uno("select id from pedidos where tenant_id = $1 order by created_at limit 1")).id,
    imp: (await uno("select id from ventas_importes where tenant_id = $1 order by created_at limit 1")).id,
    ev: (await uno("select pe.id from precio_eventos pe where pe.tenant_id = $1 and not exists (select 1 from avisos_estado a where a.evento_id = pe.id) order by pe.fecha desc limit 1")).id,
    evResuelto: (await uno("select evento_id as id from avisos_estado where tenant_id = $1 limit 1")).id,
    user: t.userId,
  });
  ids.elab ??= ids.rec;
  return { ...ids, marca: k };
}
const bIds = await marca(B), aIds = await marca(A);
// Una invitación pendiente de B (su id es lo que A intentará revocar) y un albarán de A por revisar (para las acciones sobre algo propio)
bIds.inv = (await sql(`insert into invitations (org_id, email, role, token_hash, invited_by, expires_at) values ($1, $2, 'cocina', $3, $4, now() + interval '7 days') returning id`,
  [B.id, `pendiente-${CAN}@example.com`, createHash("sha256").update(randomBytes(16)).digest("hex"), B.userId]))[0].id;
aIds.docRevisar = (await sql(`insert into documentos (tenant_id, local_id, kind, status, source, draft, created_by) values ($1, $2, 'albaran', 'revisar', 'manual', $3, $4) returning id`,
  [A.id, A.local, JSON.stringify({ lineas: [] }), A.userId]))[0].id;
for (const [n, ids] of [["A", aIds], ["B", bIds]]) for (const k of ["doc", "carta", "art", "prov", "rec", "elab", "pedido", "imp", "evResuelto", "file"]) ok(ids[k], `${n}: falta ${k} para la prueba (¿los datos de ejemplo no lo crearon?)`);
const fantasma = () => ({ ...Object.fromEntries(Object.keys(bIds).map((k) => [k, randomUUID()])), file: `t/${randomUUID()}/docs/${randomUUID()}/0-fantasma.jpg`, marca: `${CAN}-fantasma` });
console.log(`· marcas «${CAN}» puestas en A y en B; ids de B reunidos`);

// ───────────────────────── Utilidades de comparación ─────────────────────────
/**
 * Cuerpo comparable: sin el id que se pidió y, en el HTML de Next, con las filas de su carga RSC ordenadas (Next las envía en
 * trozos cuyo orden cambia de una petición a otra aunque el contenido sea el mismo).
 */
function canon(cuerpo, ids = []) {
  let t = String(cuerpo);
  for (const id of ids) t = t.split(id).join("<ID>").split(encodeURIComponent(id)).join("<ID>");
  if (!/^\s*<!DOCTYPE html/i.test(t)) return t;
  const filas = [];
  t = t.replace(/<script>self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)<\/script>/g, (_, lit) => { try { filas.push(...JSON.parse(lit).split("\n")); } catch { filas.push(lit); } return ""; });
  return t + "\n--RSC--\n" + filas.filter(Boolean).sort().join("\n");
}
async function get(req, ruta, opts = {}) {
  const r = await req.get(BASE + ruta, { maxRedirects: 0, ...opts });
  const h = r.headers();
  return { status: r.status(), tipo: (h["content-type"] || "").split(";")[0], location: h.location ?? null, cache: h["cache-control"] ?? "", cuerpo: await r.text() };
}
const cookieDe = async (t) => (await t.ctx.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
/** GET con la ruta tal cual, sin que el cliente la normalice (para «..» y variantes codificadas). */
function crudo(ruta, cookie) {
  const u = new URL(BASE);
  return new Promise((res, rej) => {
    const rq = (u.protocol === "https:" ? https : http).request({ host: u.hostname, port: u.port || undefined, path: ruta, method: "GET", headers: { cookie } }, (r) => {
      const trozos = [];
      r.on("data", (c) => trozos.push(c));
      r.on("end", () => res({ status: r.statusCode, location: r.headers.location ?? null, cuerpo: Buffer.concat(trozos) }));
    });
    rq.on("error", rej);
    rq.end();
  });
}

// ───────────────────────── 1) Rutas con id ─────────────────────────
await paso("1) Páginas y API con ids de B, con la sesión de A", async () => {
const RUTAS = [
  ["compra", (id) => `/compras/${id}`, "doc", true],
  ["ficha del artículo", (id) => `/articulos/${id}`, "art", true],
  ["ficha del proveedor", (id) => `/proveedores/${id}`, "prov", true],
  ["escandallo de un plato", (id) => `/escandallos/${id}`, "rec", true],
  ["escandallo de una elaboración", (id) => `/escandallos/${id}`, "elab", true],
  ["revisión de la carta", (id) => `/carta/subir/${id}`, "carta", true],
  ["estado de la lectura (API)", (id) => `/api/documentos/${id}/estado`, "doc", true],
  // Estas dos rutas no existen: tienen que dar siempre el mismo 404, con el id que sea (si alguien las crea, esta prueba las vigila)
  ["documento (API, no existe)", (id) => `/api/documentos/${id}`, "doc", false],
  ["receta (API, no existe)", (id) => `/api/recetas/${id}`, "rec", false],
];
for (const [nombre, ruta, k, existe] of RUTAS) {
  const idB = bIds[k], idG = randomUUID();
  const x = await get(reqA, ruta(idB)), y = await get(reqA, ruta(idG));
  ok(x.status === 404, `${nombre}: A recibe ${x.status} con el id de B (debe ser 404)`);
  ok(y.status === 404, `${nombre}: A recibe ${y.status} con un id inexistente (debe ser 404)`);
  ok(x.status !== 403, `${nombre}: A recibe 403 con el id de B: confirmaría que existe`);
  ok(x.tipo === y.tipo, `${nombre}: el tipo de respuesta delata el id de B (${x.tipo} frente a ${y.tipo})`);
  ok(canon(x.cuerpo, [idB]) === canon(y.cuerpo, [idG]), `${nombre}: el cuerpo con el id de B no es igual que con un id inexistente`);
  ok(!x.cuerpo.includes(CAN + "-B"), `${nombre}: la respuesta a A contiene datos de B`);
  if (existe) {
    const own = await get(reqB, ruta(idB));
    ok(own.status === 200, `${nombre}: B no ve lo suyo (${own.status}); la prueba no sería significativa`);
    // Una caché compartida (la red de Vercel, un proxy) serviría lo de B a A: lo de cada negocio no puede guardarse como público
    ok(!/\bpublic\b|s-maxage/i.test(own.cache), `${nombre}: la respuesta de B se puede guardar en una caché compartida (cache-control: ${own.cache})`);
  }
}
for (const ruta of ["/hoy", "/compras", "/articulos", "/proveedores", "/escandallos", "/inventario", "/ventas", "/cuenta", "/cuenta/usuarios", "/api/buscar?q=ab", "/api/exportar/articulos"]) {
  const r = await get(reqB, ruta);
  ok(r.status === 200 && !/\bpublic\b|s-maxage/i.test(r.cache), `${ruta}: respuesta ${r.status} con cache-control «${r.cache}»: no puede ser pública (la vería otro negocio)`);
}
// Sin sesión no se distingue nada: mismo estado y mismo destino con un id de B que con uno inexistente
const anon = (await b.newContext()).request;
for (const [nombre, ruta, k] of RUTAS.slice(0, 7)) {
  const idB = bIds[k], idG = randomUUID();
  const x = await get(anon, ruta(idB)), y = await get(anon, ruta(idG));
  ok(x.status === y.status && x.status !== 200, `${nombre} sin sesión: ${x.status} con el id de B y ${y.status} con uno inexistente`);
  ok(canon(x.location ?? "", [idB]) === canon(y.location ?? "", [idG]) && canon(x.cuerpo, [idB]) === canon(y.cuerpo, [idG]), `${nombre} sin sesión: la respuesta cambia con el id de B`);
}
// La foto de un plato (POST): con un plato de B, como con uno inexistente, «no encontrada» y B no cambia
const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
const foto = (id, req = reqA) => req.post(BASE + `/api/recetas/${id}/foto`, { multipart: { foto: { name: "x.png", mimeType: "image/png", buffer: PNG } }, maxRedirects: 0 });
{
  const fotoAntes = (await sql("select foto_key from recetas where id = $1", [bIds.rec]))[0].foto_key;
  const x = await foto(bIds.rec), y = await foto(randomUUID());
  const [tx, ty] = [await x.text(), await y.text()];
  ok(x.status() === 404 && y.status() === 404, `foto de un plato de B: A recibe ${x.status()} (y ${y.status()} con uno inexistente), debe ser 404`);
  ok(tx === ty && /no encontrada/i.test(tx), `foto de un plato de B: la respuesta cambia con el id de B (${tx} frente a ${ty})`);
  ok((await sql("select foto_key from recetas where id = $1", [bIds.rec]))[0].foto_key === fotoAntes, "foto de un plato de B: A ha cambiado la foto del plato de B");
  const own = await foto(aIds.rec);
  ok(own.status() === 200, `foto de un plato propio: A recibe ${own.status()}, la prueba no sería significativa`);
}
console.log("· rutas con ids de B comprobadas");

// ───────────────────────── 2) Archivos privados ─────────────────────────
});

await paso("2) /api/archivos: claves de B, «..», variantes codificadas y claves raras", async () => {
{
  const NO = "No encontrado";
  const [k] = [bIds.file];
  const x = await get(reqA, `/api/archivos/${k}`), y = await get(reqA, `/api/archivos/t/${A.id}/docs/${randomUUID()}/0-fantasma.jpg`), z = await get(reqA, `/api/archivos/${bIds.file.replace(B.id, randomUUID())}`);
  ok(x.status === 404 && y.status === 404 && z.status === 404, `archivo de B: A recibe ${x.status}/${y.status}/${z.status} (clave de B, inexistente propia, inexistente de otro negocio), todas deben ser 404`);
  ok(x.cuerpo === NO && y.cuerpo === NO && z.cuerpo === NO, "archivo de B: el cuerpo de las tres respuestas debe ser el mismo («No encontrado»)");
  ok(x.tipo === y.tipo && y.tipo === z.tipo, "archivo de B: el tipo de respuesta delata la clave de B");
  const own = await get(reqB, `/api/archivos/${k}`);
  ok(own.status === 200 && own.tipo.startsWith("image/"), `archivo propio: B recibe ${own.status} ${own.tipo}`);
  const ownA = await get(reqA, `/api/archivos/${aIds.file}`);
  ok(ownA.status === 200, `archivo propio: A recibe ${ownA.status}`);
  const cookie = await cookieDe(A);
  const resto = k.slice(`t/${B.id}/`.length);
  const VARIANTES = [
    ["recorrido con ..", `/api/archivos/t/${A.id}/../${B.id}/${resto}`],
    ["recorrido con %2e%2e", `/api/archivos/t/${A.id}/%2e%2e/${B.id}/${resto}`],
    ["recorrido con doble codificación", `/api/archivos/t/${A.id}/%252e%252e/${B.id}/${resto}`],
    ["recorrido con barra invertida", `/api/archivos/t/${A.id}/..%5c${B.id}/${resto}`],
    ["recorrido pasando por la raíz", `/api/archivos/t/${A.id}/../../t/${B.id}/${resto}`],
    ["barras codificadas", `/api/archivos/t%2F${B.id}%2F${resto.replaceAll("/", "%2F")}`],
    ["clave con barra doble", `/api/archivos//t/${B.id}/${resto}`],
    ["prefijo en mayúsculas", `/api/archivos/T/${B.id}/${resto}`],
    ["byte nulo tras el prefijo propio", `/api/archivos/t/${A.id}%00/../${B.id}/${resto}`],
    ["prefijo propio y clave de B detrás", `/api/archivos/t/${A.id}/t/${B.id}/${resto}`],
    ["clave con espacio dentro del negocio propio", `/api/archivos/t/${A.id}/docs/a%20b.jpg`],
    ["clave con ñ dentro del negocio propio", `/api/archivos/t/${A.id}/docs/%C3%B1.jpg`],
    ["clave con comillas dentro del negocio propio", `/api/archivos/t/${A.id}/docs/%22%27.jpg`],
    ["codificación de porcentaje mal formada", `/api/archivos/t/${A.id}/docs/%E0%A4%A`],
    ["porcentaje suelto", `/api/archivos/t/${A.id}/docs/%zz`],
    ["clave larguísima dentro del negocio propio", `/api/archivos/t/${A.id}/docs/${"a".repeat(3000)}.jpg`],
    ["la carpeta del propio negocio", `/api/archivos/t/${A.id}/`],
    ["la carpeta docs del propio negocio", `/api/archivos/t/${A.id}/docs`],
  ];
  for (const [n, ruta] of VARIANTES) {
    let r = await crudo(ruta, cookie);
    // Next lleva las rutas con barras repetidas a la ruta limpia con una redirección: se sigue, y es la ruta limpia la que debe dar 404
    if ([301, 302, 303, 307, 308].includes(r.status) && r.location) { const l = new URL(r.location, BASE); r = await crudo(l.pathname + l.search, cookie); }
    const cuerpo = r.cuerpo.toString("latin1");
    ok(r.status !== 200, `archivos, ${n}: respuesta 200 (¿se ha servido algo?)`);
    ok(r.status < 500, `archivos, ${n}: error del servidor (${r.status}); una clave que no se puede servir debe dar 404`);
    ok(!cuerpo.includes(B.id) && !cuerpo.startsWith("\xff\xd8\xff"), `archivos, ${n}: la respuesta lleva datos de B`);
    if (r.status === 404) ok(cuerpo === NO, `archivos, ${n}: 404 con un cuerpo distinto («${cuerpo.slice(0, 40)}»)`);
  }
}
console.log("· archivos privados comprobados");

// ───────────────────────── 3) Búsqueda y exportaciones ─────────────────────────
});

await paso("3) Búsqueda y exportaciones CSV de A: nada de B", async () => {
{
  const buscar = async (req, q) => (await (await req.get(BASE + "/api/buscar?q=" + encodeURIComponent(q))).json()).items;
  for (const q of [`${CAN}-B`, `${CAN}-B-art`, `${CAN}-B-prov`, `${CAN}-B-plato`, `${CAN}-B-elab`]) {
    const i = await buscar(reqA, q);
    ok(i.length === 0, `buscar «${q.slice(-14)}» como A devuelve ${i.length} resultados (debe ser como un texto inexistente: ninguno)`);
  }
  ok(JSON.stringify(await buscar(reqA, `${CAN}-B`)) === JSON.stringify(await buscar(reqA, `zzz-no-existe-${CAN}`)), "buscar: A recibe una respuesta distinta con el texto de B que con un texto inexistente");
  const propios = (await buscar(reqA, `${CAN}-A`)).map((x) => x.href).sort();
  ok(propios.includes(`/articulos/${aIds.art}`) && propios.includes(`/proveedores/${aIds.prov}`) && propios.includes(`/escandallos/${aIds.rec}`), "buscar: A no encuentra lo suyo; la prueba no sería significativa");
  ok(propios.every((h) => !h.includes(bIds.art) && !h.includes(bIds.prov) && !h.includes(bIds.rec)), "buscar: en los resultados de A hay ids de B");
  const todos = (await buscar(reqA, CAN)).map((x) => x.href);
  ok(todos.every((h) => !h.includes(bIds.art) && !h.includes(bIds.prov) && !h.includes(bIds.rec)), "buscar: con la marca común A recibe resultados de B");
  ok((await buscar(reqB, `${CAN}-B`)).length >= 3, "buscar: B no encuentra lo suyo; la prueba no sería significativa");
  ok((await buscar(reqB, `${CAN}-A`)).length === 0, "buscar: B recibe resultados de A");
  for (const q of ["%%", "__", "\\", "%_%", "'"]) ok(Array.isArray(await buscar(reqA, q)), `buscar con «${q}» no responde bien`);

  // Cuántas filas debe tener cada CSV: las del local de A (no las de A y B juntas)
  const filas = (csv) => { let n = 0, dentro = false; for (const ch of csv.replace(/^﻿/, "")) { if (ch === '"') dentro = !dentro; else if (ch === "\n" && !dentro) n++; } return n - 1; }; // sin la cabecera
  const esperadas = {
    articulos: (await sql("select count(*)::int as n from articulos where local_id = $1 and not archived", [A.local]))[0].n,
    proveedores: (await sql("select count(*)::int as n from proveedores where local_id = $1 and not archived", [A.local]))[0].n,
    compras: (await sql("select count(*)::int as n from compra_lineas cl join documentos d on d.id = cl.documento_id where d.local_id = $1 and d.status = 'guardado'", [A.local]))[0].n,
    ventas: (await sql("select count(*)::int as n from ventas_lineas where local_id = $1", [A.local]))[0].n,
  };
  const marcas = { articulos: "art", proveedores: "prov", compras: "num", escandallos: "plato", ventas: "venta" };
  for (const tipo of ["articulos", "proveedores", "compras", "escandallos", "ventas"]) {
    const rA = await reqA.get(BASE + `/api/exportar/${tipo}`), tA = await rA.text();
    const rB = await reqB.get(BASE + `/api/exportar/${tipo}`), tB = await rB.text();
    ok(rA.status() === 200 && rB.status() === 200, `exportar ${tipo}: respuesta ${rA.status()}/${rB.status()}`);
    ok(!tA.includes(CAN + "-B"), `exportar ${tipo}: el CSV de A contiene datos de B`);
    ok(!tB.includes(CAN + "-A"), `exportar ${tipo}: el CSV de B contiene datos de A`);
    ok(tA.includes(`${CAN}-A-${marcas[tipo]}`) && tB.includes(`${CAN}-B-${marcas[tipo]}`), `exportar ${tipo}: no sale lo propio (la marca ${marcas[tipo]}); la prueba no sería significativa`);
    if (tipo in esperadas) ok(filas(tA) === esperadas[tipo], `exportar ${tipo}: el CSV de A tiene ${filas(tA)} filas y el local de A ${esperadas[tipo]}`);
    ok(![bIds.art, bIds.prov, bIds.rec, bIds.doc].some((id) => tA.includes(id)), `exportar ${tipo}: el CSV de A lleva ids de B`);
  }
  const noExiste = await reqA.get(BASE + "/api/exportar/clientes"), noExiste2 = await reqA.get(BASE + "/api/exportar/constructor");
  ok(noExiste.status() === 404 && noExiste2.status() === 404 && (await noExiste.text()) === (await noExiste2.text()), "exportar: un tipo que no existe no da el mismo 404 de siempre");
}
console.log("· búsqueda y exportaciones comprobadas");

// ───────────────────────── 4) Acciones de servidor con ids de B ─────────────────────────
});

await paso("4) Acciones de servidor con la sesión de A y los ids de B", async () => {
const acciones = accionesDelServidor();
if (!acciones) console.log("· sin compilación local (.next/server/server-reference-manifest.json): se omite este apartado");
else {
  const tablas = (await sql(`select c.relname as t from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped) order by 1`)).map((r) => r.t);
  /** Huella de todo lo que es de un negocio (sus tablas, su ficha, su equipo, sus invitaciones y sus sesiones): cualquier cambio la altera. */
  async function huella(t) {
    const h = {};
    const una = async (nombre, from, where, params, cols = "x") => { h[nombre] = (await sql(`select count(*)::int as n, coalesce(md5(string_agg(${cols}::text, '|' order by ${cols}::text)), '') as h from ${from} x where ${where}`, params))[0]; };
    for (const tabla of tablas) await una(tabla, tabla, "x.tenant_id = $1", [t.id]);
    await una("organizations", "organizations", "x.id = $1", [t.id]);
    await una("memberships", "memberships", "x.org_id = $1", [t.id]);
    await una("invitations", "invitations", "x.org_id = $1", [t.id]);
    await una("users", "users", "x.id = $1", [t.userId], "(x.id, x.email, x.name, x.password_hash)");
    await una("sessions", "sessions", "x.user_id = $1", [t.userId], "(x.id, x.user_id, x.org_id, x.token_hash)");
    return h;
  }
  const diferencias = (a, b2) => Object.keys(a).filter((k) => a[k].n !== b2[k].n || a[k].h !== b2[k].h);

  // Qué clase de respuesta debe dar cada acción al llegar a la base de datos con un id que no es del negocio de A
  const err = (re) => ({ error: re });
  const NOENC = /no encontrad|ya no existe|no existe/i;
  const draft = (artId) => ({ proveedor: { nombreLeido: null, cif: null, id: null, conf: "alta", nuevo: true, nombre: "Proveedor de prueba" }, tipoDocumento: "albaran", duplicado: null, manual: true, resumen: null, numero: null, numeroAlt: null,
    confNumero: "alta", numeroRevisado: true, fecha: new Date().toISOString().slice(0, 10), confFecha: "alta", total: null, confTotal: "alta", desglose: [], observaciones: null,
    lineas: [{ id: "m1", texto: "x", cantidad: 1, cantidadTexto: "1", unidadCompra: "kg", factor: 1, factorFuente: "unidad", precio: 1, descuento: 0, bonificadas: 0, importe: null, ivaLeido: 10, iva: 10, ivaEsperado: 10,
      conf: { linea: "alta", cantidad: "alta", precio: "alta" }, duda: null, match: { tipo: "tuyo", id: artId, score: 1, porUsuario: true }, nuevo: null, candidatos: [],
      decisiones: { articulo: false, iva: false, cantidad: false, unidad: false }, resuelto: { articulo: true, iva: true, cantidad: true, unidad: true }, manual: true }] });
  const receta = (lineas) => ({ name: "Plato de prueba", familia: "", raciones: 1, rinde: 1, rindeUnit: "kg", pvp: 12, fcObjetivo: null, ventasMes: 0, enCarta: true, estado: "activo", descripcion: "", notas: "", costeManual: null, margenObjetivo: null, lineas });
  const prov = (nombre) => ({ name: nombre, empresa: "", tipo: "", cif: "", responsable: "", phone: "", email: "", direccion: "", entrega: "", notas: "" });
  const venta = (x) => ({ filename: "x.csv", fuente: "csv", productos: [`Plato ${CAN}`], filas: [[0, "2026-09-01", 1, 10]], mapa: { [`plato ${CAN}`]: x.rec }, desde: null, hasta: null, actualizarUds: true, descontarStock: true, comensales: null, forzar: true });
  // [acción, ruta donde existe (a = ids propios), argumentos (x = los ids que se prueban, a = los propios), qué respuesta se espera]
  const CASOS = [
    // Con los ids de B en el sitio del id
    ["(app)/articulos/actions.ts#guardarArticulo", (a) => `/articulos/${a.art}`, (x) => [x.art, { name: `HACK ${CAN}` }], err(/Artículo no encontrado/)],
    ["(app)/articulos/actions.ts#archivarArticulo", (a) => `/articulos/${a.art}`, (x) => [x.art], "redirect"],
    ["(app)/articulos/actions.ts#cambiarProveedor", (a) => `/articulos/${a.art}`, (x) => [x.art, x.prov], err(/No hay precio de ese proveedor/)],
    ["(app)/articulos/actions.ts#guardarCotizacion", (a) => `/articulos/${a.art}`, (x) => [x.art, { proveedorId: x.prov, proveedorNuevo: "", precio: 1.11, unidad: "kg", nota: "hack" }], err(/Artículo no encontrado/)],
    ["(app)/articulos/actions.ts#quitarCotizacion", (a) => `/articulos/${a.art}`, (x) => [x.art, x.prov], "ok"],
    ["(app)/articulos/actions.ts#fijarVentaArticulo", (a) => `/articulos/${a.art}`, (x) => [x.art, { pvp: 9.99, cantidad: 1, unidad: "ud", porUnidad: 1 }], err(/Artículo no encontrado/)],
    ["(app)/carta/actions.ts#importarCarta", (a) => `/carta/subir/${a.carta}`, (x) => [x.carta, []], err(/Documento no encontrado/)],
    ["(app)/compras/actions.ts#guardarBorrador", (a) => `/compras/${a.doc}`, (x) => [x.doc, { lineas: [] }], "ok"],
    ["(app)/compras/actions.ts#confirmar", (a) => `/compras/${a.doc}`, (x, a) => [x.doc, draft(a.art), {}], err(/Documento no encontrado/)],
    ["(app)/compras/actions.ts#impactoBorrado", (a) => `/compras/${a.doc}`, (x) => [x.doc], err(/Documento no encontrado/)],
    ["(app)/compras/actions.ts#borrar", (a) => `/compras/${a.doc}`, (x) => [x.doc, "dejar"], err(/Documento no encontrado/)],
    ["(app)/compras/actions.ts#descartar", (a) => `/compras/${a.doc}`, (x) => [x.doc], err(/Documento no encontrado/)],
    ["(app)/compras/actions.ts#reintentar", (a) => `/compras/${a.doc}`, (x) => [x.doc], err(/No se puede volver a leer/)],
    ["(app)/compras/actions.ts#aMano", (a) => `/compras/${a.doc}`, (x) => [x.doc], "ok"],
    ["(app)/compras/actions.ts#empezarManual", () => "/compras/nueva", (x) => [x.prov], "redirect"],
    ["(app)/cuenta/actions.ts#cambiarRol", () => "/cuenta/usuarios", (x) => [x.user, "cocina"], err(/no está en tu equipo/)],
    ["(app)/cuenta/actions.ts#quitarMiembro", () => "/cuenta/usuarios", (x) => [x.user], err(/no está en tu equipo/)],
    ["(app)/cuenta/actions.ts#revocarInvitacion", () => "/cuenta/usuarios", (x) => [x.inv], "ok"],
    ["(app)/escandallos/actions.ts#guardarReceta", (a) => `/escandallos/${a.rec}`, (x) => [x.rec, receta([])], err(/Receta no encontrada/)],
    ["(app)/escandallos/actions.ts#duplicarReceta", (a) => `/escandallos/${a.rec}`, (x) => [x.rec], err(/Receta no encontrada/)],
    ["(app)/escandallos/actions.ts#archivarReceta", (a) => `/escandallos/${a.rec}`, (x) => [x.rec], "redirect"],
    ["(app)/escandallos/actions.ts#setVentasMes", () => "/ventas", (x) => [x.rec, 9999], "ok"],
    ["(app)/escandallos/actions.ts#setReventa", () => "/ventas", (x) => [x.rec, { coste: 1, margen: 1, pvp: 1 }], err(/Producto no encontrado/)],
    ["(app)/hoy/avisos/actions.ts#cerrarAviso", () => "/hoy/avisos", (x) => [x.ev ?? x.evResuelto, "ignorado"], err(/ya no existe/)],
    ["(app)/hoy/avisos/actions.ts#reabrirAviso", () => "/hoy/avisos", (x) => [x.evResuelto], "ok"],
    ["(app)/inventario/actions.ts#ajustarStock", () => "/inventario", (x) => [x.art, 5], err(NOENC)],
    ["(app)/inventario/actions.ts#guardarParametro", () => "/inventario", (x) => [x.art, "stock_min", 5], err(NOENC)],
    ["(app)/inventario/actions.ts#dejarDeControlar", () => "/inventario", (x) => [x.art], err(NOENC)],
    ["(app)/inventario/actions.ts#anadirReferencia", () => "/inventario", (x) => [{ tipo: "tuyo", id: x.art, stock: 1, minimo: 1, consumo: 1 }], err(NOENC)],
    ["(app)/inventario/actions.ts#registrarSalida", () => "/inventario", (x) => [{ id: x.art, cantidad: 1, tipo: "merma", nota: "x" }], err(NOENC)],
    ["(app)/inventario/actions.ts#guardarPedido", () => "/inventario", (x) => [[{ articuloId: x.art, cantidad: 1 }]], "ok"],
    ["(app)/inventario/actions.ts#recibirSugerido", () => "/inventario", (x) => [[{ articuloId: x.art, cantidad: 1 }]], "ok"],
    ["(app)/inventario/actions.ts#crearPedidoProveedor", () => "/inventario/pedidos/nuevo", (x, a) => [x.prov, [{ articuloId: a.art, cantidad: 1 }]], err(/proveedor ya no existe/)],
    ["(app)/inventario/actions.ts#recibirPedido", () => "/inventario/pedidos", (x) => [x.pedido], err(NOENC)],
    ["(app)/inventario/actions.ts#estadoPedido", () => "/inventario/pedidos", (x) => [x.pedido, "cancelado"], err(/ya no se puede cambiar/)],
    ["(app)/inventario/actions.ts#pedidoAFactura", () => "/inventario/pedidos", (x) => [x.pedido], err(NOENC)],
    ["(app)/proveedores/actions.ts#guardarProveedor", (a) => `/proveedores/${a.prov}`, (x) => [x.prov, prov(`HACK ${CAN}`)], "ok"],
    ["(app)/proveedores/actions.ts#borrarProveedor", (a) => `/proveedores/${a.prov}`, (x) => [x.prov], "redirect"],
    ["(app)/ventas/actions.ts#borrarImport", () => "/ventas", (x) => [x.imp], err(NOENC)],
    ["(onb)/actions.ts#quitarProveedorAlta", () => "/alta/proveedores", (x) => [x.prov], err(/alta ya está terminada/)],
    // Con una cosa de A (que existe) y un id de B dentro de lo que se envía
    ["(app)/compras/actions.ts#confirmar", (a) => `/compras/${a.docRevisar}`, (x, a) => [a.docRevisar, draft(x.art), {}], err(/ya no existe/), "propio con un artículo de B en una línea"],
    ["(app)/escandallos/actions.ts#guardarReceta", (a) => `/escandallos/${a.rec}`, (x, a) => [a.rec, receta([{ articuloId: x.art, cantidad: 1, unidad: "kg" }])], err(/ingrediente que ya no existe/), "propio con un artículo de B como ingrediente"],
    ["(app)/escandallos/actions.ts#guardarReceta", (a) => `/escandallos/${a.rec}`, (x, a) => [a.rec, receta([{ subrecetaId: x.elab, cantidad: 1, unidad: "kg" }])], err(/no puede contenerse a sí misma|solo se pueden usar elaboraciones/), "propio con una elaboración de B como subreceta"],
    ["(app)/articulos/actions.ts#cambiarProveedor", (a) => `/articulos/${a.art}`, (x, a) => [a.art, x.prov], err(/No hay precio de ese proveedor/), "propio con un proveedor de B"],
    ["(app)/articulos/actions.ts#guardarCotizacion", (a) => `/articulos/${a.art}`, (x, a) => [a.art, { proveedorId: x.prov, proveedorNuevo: "", precio: 1.11, unidad: "kg", nota: "hack" }], err(/Proveedor no válido/), "propio con un proveedor de B"],
    ["(app)/inventario/actions.ts#crearPedidoProveedor", () => "/inventario/pedidos/nuevo", (x) => [null, [{ articuloId: x.art, cantidad: 1 }]], err(/Ninguno de los artículos/), "artículo de B en las líneas"],
    ["(app)/inventario/actions.ts#anadirReferencia", () => "/inventario", (x) => [{ tipo: "tuyo", id: x.art, stock: 3, minimo: 3, consumo: 3 }], err(NOENC), "artículo de B en el inventario"],
    ["(app)/compras/actions.ts#empezarManual", () => "/compras/nueva", (x) => [x.prov], "redirect", "proveedor de B en una compra a mano"],
    ["(app)/ventas/actions.ts#importar", () => "/ventas/importar", (x) => [venta(x)], "ok", "importación con un plato de B en la asignación"],
    ["(app)/carta/actions.ts#importarCarta", (a) => `/carta/subir/${a.carta}`, (x, a) => [a.carta, [{ nombre: `HACK ${CAN}`, familia: "", precio: 1, descripcion: "", accion: "actualizar", recetaId: x.rec }]], "redirect", "carta propia que «actualiza» un plato de B"],
  ];
  // Acciones que no reciben ningún id de un negocio (o que se prueban en otro apartado): el resto de las del manifiesto, sin clasificar, falla
  const SIN_IDS = [
    "(app)/articulos/actions.ts#crearArticuloAction", "(app)/cuenta/actions.ts#guardarLocal", "(app)/cuenta/actions.ts#guardarPerfil", "(app)/cuenta/actions.ts#cambiarPassword",
    "(app)/cuenta/actions.ts#cerrarOtrasSesiones", "(app)/cuenta/actions.ts#demo", "(app)/cuenta/actions.ts#invitar", "(app)/cuenta/actions.ts#irAPagar", "(app)/cuenta/actions.ts#irAPortal",
    "(app)/escandallos/actions.ts#crearReceta", "(app)/escandallos/actions.ts#sugerirIngredientes", "(app)/prefs-actions.ts#cambiarTema", "(app)/prefs-actions.ts#marcarTour",
    "(onb)/actions.ts#altaProveedor", "(onb)/actions.ts#guardarBriefing", "(onb)/actions.ts#guardarLocal", "(onb)/actions.ts#terminarAlta",
    // La sesión, las cuentas y las invitaciones: apartados 5 y 6, y se llaman con formularios o con datos propios
    "(auth)/actions.ts#cambiarEmail", "(auth)/actions.ts#crearNegocio", "(auth)/actions.ts#entrar", "(auth)/actions.ts#recuperar", "(auth)/actions.ts#reenviarCodigo", "(auth)/actions.ts#registrar",
    "(auth)/actions.ts#restablecer", "(auth)/actions.ts#salir", "(auth)/actions.ts#verificar", "(auth)/actions.ts#cambiarNegocio", "(auth)/invitacion/actions.ts#aceptarInvitacion", "(auth)/invitacion/actions.ts#aceptarNuevo",
    // Se prueban con eliminarNegocio con el nombre de otro negocio más abajo
    "(app)/cuenta/actions.ts#eliminarNegocio",
  ];
  const clasificadas = new Set([...CASOS.map((c) => c[0]), ...SIN_IDS]);
  for (const k of acciones.keys()) ok(clasificadas.has(k), `acción de servidor sin clasificar en fugas.mjs: ${k} (¿recibe un id? añádela a CASOS; si no, a SIN_IDS)`);
  for (const k of clasificadas) ok(acciones.has(k), `fugas.mjs conoce la acción ${k} pero la compilación no la tiene (¿se ha renombrado o quitado?)`);

  const gIds = fantasma();
  const enviados = (args) => new Set(JSON.stringify(args).match(UUID) ?? []);
  const forma = (r) => {
    const limpia = (s) => String(s ?? "").replace(UUID, "<ID>");
    return JSON.stringify({ status: r.status, redirect: r.redirect ? limpia(r.redirect) : null, resultado: r.resultado ? JSON.parse(limpia(JSON.stringify(r.resultado))) : null });
  };
  const cumple = (esperado, r) => {
    if (r.status !== 200) return false;
    if (esperado === "ok") return r.resultado?.ok === true && !r.redirect;
    if (esperado === "redirect") return !!r.redirect;
    return r.resultado?.ok === false && esperado.error.test(r.resultado.error ?? "");
  };
  const BUSCADOS = [CAN + "-B", B.id, B.email, bIds.file, ...Object.values(bIds).filter((v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(v))];
  let h = await huella(B);
  let n = 0;
  for (const [clave, ruta, args, esperado, nota] of CASOS) {
    const accion = acciones.get(clave);
    if (!accion) continue;
    const nombre = clave.split("#")[1] + (nota ? ` (${nota})` : "");
    const rB = await llamarAccion(reqA, accion, args(bIds, aIds), ruta(aIds));
    const h1 = await huella(B);
    const rG = await llamarAccion(reqA, accion, args(gIds, aIds), ruta(aIds));
    const h2 = await huella(B);
    n++;
    const resumen = (r) => `${r.status} ${r.redirect ?? ""} ${r.resultado ? JSON.stringify(r.resultado).slice(0, 120) : "(sin resultado)"}`;
    ok(cumple(esperado, rB), `${nombre}: con ids de B la respuesta no es la de «no encontrado»/sin efecto que se esperaba: ${resumen(rB)}`);
    ok(cumple(esperado, rG), `${nombre}: con ids inexistentes la respuesta no es la esperada: ${resumen(rG)}`);
    ok(forma(rB) === forma(rG), `${nombre}: la respuesta con ids de B no es igual que con ids inexistentes (${resumen(rB)} ≠ ${resumen(rG)})`);
    const enviadosB = enviados(args(bIds, aIds));
    const resto = rB.cuerpo.split("\n").map((l) => [...enviadosB].reduce((s, id) => s.split(id).join(""), l)).join("\n");
    ok(!BUSCADOS.some((s) => s && resto.includes(s)), `${nombre}: la respuesta a A contiene datos de B (${BUSCADOS.find((s) => s && resto.includes(s))})`);
    const tocadas = [...diferencias(h, h1), ...diferencias(h1, h2)];
    ok(!tocadas.length, `${nombre}: la acción de A ha cambiado datos de B (${[...new Set(tocadas)].join(", ")})`);
    h = h2;
  }
  console.log(`· ${n} acciones llamadas con ids de B y con ids inexistentes`);

  // Eliminar el negocio escribiendo el nombre de otro negocio no borra nada
  const nBefore = (await sql("select count(*)::int as n from organizations where id = any($1::uuid[])", [[A.id, B.id]]))[0].n;
  const rEl = await llamarAccion(reqA, acciones.get("(app)/cuenta/actions.ts#eliminarNegocio"), ["Negocio B"], "/cuenta");
  ok(rEl.resultado?.ok === false && /nombre exacto/.test(rEl.resultado.error), `eliminarNegocio con el nombre de B: ${JSON.stringify(rEl.resultado)}`);
  ok((await sql("select count(*)::int as n from organizations where id = any($1::uuid[])", [[A.id, B.id]]))[0].n === nBefore, "eliminarNegocio con el nombre de B ha borrado un negocio");

  // Controles positivos: por este mismo camino, las acciones sobre lo propio sí funcionan (si no, «B no ha cambiado» no probaría nada)
  const rP = await llamarAccion(reqA, acciones.get("(app)/articulos/actions.ts#guardarArticulo"), [aIds.art, { stockMin: 7.5 }], `/articulos/${aIds.art}`);
  ok(rP.resultado?.ok === true && Number((await sql("select stock_min from articulos where id = $1", [aIds.art]))[0].stock_min) === 7.5, `control: guardarArticulo sobre un artículo de A no ha funcionado (${JSON.stringify(rP.resultado)})`);
  const evA = (await sql("select pe.id from precio_eventos pe where pe.tenant_id = $1 and not exists (select 1 from avisos_estado a where a.evento_id = pe.id) limit 1", [A.id]))[0]?.id;
  if (evA) {
    const rC = await llamarAccion(reqA, acciones.get("(app)/hoy/avisos/actions.ts#cerrarAviso"), [evA, "ignorado"], "/hoy/avisos");
    ok(rC.resultado?.ok === true && (await sql("select estado from avisos_estado where evento_id = $1 and tenant_id = $2", [evA, A.id]))[0]?.estado === "ignorado", `control: cerrarAviso sobre un aviso de A no ha funcionado (${JSON.stringify(rC.resultado)})`);
  }
  const rQ = await llamarAccion(reqB, acciones.get("(app)/proveedores/actions.ts#guardarProveedor"), [bIds.prov, prov(`${CAN}-B-prov`)], `/proveedores/${bIds.prov}`);
  ok(rQ.resultado?.ok === true, `control: B no puede guardar su propio proveedor (${JSON.stringify(rQ.resultado)})`);
}

// ───────────────────────── 5) Invitaciones y cambio de negocio ─────────────────────────
});

await paso("5) Invitaciones y cambio de negocio", async () => {
const miembros = async (userId, orgId) => (await sql("select count(*)::int as n from memberships where user_id = $1 and org_id = $2", [userId, orgId]))[0].n;
{
  // El propietario de B invita a un correo; el enlace llega por el buzón de pruebas
  const invitado = `invitado-${CAN}@example.com`;
  await B.page.goto(BASE + "/cuenta/usuarios");
  await B.page.getByLabel("Email").fill(invitado);
  await B.page.getByRole("radio", { name: /Cocina/ }).check();
  await B.page.getByRole("button", { name: /Enviar invitación/ }).click();
  const [correo] = await until("select body_text from outbox_emails where lower(to_email) = lower($1) order by created_at desc limit 1", [invitado], (r) => r.length > 0);
  const enlace = correo?.body_text.match(/https?:\/\/\S+\/invitacion\/[A-Za-z0-9_-]+/)?.[0];
  ok(enlace, "la invitación de B no ha dejado un enlace en el buzón de pruebas");
  const rutaInv = new URL(enlace).pathname;
  const [{ id: invId }] = await sql("select id from invitations where org_id = $1 and lower(email) = lower($2)", [B.id, invitado]);

  // A (otra persona, otro negocio) abre ese enlace: se le dice que no es para él y no hay botón de aceptar
  await A.page.goto(BASE + rutaInv);
  const textoA = await A.page.locator("body").innerText();
  ok(/pero la invitación es para/.test(textoA), "un usuario de A con el enlace de B no ve el aviso de que la invitación es para otra persona");
  ok((await A.page.getByRole("button", { name: /Aceptar e ir a/ }).count()) === 0, "un usuario de A ve el botón de aceptar la invitación de B");
  ok(!textoA.includes(invitado) || textoA.includes("la invitación es para"), "la pantalla enseña el correo invitado fuera del aviso");

  // La persona invitada se da de alta con ese correo y abre el enlace: ella sí ve «Aceptar»
  const cxU = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES" });
  const pU = await cxU.newPage();
  await signup(pU, { email: invitado, negocio: `Negocio U ${CAN}` });
  await pU.goto(BASE + rutaInv);
  const aceptar = pU.getByRole("button", { name: /Aceptar e ir a/ });
  await aceptar.waitFor({ timeout: 10000 });
  // El formulario tal como lo envía el servidor (con sus campos ocultos), no el DOM ya hidratado
  const htmlU = await (await cxU.request.get(BASE + rutaInv)).text();
  const formulario = htmlU.split(/(?=<form[\s>])/).find((t) => t.startsWith("<form") && t.slice(0, t.indexOf("</form>")).includes("Aceptar e ir a"))?.slice(0, htmlU.length).replace(/<\/form>[\s\S]*$/, "</form>");
  ok(formulario && /name="\$ACTION_/.test(formulario), "no se ha encontrado el formulario de aceptar en el HTML de la persona invitada");

  // Lo que haría un atacante: coger ese formulario (con sus campos ocultos) y enviarlo con la sesión de A
  await A.page.goto(BASE + rutaInv);
  await A.page.evaluate((html) => {
    const d = document.createElement("div");
    d.innerHTML = html;
    const f = d.firstElementChild;
    f.id = "forjado";
    document.body.appendChild(f);
    f.requestSubmit();
  }, formulario);
  await A.page.waitForLoadState("networkidle").catch(() => {});
  await espera(1500);
  ok((await miembros(A.userId, B.id)) === 0, "el usuario de A ha entrado en B reenviando el formulario de la persona invitada");
  ok(!(await sql("select accepted_at from invitations where id = $1", [invId]))[0].accepted_at, "el usuario de A ha consumido la invitación de B");
  ok((await sql("select count(*)::int as n from sessions where user_id = $1 and org_id = $2", [A.userId, B.id]))[0].n === 0, "la sesión de A apunta a B tras reenviar el formulario");
  ok(/pero la invitación es para/.test(await A.page.locator("body").innerText()), "tras reenviar el formulario, A no vuelve al aviso de que la invitación es para otra persona");

  // Control: la persona invitada sí entra, como «Cocina»
  await aceptar.click();
  await pU.waitForURL("**/hoy**", { timeout: 20000 });
  const [uId] = await sql("select id from users where lower(email) = lower($1)", [invitado]);
  ok((await sql("select role from memberships where org_id = $1 and user_id = $2", [B.id, uId.id]))[0]?.role === "cocina", "la persona invitada no ha entrado en B como cocina (la prueba no sería significativa)");
  await cxU.close();
  // Y el enlace ya no sirve a nadie más
  await A.page.goto(BASE + rutaInv);
  ok(/ya no es válida/.test(await A.page.locator("body").innerText()), "la invitación usada sigue sirviendo");
}
{
  // Cambio de negocio: A pertenece a dos negocios (el suyo y uno más, C) para que le salga el selector, y manipula el formulario
  const [c] = await sql("insert into organizations (name, trial_ends_at, onboarding_done_at) values ($1, now() + interval '14 days', now()) returning id", [`Negocio C ${CAN}`]);
  await sql("insert into memberships (org_id, user_id, role) values ($1, $2, 'propietario')", [c.id, A.userId]);
  await sql("insert into locales (tenant_id, name) values ($1, $2)", [c.id, `Local C ${CAN}`]);
  const sesionA = async () => (await sql("select distinct org_id from sessions where user_id = $1", [A.userId])).map((r) => r.org_id);
  const [origen] = await sesionA();
  try {
    await A.page.goto(BASE + "/mas");
    const boton = A.page.locator('button[name="org"]');
    ok((await boton.count()) === 1, "A, con dos negocios, no ve el selector de negocio en Más (la prueba no sería significativa)");
    for (const [descripcion, valor] of [["el id de B", B.id], ["el id de B en mayúsculas", B.id.toUpperCase()], ["el id de B con espacios", ` ${B.id} `], ["un id inexistente", randomUUID()]]) {
      await A.page.goto(BASE + "/mas");
      await A.page.locator('button[name="org"]').evaluate((el, v) => { el.value = v; }, valor);
      // La acción de servidor es un POST a la propia pantalla: se espera a su respuesta antes de mirar nada
      await Promise.all([A.page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/mas"), { timeout: 15000 }), A.page.locator('button[name="org"]').click()]);
      await A.page.waitForLoadState("networkidle").catch(() => {});
      await espera(500);
      ok(!/Ahora estás en/.test(await A.page.locator("body").innerText()), `cambiar de negocio a ${descripcion}: la app dice que ha cambiado`);
      const orgs = await sesionA();
      ok(orgs.length === 1 && orgs[0] === origen && !orgs.includes(B.id), `cambiar de negocio a ${descripcion}: la sesión de A ha cambiado de negocio (${orgs.join(", ")})`);
      ok((await sql("select last_org_id from users where id = $1", [A.userId]))[0].last_org_id !== B.id, `cambiar de negocio a ${descripcion}: se ha recordado B como último negocio de A`);
    }
    // Control: al otro negocio de A sí se puede cambiar
    await A.page.goto(BASE + "/mas");
    await A.page.locator('button[name="org"]').click();
    await A.page.waitForURL("**/hoy**", { timeout: 15000 });
    ok((await sesionA())[0] === c.id, "el cambio legítimo a C no ha funcionado (la prueba no sería significativa)");
    ok(/Local C/.test(await A.page.locator("body").innerText()), "tras cambiar a C no se ve su local");
    await sql("update sessions set org_id = $2 where user_id = $1", [A.userId, origen]);
    // Aunque la sesión de A apuntara a B en la base de datos, la app solo da negocios de los que A es miembro
    await sql("update sessions set org_id = $2 where user_id = $1", [A.userId, B.id]);
    await A.page.goto(BASE + "/hoy");
    const hoy = await A.page.locator("body").innerText();
    ok(hoy.includes("Negocio A") && !hoy.includes("Negocio B"), "con la sesión de A apuntando a B en la base de datos, /hoy enseña el negocio equivocado");
    ok((await get(reqA, `/compras/${bIds.doc}`)).status === 404, "con la sesión de A apuntando a B en la base de datos, A ve una compra de B");
    const csv = await (await reqA.get(BASE + "/api/exportar/proveedores")).text();
    ok(!csv.includes(CAN + "-B"), "con la sesión de A apuntando a B en la base de datos, la exportación de A lleva datos de B");
    await sql("update sessions set org_id = $2 where user_id = $1", [A.userId, origen]);
  } finally {
    // Pase lo que pase, A vuelve a su negocio y el negocio extra desaparece
    await sql("update sessions set org_id = $2 where user_id = $1", [A.userId, origen]);
    await sql("delete from organizations where id = $1", [c.id]);
  }
}
console.log("· invitaciones y cambio de negocio comprobados");

// ───────────────────────── 6) Concurrencia: borrar un albarán mientras se importan ventas ─────────────────────────
});

await paso("6) Concurrencia: borrar un albarán y, a la vez, importar ventas", async () => {
const acc = accionesDelServidor();
if (!acc) console.log("· sin compilación local: se omite este apartado");
else {
  // Un negocio limpio, con un albarán guardado (lectura de ejemplo) y un plato que lo usa: sin ese albarán el plato no tiene precio
  const FOTO = readFileSync(new URL("../../public/demo/arroz.webp", import.meta.url));
  const emailC = `conc+${CAN}@example.com`;
  const cx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-ES" });
  const p = await cx.newPage();
  watch(p, errores);
  await signup(p, { email: emailC, negocio: `Negocio Conc ${CAN}` });
  const [o] = await sql("select m.org_id as tenant, l.id as local from users u join memberships m on m.user_id = u.id join locales l on l.tenant_id = m.org_id where lower(u.email) = lower($1)", [emailC]);
  /** Sube la lectura limpia de Frutas Hermanos Gil y la guarda (como borrado.mjs): devuelve el id del albarán. */
  async function guardarGil() {
    await p.goto(BASE + "/compras/subir");
    await p.locator("#f-any").setInputFiles({ name: "albaran-gil.webp", mimeType: "image/webp", buffer: FOTO });
    await p.getByRole("button", { name: /Leer albarán · 1 página/ }).click();
    await p.waitForURL(/\/compras\/[0-9a-f-]{36}$/);
    await p.getByRole("heading", { name: "Revisa el albarán" }).waitFor({ timeout: 40000 });
    for (let i = 0; i < 4; i++) { const t = p.locator(".tour-next"); try { await t.waitFor({ timeout: 3000 }); await t.click(); } catch { break; } }
    const guardar = p.getByRole("button", { name: "Confirmar y guardar" });
    await guardar.waitFor();
    await guardar.click();
    // Mismo número del mismo proveedor: «Documento repetido» → guardar igualmente
    try { const rep = p.getByRole("dialog").getByRole("button", { name: "Guardar igualmente" }); await rep.waitFor({ timeout: 2500 }); await rep.click(); } catch { /* no era repetido */ }
    await p.waitForURL(/guardado=1/, { timeout: 20000 });
    return p.url().match(/compras\/([0-9a-f-]{36})/)[1];
  }
  const docC = await guardarGil();
  const [art] = await sql("select a.id, a.unit from compra_lineas cl join articulos a on a.id = cl.articulo_id where cl.documento_id = $1 order by cl.idx limit 1", [docC]);
  const [rec] = await sql("insert into recetas (tenant_id, local_id, tipo, name, raciones, pvp, estado) values ($1, $2, 'plato', $3, 1, 12, 'activo') returning id", [o.tenant, o.local, `Plato ${CAN}`]);
  await sql("insert into receta_lineas (tenant_id, receta_id, idx, articulo_id, cantidad, unidad) values ($1, $2, 0, $3, 0.5, $4)", [o.tenant, rec.id, art.id, art.unit]);
  const reqC = cx.request;
  const accionImportar = acc.get("(app)/ventas/actions.ts#importar"), accionBorrar = acc.get("(app)/compras/actions.ts#borrar"), accionImpacto = acc.get("(app)/compras/actions.ts#impactoBorrado");
  /** Importación de ventas por la acción de servidor (la misma que usa el asistente): 10 unidades del plato. */
  const importar = (nombre, tocarStock = false) => llamarAccion(reqC, accionImportar, [{ filename: nombre, fuente: "csv", productos: [`Plato ${CAN}`], filas: [[0, "2026-09-01", 10, 120]], mapa: { [`plato ${CAN}`]: rec.id },
    desde: null, hasta: null, actualizarUds: tocarStock, descontarStock: tocarStock, comensales: null, forzar: true }], "/ventas/importar");
  const costeActual = async () => Number((await sql("select (l.cantidad * coalesce(a.precio_manual, a.pmp, a.last_price) / (greatest(1, a.rend) / 100))::float as c from receta_lineas l join articulos a on a.id = l.articulo_id where l.receta_id = $1", [rec.id]))[0].c);
  const c0 = await costeActual();
  ok(c0 > 0, `el plato de la prueba no tiene coste con el albarán (${c0}); la prueba no sería significativa`);

  // Una conexión aparte retiene un registro que la importación necesita al final de su transacción (el recuerdo de cómo se llama el
  // plato en el TPV): la importación se queda esperando JUSTO después de haber leído los precios y congelado el coste de sus líneas
  const retenedor = new pg.Client({ connectionString: DB });
  await retenedor.connect();
  await retenedor.query("begin");
  await retenedor.query("insert into ventas_alias (tenant_id, local_id, nombre_norm, receta_id) values ($1, $2, $3, $4)", [o.tenant, o.local, `plato ${CAN}`, rec.id]);
  const pImportar = importar("ventas-concurrentes.csv");
  const esperando = await until(`select 1 from pg_stat_activity where wait_event_type = 'Lock' and query like '%into ventas_alias%' and datname = current_database()`, [], (r) => r.length > 0, 20000);
  ok(esperando.length > 0, "la importación no se ha quedado esperando al registro retenido (la prueba no puede forzar la carrera)");
  ok((await sql("select count(*)::int as n from ventas_lineas where tenant_id = $1", [o.tenant]))[0].n === 0, "la importación retenida ya es visible desde fuera (debería seguir sin confirmar)");

  // Mientras tanto se borra el albarán (sin elegir qué hacer con las ventas: desde fuera aún no hay ninguna que cuente)
  const pBorrar = llamarAccion(reqC, accionBorrar, [docC], `/compras/${docC}`);
  let borradoTerminado = false;
  pBorrar.then(() => { borradoTerminado = true; }, () => { borradoTerminado = true; });
  // Hasta que el borrado haya acabado (sin el bloqueo, no espera a nadie) o se quede esperando a la importación (con él)
  for (const t0 = Date.now(); !borradoTerminado && Date.now() - t0 < 20000;) {
    if ((await sql("select 1 from pg_locks where locktype = 'advisory' and not granted and database = (select oid from pg_database where datname = current_database())")).length) break;
    await espera(100);
  }
  await espera(300);
  // Se suelta el registro: la importación termina y confirma
  await retenedor.query("rollback");
  await retenedor.end();
  const [rImp, rBor] = [await pImportar, await pBorrar];
  ok(rImp.resultado?.ok === true, `la importación no ha terminado bien: ${JSON.stringify(rImp.resultado)}`);
  const imp = (await sql("select id from ventas_importes where tenant_id = $1 and filename = 'ventas-concurrentes.csv'", [o.tenant]))[0];
  ok(imp, "la importación no ha dejado su registro");
  const costeLineas = async () => (await sql("select coste_unit::float as c from ventas_lineas where import_id = $1", [imp.id])).map((r) => r.c);
  const docSigue = async () => (await sql("select 1 from documentos where id = $1", [docC])).length > 0;
  const lineas = await costeLineas(), borrado = !(await docSigue());
  const [auditoria] = await sql("select data from audit_log where entity = 'documento' and entity_id = $1 and action = 'borrar'", [docC]);
  console.log(`· la carrera: albarán ${borrado ? "borrado" : `conservado («${rBor.resultado?.error ?? rBor.status}»)`}; coste congelado de las ventas ${lineas.map((x) => x.toFixed(2)).join(", ")} (el plato cuesta ${c0.toFixed(2)} con el albarán)`);
  ok(lineas.length === 1 && lineas[0] > 0.001, `la importación debería haber congelado el coste con los precios del albarán (${lineas.join(", ")}): la prueba no ha forzado la carrera`);
  // Coherencia: o el albarán sigue ahí (se ha rechazado el borrado pidiendo elegir qué hacer con esas ventas) o se ha borrado habiendo elegido;
  // lo que no puede pasar es borrarlo sin elegir y dejar en las ventas el coste de unos precios que ya no existen.
  if (borrado) {
    const d = auditoria?.data;
    ok(d?.ventasAfectadas > 0 && (d.ventas === "dejar" || d.ventas === "recalcular"), `el albarán se ha borrado sin elegir qué hacer con unas ventas importadas que usaron sus precios (historial: ${JSON.stringify(d)}); esas ventas quedan con el coste congelado de unos precios que ya no existen`);
  } else {
    ok(rBor.resultado?.ok === false && /ventas que ya importaste/.test(rBor.resultado.error ?? ""), `el borrado se ha rechazado, pero no por pedir que se elija qué hacer con las ventas: ${JSON.stringify(rBor.resultado)}`);
    // Y el camino correcto funciona: la vista previa ya cuenta esas ventas y, eligiendo, el albarán se borra y las ventas se recalculan
    const rImpacto = await llamarAccion(reqC, accionImpacto, [docC], `/compras/${docC}`);
    ok(rImpacto.resultado?.ok === true && /ventas-concurrentes\.csv/.test(rImpacto.cuerpo), "la vista previa del borrado no cuenta las ventas importadas hace un momento");
    const rFin = await llamarAccion(reqC, accionBorrar, [docC, "recalcular"], `/compras/${docC}`);
    ok(rFin.status === 200 && !(await docSigue()), `eligiendo qué hacer con las ventas el albarán no se ha borrado: ${JSON.stringify(rFin.resultado)}`);
    const despues = await costeLineas();
    ok(despues.length === 1 && Math.abs(despues[0]) < 0.0005, `«recalcular» debería dejar las ventas con el coste sin el albarán (0) y quedan ${despues.join(", ")}`);
  }

  // Sin retener nada: importar (tocando stock y platos) y borrar a la vez, con albaranes nuevos cada vez. Nunca un error del servidor ni un
  // interbloqueo, y al final nada a medias.
  for (let i = 0; i < 3; i++) {
    const d = await guardarGil();
    const [rI, rB2] = await Promise.all([importar(`ventas-carrera-${i}.csv`, true), llamarAccion(reqC, accionBorrar, [d, "dejar"], `/compras/${d}`)]);
    const genérico = /No se ha podido guardar/;
    ok(rI.status === 200 && rB2.status === 200, `importar y borrar a la vez (vuelta ${i}): estado ${rI.status}/${rB2.status}`);
    ok(rI.resultado?.ok === true, `importar mientras se borra un albarán (vuelta ${i}): ${JSON.stringify(rI.resultado)}`);
    ok(!genérico.test(rB2.resultado?.error ?? "") && (rB2.resultado === null ? !!rB2.redirect : !!rB2.resultado.error), `borrar mientras se importan ventas (vuelta ${i}): ${JSON.stringify(rB2.resultado)}`);
  }
  const huerfanas = (await sql("select count(*)::int as n from ventas_lineas vl where tenant_id = $1 and not exists (select 1 from ventas_importes vi where vi.id = vl.import_id)", [o.tenant]))[0].n;
  ok(huerfanas === 0, `quedan ${huerfanas} líneas de venta sin importación`);
  const [{ n: movs }] = await sql("select count(*)::int as n from stock_movimientos sm where tenant_id = $1 and ref_tipo = 'documento' and not exists (select 1 from documentos d where d.id = sm.ref_id)", [o.tenant]);
  ok(movs === 0, `quedan ${movs} movimientos de stock de albaranes que ya no existen`);
  await cx.close();
}
});

await b.close();
if (errores.length) console.log("avisos de consola del navegador:", [...new Set(errores)].slice(0, 5));
console.log(fails ? `\n✗ ${fails} de ${checks} comprobaciones fallidas` : `\n✓ ${checks} comprobaciones de fugas entre negocios correctas`);
process.exit(fails ? 1 : 0);
