# App RESTORA (producto) — puesta en marcha

Esta carpeta es **la aplicación de gestión** (distinta de la web de marketing).
Es una app de **un restaurante** con **login** y **datos guardados en la nube**
(Cloudflare Pages + base de datos D1). Se despliega **subiendo un ZIP** al panel,
igual que la web.

- `site/` → lo que se sube (la app + la carpeta `functions/` con el backend).
- `site/functions/` → backend: login, logout y guardado del estado en D1.
- `schema.sql` → tabla de datos (la app la crea sola; solo por referencia).
- `wrangler.toml` → configuración (deploy opcional por terminal).

## Cómo funciona
- Al entrar pide **contraseña** (una sola para el restaurante).
- Los datos (compras, inventario, escandallos, carta…) se guardan en la nube,
  así que **se comparten entre personas y dispositivos**. Se guarda solo, con un
  indicador "Guardado ✓" arriba.

## Puesta en marcha (una vez, en el panel de Cloudflare)

1. **Crear el proyecto**: Workers & Pages → *Create* → *Pages* → *Upload assets*.
   Nombre: `restora-app`. Arrastra el ZIP de la app → *Deploy*.
2. **Crear la base de datos**: Storage & Databases → *D1* → *Create database* →
   nombre `restora-app-db`. (No hace falta ejecutar SQL: la app crea su tabla sola.)
3. **Conectar la base al proyecto**: Pages → `restora-app` → *Settings* →
   *Bindings* → *Add* → *D1 database*:
   - Variable name: `DB`
   - D1 database: `restora-app-db`
4. **Poner contraseña y secreto**: Pages → `restora-app` → *Settings* →
   *Variables and Secrets* → añade (tipo *Secret*):
   - `APP_PASSWORD` → la contraseña para entrar en la app
   - `APP_SECRET`   → una cadena larga y aleatoria (firma las sesiones)
5. **Re-desplegar** para que apliquen la base y los secretos: *Deployments* →
   en el último, *Retry deployment* (o vuelve a subir el ZIP).
6. (Opcional) **Dominio propio**: *Custom domains* → p. ej. `app.restoraapp.app`.

Listo: abre la URL, introduce la contraseña y ya guarda en la nube.

## Actualizar la app más adelante
Se genera un ZIP nuevo y se sube en *Deployments → Create deployment*
(igual que la web). La base de datos y los secretos se mantienen.

## Notas de seguridad
- Todo va por HTTPS; la sesión es una cookie firmada (HMAC), válida 30 días.
- La contraseña y el secreto viven **solo** en Cloudflare (Secrets), nunca en el código.
- `APP_SECRET.txt` (si existe en esta carpeta) NO se sube a git.
