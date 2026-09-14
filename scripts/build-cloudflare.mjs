// Builds a fully static export of the public landing for Cloudflare Pages.
// The admin panel, API routes and proxy need a server, so they are temporarily
// moved out of the app tree during the export and always restored afterwards.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";

const STASH = ".cf-stash";

const MOVES = [
  ["app/api", `${STASH}/api`],
  ["app/[locale]/admin", `${STASH}/admin`],
  ["components/admin", `${STASH}/components-admin`],
  ["proxy.ts", `${STASH}/proxy.ts`],
];

function stash() {
  mkdirSync(STASH, { recursive: true });
  for (const [src, dst] of MOVES) {
    if (existsSync(src)) renameSync(src, dst);
  }
}

function restore() {
  for (const [src, dst] of MOVES) {
    if (existsSync(dst)) renameSync(dst, src);
  }
  rmSync(STASH, { recursive: true, force: true });
}

try {
  stash();
  rmSync("out", { recursive: true, force: true });
  execSync("next build", {
    stdio: "inherit",
    env: { ...process.env, CF_EXPORT: "1" },
  });
  console.log("\n✓ Static export ready in ./out");
} finally {
  restore();
  console.log("✓ Restored server routes (app/api, app/[locale]/admin, proxy.ts)");
}
