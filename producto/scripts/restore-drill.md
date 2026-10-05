# Ensayo de restauración (lista de comprobación)

**Estado: pendiente de ensayo con la cuenta del propietario.** Este ensayo necesita la cuenta de Neon (crear ramas, restaurar) y no se ha podido hacer desde el entorno de desarrollo. Los tiempos de abajo están **en blanco a propósito**: se rellenan con lo que se mida, no se estiman.

Procedimiento que se ensaya: [`docs/COPIAS-Y-RESTAURACION.md`](../docs/COPIAS-Y-RESTAURACION.md), apartado 4 (recuperar un albarán borrado) y, si se quiere, apartado 5 (volver toda la base a un punto).

| | |
| --- | --- |
| Fecha del último ensayo | — |
| Quién lo hizo | — |
| Plan de Neon y ventana de historial que muestra la consola | — |
| Resultado | — |

## Reglas del ensayo

- **Nunca en producción.** Se trabaja sobre una rama de Neon creada para el ensayo, con una copia de la app apuntando a ella y un negocio inventado.
- La app del ensayo va **sin claves de producción**: `EMAIL_PROVIDER=dev`, `OCR_PROVIDER=mock`, sin `STRIPE_*`, y con un `AUTH_SECRET` propio. Ningún correo ni cobro reales.
- Las ramas contienen datos de clientes (la de producción) hasta que se borran: la cadena de conexión no se pega en ningún chat, correo ni archivo del repositorio, y todas las ramas del ensayo se borran al terminar.
- Un cronómetro y esta hoja delante. Se apunta la hora UTC de cada paso.

## Preparación

- [ ] Crear en Neon la rama `ensayo-restauracion` a partir de la rama de producción (o de una de vista previa).
- [ ] Anotar el plan de Neon y la ventana de historial que enseña la consola: ______
- [ ] Arrancar la app contra esa rama (en local: `DATABASE_URL=<cadena de la rama> EMAIL_PROVIDER=dev OCR_PROVIDER=mock npm run dev`, tras `npm run migrate`; o un despliegue de vista previa con esas variables).
- [ ] Registrar un negocio de prueba («Negocio de ensayo») y completar el alta.
- [ ] Guardar un albarán con la lectura de ejemplo (Compras → Subir → *Probar con un albarán de ejemplo* → confirmar).
- [ ] Anotar lo que había **antes de borrar**: proveedor ______, número ______, fecha ______, total ______, nº de líneas ______; y de un artículo del albarán: stock ______, precio medio ______.
- [ ] Hora T0 (UTC) en que quedó guardado: ______

## El incidente

- [ ] Esperar al menos un par de minutos (para que el punto de restauración quede claramente entre T0 y el borrado).
- [ ] Borrar el albarán desde la app (Compras → ficha → *Borrar albarán*, elegir lo que pida). Hora T1 (UTC): ______
- [ ] Comprobar que el borrado consta: la consulta de `audit_log` del apartado 3 de `COPIAS-Y-RESTAURACION.md` devuelve la fila con su hora.

## La recuperación (aquí empieza el cronómetro del RTO)

| Paso | Hora de inicio (UTC) | Hora de fin (UTC) | Duración | Notas |
| --- | --- | --- | --- | --- |
| 1. Detectar y averiguar qué albarán es y cuándo se borró (apartado 3) | | | | |
| 2. Crear la rama de recuperación en el punto elegido (T1 menos unos minutos) | | | | |
| 3. Comprobar en la rama que el albarán y sus líneas existen (apartado 4, paso 3) | | | | |
| 4. Comprobar en producción (la rama de ensayo) que no está | | | | |
| 5. Volver a apuntarlo a mano en la app con los datos de la rama | | | | |
| 6. Comprobar el resultado (total, líneas, stock y precio medio) | | | | |
| **Total (RTO medido)** | | | | |

- [ ] El total, el stock y el precio medio del artículo **coinciden** con lo anotado antes de borrar. Si no coinciden: ______
- [ ] El procedimiento escrito se pudo seguir sin saltarse nada ni improvisar. Lo que faltaba o estaba mal: ______
- [ ] La foto original del albarán **no** se recupera (Blob no guarda copias): confirmado.

## Opcional: volver toda la base a un punto (escenario 2)

- [ ] En la rama de ensayo, restaurar a un punto anterior a T1 (apartado 5): duración ______; cómo llama la consola a la copia de respaldo que deja: ______
- [ ] El albarán está otra vez, tal cual (con su stock y su precio medio), sin volver a apuntarlo.
- [ ] Se comprobó qué hay que revisar después (sesiones, plan de los negocios, archivos).

## Al terminar

- [ ] Borrar la rama de recuperación y la rama `ensayo-restauracion`.
- [ ] Parar y borrar la app de ensayo y su `.env.local`.
- [ ] Copiar los tiempos medidos al apartado 2 de `docs/COPIAS-Y-RESTAURACION.md` (RPO y RTO) y la ventana de historial al apartado 6, y quitar los ⏳ que se hayan confirmado.
- [ ] Corregir el procedimiento con lo que fallara.
- [ ] Decidir lo pendiente del apartado 7 (copia fuera de Neon, copias de Blob) y anotarlo en `docs/DECISIONES.md`.
- [ ] Anotar la fecha del ensayo arriba. Repetirlo antes de pasar Stripe a producción y cuando cambie el plan de Neon o el esquema de forma importante.
