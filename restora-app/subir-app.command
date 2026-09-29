#!/usr/bin/env bash
# Sube la APP (prototipo) a Cloudflare Pages, proyecto "restora-app" -> app.restoraapp.app.
# En Mac: doble clic (o `bash subir-app.command`). En Linux: `bash subir-app.command`.
set -e
cd "$(dirname "$0")"

echo "=========================================================="
echo "   RESTORA - subir la APP"
echo "   Carpeta: $(pwd)"
echo "=========================================================="

command -v node >/dev/null 2>&1 || { echo "[ERROR] Node.js no esta instalado. Descarga: https://nodejs.org"; exit 1; }
[ -f "site/index.html" ] || { echo "[ERROR] No encuentro la carpeta 'site'. Pon este script junto a 'site' y 'wrangler.toml'."; exit 1; }

echo "Comprobando sesion de Cloudflare (la primera vez se abre el navegador)..."
npx wrangler whoami >/dev/null 2>&1 || npx wrangler login

echo "Publicando la APP en Cloudflare Pages..."
npx wrangler pages deploy site --project-name restora-app

echo ""
echo "APP PUBLICADA. Puede tardar 1-2 min en verse."
echo "Recuerda: D1 y los secretos APP_PASSWORD / APP_SECRET van en el panel de Cloudflare."
