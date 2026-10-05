# Auditoría de conversión y de veracidad de la web (5 de octubre de 2026)

> Task 29 del plan (`docs/superpowers/plans/2026-10-05-restora-roadmap.md`). Dos revisiones: (1) cada punto del encargo del propietario sobre la web, con su estado y la prueba;
> (2) cada afirmación de la web sobre lo que el producto hace, cruzada con el código del producto. Lo que dependía solo del propietario está al final, en una lista.
> Las pruebas que vigilan lo corregido se ejecutan con `npm run test:web` (19 comprobaciones).

## 1. Estado de cada punto del encargo

| Punto | Estado | Cómo se comprueba |
|---|---|---|
| Sitemap y robots | ✓ | `app/sitemap.ts` (11 rutas × 2 idiomas, con hreflang) y `app/robots.ts` (veta `/marca`, el panel y `/api/`). Prueba: `tests/web/utm-y-seo.test.ts` |
| HTTPS | ✓ | `public/_headers` (HSTS). Cloudflare Pages sirve solo por HTTPS |
| Velocidad (móvil) | ◐ | Lighthouse móvil sobre la exportación servida con compresión, CPU 4× más lenta: **inicio 93–94, Sobre nosotros 94–95, Precios 97–98, Contacto 97**; accesibilidad, buenas prácticas y SEO, 100. LCP simulado 2,3–3,1 s (el criterio del plan, < 2,5 s, solo lo cumple Precios en simulación; en un portátil real la foto principal pinta a ~0,3 s). Falta medirlo con visitantes reales cuando se active Cloudflare Web Analytics |
| Chat | ✓ | Botón flotante de WhatsApp (`components/site/floating-actions.tsx`); no hay chat propio |
| Responsive 375 / 768 / 1440 | ✓ | Sin desbordes ni imágenes rotas en ES y CA a 390, 768 y 1280 px (comprobado con Playwright sobre la exportación) |
| Sobre nosotros | ◐ | Página con foto de ambientación sin caras. El cargo y la biografía de Ramon **no se enseñan** hasta que sean reales (`ABOUT_BIO_READY` en `lib/site.ts`) |
| Formulario de contacto | ✓ en código | Formulario de demo, contacto rápido y checklist → `functions/api/leads.js` (campo trampa, 5 envíos por minuto y por IP, D1 y aviso por Resend). **Hay que comprobar en producción** que `RESEND_API_KEY` y `LEAD_NOTIFY_TO` están en Cloudflare |
| Redes sociales reales | ✗ | Aún no existen: el pie no enseña ninguna (`SOCIAL_LINKS` en `lib/site.ts`). Las cuentas las crea el propietario; el kit está en `docs/marketing/marca/` |
| Sellos verídicos | ◐ | «Datos alojados en la UE» está oculto hasta confirmar la región real (`TRUST_EU_HOSTING = false`). «Cumplimiento RGPD» sigue puesto y no se puede demostrar mientras falten los datos legales |
| Datos de contacto visibles | ◐ | Correo, teléfono y WhatsApp en el pie y en Contacto. **El teléfono es el antiguo** (+34 640 648 985): falta el número nuevo |
| Botón de volver arriba | ✓ | `components/site/floating-actions.tsx` |
| FAQs | ✓ | 17 preguntas agrupadas, con datos estructurados `FAQPage` (`lib/structured-data.ts`) |
| Políticas legales completas | ✗ | Aviso legal, privacidad, cookies y RGPD existen y ya describen los datos y los encargados reales del producto, pero enseñan el bloque «Pendiente de completar» (razón social, NIF, domicilio…). Faltan además las **condiciones de contratación, la cancelación y reembolso** y el contrato de encargo: esperan los datos fiscales y los planes (D1) |
| Newsletter con incentivo | ✓ | Checklist de food cost (PDF de una página en ES y CA), generada con `npm run checklist` desde `scripts/checklist.mjs` |
| Botones de compartir | ✓ | `components/site/share-band.tsx` |
| Vídeo de presentación | ◐ | Miniatura puesta y «Próximamente»; el vídeo (grabación de pantalla) no existe todavía |

## 2. Veracidad: qué prometía la web frente a lo que hace el producto

62 afirmaciones revisadas (17 OK, 23 PARCIAL, 6 NO EXISTE, 3 FUTURO, 10 NO VERIFICABLE, 2 omisiones). **Corregido en esta tanda**, en castellano y en catalán:

