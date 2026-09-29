@echo off
setlocal
chcp 65001 >nul
title RESTORA - Subir la APP a Cloudflare (app.restoraapp.app)

REM ============================================================
REM  Sube la APP (prototipo) a Cloudflare Pages, proyecto
REM  "restora-app" -> app.restoraapp.app.
REM
REM  Pon este .bat en la misma carpeta que "site" y "wrangler.toml"
REM  y haz doble clic (o ejecutalo desde el terminal).
REM ============================================================

cd /d "%~dp0"

echo.
echo ==========================================================
echo    RESTORA - subir la APP
echo    Carpeta: %CD%
echo ==========================================================
echo.

where node >nul 2>&1 || (echo [ERROR] Node.js no esta instalado o no esta en el PATH.& echo Descarga: https://nodejs.org  ^(version 20 o superior^) & goto :fin)
if not exist "site\index.html" (echo [ERROR] No encuentro la carpeta "site". Pon este .bat junto a "site" y "wrangler.toml".& goto :fin)

echo Comprobando sesion de Cloudflare (la primera vez se abre el navegador)...
call npx wrangler whoami >nul 2>&1 || call npx wrangler login

echo.
echo Publicando la APP en Cloudflare Pages...
call npx wrangler pages deploy site --project-name restora-app || goto :error

echo.
echo ==========================================================
echo    APP PUBLICADA. Puede tardar 1-2 min en verse.
echo    Revisa la URL que muestra Cloudflare arriba.
echo.
echo    Recuerda: el binding D1 y los secretos APP_PASSWORD y
echo    APP_SECRET se configuran en el panel de Cloudflare
echo    (Pages -^> restora-app -^> Settings), no en este .bat.
echo ==========================================================
goto :fin

:error
echo.
echo [ERROR] Fallo la publicacion.
echo   - Inicia sesion:  npx wrangler login
echo   - Comprueba que el proyecto "restora-app" existe en tu cuenta.

:fin
echo.
pause
endlocal
