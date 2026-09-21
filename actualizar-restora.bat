@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title RESTORA - Actualizar y ver la web

REM ============================================================
REM  Actualiza el codigo, reconstruye la web estatica y te deja
REM  verla en local o publicarla en Cloudflare Pages.
REM
REM  Coloca este .bat en la carpeta del proyecto RESTORA
REM  (la misma que tiene package.json) y haz doble clic.
REM ============================================================

cd /d "%~dp0"

set "RAMA=claude/new-session-c92ohx"
set "PUERTO=8788"

echo.
echo ==========================================================
echo    RESTORA - actualizar la web
echo    Carpeta: %CD%
echo ==========================================================
echo.

REM --- Comprobaciones basicas ---
where git >nul 2>&1 || (echo [ERROR] Git no esta instalado o no esta en el PATH.& echo Descarga: https://git-scm.com/download/win & goto :fin)
where node >nul 2>&1 || (echo [ERROR] Node.js no esta instalado o no esta en el PATH.& echo Descarga: https://nodejs.org  ^(version 20 o superior^) & goto :fin)
if not exist package.json (echo [ERROR] No encuentro package.json. Pon este .bat dentro de la carpeta del proyecto RESTORA.& goto :fin)

REM --- 1) Traer los ultimos cambios ---
echo [1/4] Descargando los ultimos cambios de GitHub...
call git fetch origin || goto :error_git
call git checkout %RAMA% || goto :error_git
call git pull --ff-only origin %RAMA% || goto :error_git
echo     OK.
echo.

REM --- 2) Instalar dependencias ---
echo [2/4] Instalando dependencias (npm install)...
call npm install || goto :error_npm
echo     OK.
echo.

REM --- 3) Construir la web estatica ---
echo [3/4] Construyendo la web (npm run build:cf)...
call npm run build:cf || goto :error_build
echo     OK. Web generada en la carpeta "out".
echo.

REM --- 4) Que quieres hacer ---
:menu
echo ==========================================================
echo    [V] VER la web en local  (http://localhost:%PUERTO%)
echo    [P] PUBLICAR en Cloudflare Pages (restoraapp.app)
echo    [S] Salir
echo ==========================================================
choice /c VPS /n /m "Elige una opcion [V/P/S]: "
if errorlevel 3 goto :fin
if errorlevel 2 goto :publicar
if errorlevel 1 goto :ver
goto :menu

:ver
echo.
echo Abriendo http://localhost:%PUERTO% en el navegador...
echo Cuando termines, cierra esta ventana o pulsa Ctrl+C para detener el servidor.
echo.
start "" "http://localhost:%PUERTO%/es"
call npx wrangler pages dev out --port %PUERTO% --compatibility-date 2026-09-14
goto :fin

:publicar
echo.
echo Vas a PUBLICAR la web en Cloudflare Pages (produccion).
echo La primera vez te pedira iniciar sesion en Cloudflare (se abre el navegador).
echo.
choice /c SN /n /m "Seguro que quieres publicar? [S/N]: "
if errorlevel 2 goto :menu
echo.
echo Comprobando sesion de Cloudflare...
call npx wrangler whoami >nul 2>&1 || call npx wrangler login
echo Publicando...
call npx wrangler pages deploy out || goto :error_deploy
echo.
echo ==========================================================
echo    PUBLICADO. Puede tardar 1-2 min en verse en la web.
echo    Revisa la URL que muestra Cloudflare arriba.
echo ==========================================================
goto :fin

:error_git
echo.
echo [ERROR] No se pudieron traer los cambios de GitHub.
echo   - Si tienes cambios locales sin guardar, guardalos o descartalos.
echo   - Comprueba tu conexion y el acceso al repositorio.
goto :fin

:error_npm
echo.
echo [ERROR] Fallo "npm install". Revisa el mensaje de arriba.
goto :fin

:error_build
echo.
echo [ERROR] Fallo la construccion de la web. Revisa el mensaje de arriba.
goto :fin

:error_deploy
echo.
echo [ERROR] Fallo la publicacion en Cloudflare.
echo   - Asegurate de haber iniciado sesion: npx wrangler login
echo   - Comprueba el binding D1 y el nombre del proyecto en wrangler.toml
goto :fin

:fin
echo.
pause
endlocal
