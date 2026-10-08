// Planes y precios fijados por el propietario el 8/10/2026: Premium 49,90 €, Pro 89,90 € y Max 149,90 €, siempre sin IVA (el IVA se añade aparte).
// La web no inventa límites ni condiciones que él no haya confirmado, y lo que aún no existe en la app se marca «en desarrollo».
import { test } from "node:test";
import assert from "node:assert/strict";
import { getSiteCopy } from "../../lib/site-copy";

for (const locale of ["es", "ca"] as const) {
  test(`precios (${locale}): tres planes con sus precios y el IVA aparte`, () => {
    const p = getSiteCopy(locale).pricing;
    assert.deepEqual(p.plans.map((x) => [x.name, x.price]), [["Premium", "49,90 €"], ["Pro", "89,90 €"], ["Max", "149,90 €"]]);
    assert.match(p.vatNote, /IVA/);
    assert.match(p.plansBody, /IVA/);
    // Varios locales todavía no existe en la app: solo puede aparecer marcado como «en desarrollo»
    for (const pl of p.plans) for (const f of [...pl.perks, ...pl.soon]) if (/locales?/i.test(f) && !/^Un local$/i.test(f)) assert.match(f, /desenvolupament|desarrollo/i, f);
  });
}