| Prometía | El producto hace | Cambio |
|---|---|---|
| Varios locales, «comparar entre locales», perfil «Pequeño grupo» | Un local por negocio (D2 sin decidir) | FAQ dice que hoy es un local por cuenta, sin vista de grupo; perfil retirado de Precios |
| «Se compara con todo tu histórico», «tercera subida seguida», «en seis semanas» | Compara con la compra anterior | Cómo funciona, demos de Funcionalidades y de la home: «frente a tu compra anterior» |
| Etapa «Decisión»: tres salidas con su efecto calculado | Herramientas sueltas (cambiar de proveedor, ración, PVP objetivo), cada una con su cálculo | «Tres herramientas, y tú eliges» y «ahorro estimado al año» |
| «Caso real», «ejemplo real» | Los casos de las demos son de ejemplo | «Caso de ejemplo», «ejemplo ilustrativo» y la etiqueta «Datos de ejemplo» en el panel de la home, las tarjetas sobre las fotos y el resumen de ejemplo |
| «Entra un albarán. Nada más.» | Se lee, queda «Por revisar» y la persona confirma | «Tú solo confirmas»; solo foto o PDF (o a mano) |
| «Única vez que tecleas», «se mantiene solo», «se construye solo» | Se montan los escandallos (plantillas y sugerencias) y todo se actualiza al confirmar cada albarán | Textos de Cómo funciona |
| «El fin de semana pesa el 40 % de las ventas», «Alerta antes de la rotura» | Cobertura en días y aviso «bajo mínimo»; no hay previsión | Funcionalidades: aviso cuando un producto baja de su mínimo |
| PDF: «para que estas doce casillas se marquen solas» | Cubre varias, no se marca nada solo | Checklist regenerada: «…para que varias de estas casillas las tengas ya calculadas» |
| Panel de ejemplo con «Costes», «Informes», «Configuración» y «Distribución de costes» | Menú real: Hoy, Avisos, Compras… | Se retira el panel dibujado: la home enseña la pantalla real de Avisos (y la de Hoy en el móvil) y Funcionalidades una galería con Hoy, Compras, Escandallos y Proveedores (`npm run capturas`) |
| «Lubina a la brasa» con costes distintos en la home y en Funcionalidades | — | Los mismos números en las dos |
| «Al terminar te suscribes por meses» | Con Stripe apagado la suscripción se activa a mano | «Si quieres seguir, activamos tu suscripción mensual» (se revierte cuando se encienda Stripe) |
| «Los datos no se comparten con terceros» | La foto del albarán se envía al proveedor de IA que la lee | «No se venden ni se ceden a otros restaurantes ni a proveedores» |
| «Cualquier referencia sectorial **sería** anónima» | La capa anónima de precios ya existe (solo con 5 restaurantes o más) | Dicho tal como es, en la FAQ y en Sobre nosotros |
| «Puedes exportar y borrar todo» | CSV de 5 áreas; el propietario borra el negocio | Dicho tal como es |
| Privacidad y RGPD: datos recogidos, papel de encargado «cuando esté operativo» y solo Cloudflare y un proveedor de correo | Contacto rápido (nombre, correo), checklist (correo); producto con Vercel, Neon, Blob, Anthropic, Resend y Stripe | Textos legales ajustados a lo real. **Redacción a validar por el propietario o su asesor** |
| La app, ¿en qué idioma? (omisión) | Solo castellano | Pregunta nueva en la FAQ |
| Texto oculto en el código de todas las páginas (previsión, detección de anomalías, notificaciones, conexión con TPV, FAQ duplicada) | No existe | Borrado; la barra de navegación solo recibe sus etiquetas |

Vigilado por `tests/web/promesas.test.ts` y `tests/web/no-founder.test.ts`.

## 3. Lo que solo puede confirmar el propietario

1. **`ANTHROPIC_API_KEY` en producción**: sin ella «empieza con una foto de un albarán» no funciona.
2. **`TRIAL_DAYS`** en Vercel: vacía o 14.
3. **Suscripción**: cuándo se enciende Stripe, planes y precio (D1); si «sin permanencia», «baja cuando quieras», «no se cobra nada más» y «no cobramos alta» son compromisos reales; cómo se da de baja a quien paga.
4. **Plazos y servicio**: respuesta en 48 h; demo de 30 minutos con un plato del cliente; «sin comercial de por medio».
5. **Arranque asistido**: «te acompañamos en el arranque», «cargamos contigo recetas y proveedores» y migrar el Excel «durante la primera semana». El producto no tiene importador: lo haría él a mano.
6. **«Hecho en Cataluña»**.
7. **Alojamiento**: región real de Neon, Vercel Blob, Cloudflare D1 y Pages, Resend y Stripe, y dónde procesa Anthropic, antes de activar «Datos alojados en la UE».
8. **RGPD y textos legales**: razón social, NIF, domicilio, responsable, plazo de conservación (también de las fotos), contrato o condiciones, encargados, y si la capa anónima será opt-out, opt-in o con interruptor. El alta de la app enlaza a páginas legales que aún no cubren el producto.
9. **Cloudflare Web Analytics**: si se activa, actualizar las políticas de cookies y de privacidad (hoy dicen que no hay analítica).
10. **Newsletter**: cómo se atiende «te das de baja cuando quieras» (no hay sistema de envío en el repositorio).
11. **Teléfono nuevo** y **perfiles de redes**.
12. **Calidad de lectura de albaranes** con documentos reales (criterio P7); la web no da cifras, pero «Entra un albarán…» presupone fiabilidad.
13. **Rangos de «A quién le encaja»** (p. ej. «Entre 40 y 120 comensales/día»).
14. **Varios locales (D2)**: si se hacen, la FAQ y el perfil «Más de un local» podrán volver a prometerse (quitar la frase de `tests/web/promesas.test.ts` a la vez).
15. **Textos en castellano dentro de la web catalana**: el panel de ejemplo y las tarjetas de la home están en castellano a propósito (la app solo está en castellano); decidir si se traducen.

## 4. Cómo repetir las comprobaciones

- Pruebas: `npm run test:web` (imágenes, pendientes, fundadores, promesas, utm, SEO y datos estructurados).
- Velocidad: `npm run build:cf`, servir `out/` con compresión y pasar Lighthouse móvil (sin compresión la home sale muy por debajo; el servidor de pruebas debe imitar a Cloudflare).
- Después de cambiar la checklist: `npm run checklist` regenera los dos PDF.
