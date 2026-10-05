// Gancho de resolución para ejecutar con node, que quita los tipos de los .ts por sí solo, módulos de src/ sin compilarlos:
// entiende los alias «@/», los imports sin extensión (./costs → ./costs.ts) y los de «next/…» sin «.js».
const SRC = new URL("../../src/", import.meta.url);
const CON_EXTENSION = /\.[cm]?[jt]sx?$|\.json$|\.node$/;
export async function resolve(specifier, context, nextResolve) {
  const bases = [];
  if (specifier.startsWith("@/")) bases.push(new URL(specifier.slice(2), SRC).href);
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:") && !CON_EXTENSION.test(specifier)) bases.push(new URL(specifier, context.parentURL).href);
  for (const base of bases) for (const ext of [".ts", ".tsx", "/index.ts"]) { try { return await nextResolve(base + ext, context); } catch { /* se prueba la siguiente */ } }
  try { return await nextResolve(specifier, context); }
  catch (e) {
    if (e?.code === "ERR_MODULE_NOT_FOUND" && /^next\/[a-z-]+$/.test(specifier)) return nextResolve(specifier + ".js", context);
    throw e;
  }
}
