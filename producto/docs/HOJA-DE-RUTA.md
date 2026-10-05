# Hoja de ruta de RESTORA

Dónde estamos (octubre de 2026):

- ✅ La app está publicada en **https://app.restoraapp.app** (Vercel + base de datos Neon + archivos en Blob).
- ✅ El correo sale desde `hola@restoraapp.app`, con el dominio verificado en Resend: puede registrarse cualquiera.
- ✅ Prueba gratuita de **14 días** sin tarjeta. Al terminar sin suscripción, la app se **bloquea**: solo quedan la
  facturación (suscribirse), la cuenta (descargar los datos, borrar el negocio) y salir.
- ✅ La web tiene «Entrar» y «Probar gratis 14 días», que llevan a la app (falta publicarla con el `.bat`, opción P).

---

## 1. Ahora mismo (antes de anunciar el registro)

1. **Vercel → Settings → Environment Variables → `TRIAL_DAYS`**: bórrala (o ponla a `14`) y haz *Redeploy*.
   Si sigue en `90`, los negocios nuevos tendrán 90 días de prueba.
2. **Lectura de albaranes con IA** (Fase 2 de `PUBLICAR-MVP.md`): `ANTHROPIC_API_KEY` en Vercel, con un límite de
   gasto mensual en console.anthropic.com. Sin ella, los albaranes reales hay que apuntarlos a mano, y es lo primero
   que probará quien se registre.
3. **Publicar la web**: `actualizar-restora.bat` → opción **P**.

## 2. Pasarela de pago y suscripción mensual (pendiente)

**Tiene que estar lista antes de que terminen las primeras pruebas (14 días desde el primer registro).**

La app ya tiene hecho lo suyo: el botón «Suscribirme» (pago con Stripe), el portal para cambiar la tarjeta, descargar
facturas o cancelar, el aviso de Stripe que activa o cancela la suscripción, y el bloqueo al terminar la prueba.

Falta configurarlo (sección 8 de `DESPLIEGUE.md`):

1. Cuenta en **stripe.com** con tus datos fiscales y tu cuenta bancaria.
2. Producto «RESTORA» con **precio mensual recurrente** (89 €/mes). Decidir si el precio lleva el IVA incluido
   (Stripe Tax o un 21 % fijo) y si la oferta de socio fundador va como cupón.
3. Aviso (webhook) a `https://app.restoraapp.app/api/stripe/webhook` y portal de cliente activado.
4. Variables en Vercel: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` → *Redeploy*.
5. Pago de prueba con la tarjeta `4242 4242 4242 4242` y, después, el paso a modo real.
6. Vercel **Pro** en cuanto se cobra a clientes (uso comercial).
7. Facturas con NIF del cliente: revisarlo con tu asesor (Stripe puede emitirlas).

**Mientras no haya Stripe**, quien termina la prueba ve un WhatsApp y un email para activar la suscripción. Para
activarla a mano: Neon → *SQL Editor*:

```sql
-- Dar 30 días más de prueba a un negocio
update organizations set trial_ends_at = now() + interval '30 days' where name = 'Nombre del restaurante';
-- O dejarlo como suscrito (si te paga por transferencia)
update organizations set plan_status = 'active' where name = 'Nombre del restaurante';
```

## 3. Que todo funcione de verdad (revisión pantalla a pantalla)

Recorrido completo con una cuenta real, apuntando cada fallo o cosa que no se entienda:

- Alta → albarán real (con IA) → revisar y guardar → precios de artículos y proveedores.
- Escandallos (plantillas, sugerencia de ingredientes con IA) → Carta (márgenes, carta imprimible).
- Inventario (stock, mínimos) → pedido a proveedor.
- Ventas: importar el CSV del TPV → consumo y food cost real.
- Hoy: avisos y cifras.
- Ajustes: Mi local, equipo (invitar por email, roles), exportar datos, borrar negocio, tema claro/oscuro.
- Correos: verificación, invitaciones y recuperar la contraseña.

Lo que salga se arregla por orden de importancia.

## 4. Diseño de la interfaz

Repaso visual en móvil y escritorio partiendo de los prototipos aprobados (artifacts): jerarquía, densidad de
información, gráficos de Hoy, estados vacíos y primeros pasos. Se hace pantalla a pantalla con capturas antes y después.

## 5. App nativa o programa para cada local

De menos a más trabajo:

1. **App instalable (PWA)**: icono en el móvil, la tablet o el ordenador y pantalla completa, sin tiendas ni
   instalaciones. Es lo más rápido (días) y sirve para todos. **Recomendado para empezar.**
2. **App en App Store y Google Play** (Capacitor): la misma app dentro de una app nativa, con la cámara del móvil
   para los albaranes. Semanas de trabajo y cuentas de desarrollador (Apple 99 $/año, Google 25 $ una vez).
3. **Programa de escritorio** (Tauri o Electron): ventana propia en el ordenador o la tablet de la cocina, con acceso
   directo e impresora. Semanas.

Hoy cada local ya entra con su cuenta, su equipo y sus roles. Un «modo cocina» (una tablet fija con lo justo:
subir albarán, stock, pedido) se puede hacer como una vista más de la app.

## 6. Otros pendientes

- Que las respuestas a los correos de la app lleguen a `hola@restoraapp.com`.
- Aviso por correo unos días antes de que termine la prueba (ahora solo se avisa dentro de la app).
- Retirar el proyecto antiguo de Cloudflare Pages (`restoraapp.pages.dev`) cuando ya no haga falta.
- Copias de seguridad: revisar el historial que guarda el plan de Neon (sección 10 de `DESPLIEGUE.md`) y **ensayar la restauración** con tu cuenta de Neon (`docs/COPIAS-Y-RESTAURACION.md`, `scripts/restore-drill.md`): redactada, sin ensayar.
