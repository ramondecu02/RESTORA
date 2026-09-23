// Junta varias capturas en una sola imagen para revisarlas de un vistazo.
import { launch, SHOTS } from "./lib.mjs";
import { readFileSync } from "node:fs";
const [out, ...files] = process.argv.slice(2);
const imgs = files.map((f) => `<img src="data:image/png;base64,${readFileSync(SHOTS + f).toString("base64")}">`).join("");
const b = await launch();
const p = await b.newPage({ viewport: { width: 400 * files.length, height: 900 } });
await p.setContent(`<body style="margin:0;display:flex;gap:10px;background:#999;align-items:flex-start">${imgs}</body>`);
await p.screenshot({ path: out, fullPage: true });
await b.close();
