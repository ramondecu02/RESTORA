# Publicar el MVP de RESTORA, paso a paso

Qué vas a conseguir: la **app real** (carpeta `producto/`, la que sigue el diseño aprobado en los
artifacts) funcionando en internet. Primero en una dirección de prueba de Vercel y después en
**app.restoraapp.app**.

Idea clave: a partir de ahora **la app se publica sola**. Cada vez que se suben cambios a GitHub
(rama `claude/new-session-c92ohx`, la principal del repositorio), Vercel la vuelve a publicar. Para la
app ya no hace falta el `.bat`; el `.bat` sigue sirviendo para la web de marketing (opción P).

Necesitas: tu cuenta de GitHub (dueña de `ramondecu02/RESTORA`), tu email y Node.js en el ordenador
(ya lo tienes, lo usa el `.bat`).

---

## Fase 1 · La app funcionando en una dirección de prueba (30-60 min)

### Paso 1. Crea el proyecto en Vercel
1. Entra en **vercel.com** → *Sign Up* → *Continue with GitHub* (con la cuenta dueña del repositorio).
2. *Add New… → Project* → busca **RESTORA** → *Import*.
3. En **Root Directory** pulsa *Edit* y elige la carpeta **`producto`**. Es lo más importante: si no,
   Vercel publicaría la web de marketing.
4. **Application Preset**: tiene que poner **Next.js**. Si pone *Services* («No detected services»),
   ábrelo y elige **Next.js**. No uses el botón *Copy prompt*. No toques *Build* ni *Install*.
5. Pulsa *Deploy*. **Va a fallar** con «Falta DATABASE_URL». Es normal: aún no hay base de datos.

✅ Tienes un proyecto en Vercel (aunque el primer despliegue salga en rojo).

### Paso 2. Base de datos (Neon) y archivos (Blob)
1. En el proyecto → pestaña **Storage** → *Create Database* → **Neon** → región **Frankfurt
   (AWS eu-central-1)** → crear y conectar a todos los entornos. Si te pide cuenta de Neon, créala con
   tu email.
2. Otra vez **Storage** → *Create* → **Blob** → crear y conectar.

Estas dos rellenan solas `DATABASE_URL`, `DATABASE_URL_UNPOOLED` y `BLOB_READ_WRITE_TOKEN`. No tienes
que copiar nada.

### Paso 3. Correo (Resend)
1. **resend.com** → regístrate con **tu email** (si ya tienes cuenta porque la usa el formulario de la
   web, usa esa).
2. *API Keys* → *Create API Key* → permiso *Sending access* → copia la clave (empieza por `re_`).

Para esta primera prueba no hace falta tocar el DNS: Resend deja enviar desde `onboarding@resend.dev`,
pero **solo a tu propio email**. Abrirlo a cualquiera es la Fase 3.

### Paso 4. Tu clave secreta
Abre PowerShell y ejecuta:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado (64 caracteres). Guárdalo en un sitio seguro y no lo cambies después.

### Paso 5. Variables en Vercel
Proyecto → **Settings → Environment Variables**. Añade estas (entornos *Production* y *Preview*):

| Nombre | Valor |
| --- | --- |
| `AUTH_SECRET` | la clave del paso 4 |
| `RESEND_API_KEY` | la clave del paso 3 (`re_…`) |
| `EMAIL_PROVIDER` | `resend` |
| `EMAIL_FROM` | `RESTORA <onboarding@resend.dev>` |
| `TRIAL_DAYS` | `90` |

La lectura automática de albaranes (IA) la activamos en la Fase 2. Mientras, las compras se apuntan a
mano y los **albaranes de ejemplo** se leen igual.

### Paso 6. Publica de nuevo
**Deployments** → el último (en rojo) → menú **…** → *Redeploy*. En 2-3 minutos debe salir
**Ready** en verde. Pulsa *Visit*: verás la entrada de RESTORA en una dirección tipo
`restora-xxxx.vercel.app`.

### Paso 7. Prueba el bucle del MVP
1. **Probar gratis** → regístrate **con tu propio email** (el de Resend).
2. Te llega el código → confírmalo → da de alta tu local.
3. **Compras → Subir albarán → Probar con un albarán de ejemplo** → revisa → guarda.
4. **Escandallos → Nuevo** → elige una plantilla (p. ej. Tortilla de patatas) → mira su coste.
5. **Carta** → mira el margen de ese plato.

✅ Si todo esto funciona, **el MVP está publicado**. Manda la dirección y una captura de «Hoy».

**Si el código no llega:** la pantalla lo dice («No hemos podido enviarte el correo…»). En Vercel →
**Logs**, busca `[correo]`:
- `Sin RESEND_API_KEY` → falta la variable del paso 5 (o no has hecho *Redeploy* después).
- Un error `403` de Resend → te has registrado con un email distinto al de tu cuenta de Resend
  (normal hasta la Fase 3).

---

## Fase 2 · Lectura automática de albaranes con IA
1. **console.anthropic.com** → crea la cuenta → *Billing*: añade saldo (10-20 €) y **pon un límite de
   gasto mensual** (p. ej. 30 €) desde el primer día.
2. *API Keys* → *Create Key* → copia la clave (empieza por `sk-ant-`).
3. Vercel → *Environment Variables*: `ANTHROPIC_API_KEY` = la clave y `OCR_PROVIDER` = `anthropic`.
   Después, *Redeploy*.

✅ Haz una foto a un albarán real tuyo: se lee en unos segundos. En Escandallos aparece además
«Sugerir ingredientes con IA». Coste orientativo: céntimos por albarán.

---

## Fase 3 · Tu dominio app.restoraapp.app y correo para cualquiera
1. Vercel → **Settings → Domains** → *Add* `app.restoraapp.app`. Vercel te dice qué registro crear
   (normalmente **CNAME `app` → `cname.vercel-dns.com`**).
2. Si `app.restoraapp.app` está asignado a un proyecto de **Cloudflare Pages** (el prototipo antiguo),
   quítalo allí primero: Pages → ese proyecto → *Custom domains* → *Remove*.
3. Cloudflare → `restoraapp.app` → **DNS** → crea (o edita) el registro `app` con lo que te dio Vercel y
   la **nube en gris («DNS only»)**; si no, Vercel no puede emitir el certificado.
4. Resend → **Domains** → *Add* `restoraapp.app` → crea en Cloudflare DNS los registros que te indica
   (nube gris) → *Verify*.
5. Vercel → variables: `EMAIL_FROM` = `RESTORA <hola@restoraapp.app>` y `APP_URL` =
   `https://app.restoraapp.app`. Después, *Redeploy*.

✅ https://app.restoraapp.app abre RESTORA y cualquier persona puede registrarse.

Después cambio los botones «Entrar» y «Probar gratis» de la web para que lleven a la app.

---

## Fase 4 · Cobrar (cuando tengas los primeros clientes)
Stripe: sección 8 de `DESPLIEGUE.md`. Para el piloto no hace falta. Ojo: Vercel pide su plan **Pro**
en cuanto el uso es comercial (cobrar a clientes).

---

## Si algo falla
- **Deployments** en rojo → ábrelo y copia las últimas líneas del registro.
- La app abre pero algo no va → **Logs**.
- En los dos casos, pásame lo que ves (texto o captura) y lo resolvemos.

La referencia técnica completa (copias de seguridad, entornos de vista previa, operación) está en
`DESPLIEGUE.md`.
