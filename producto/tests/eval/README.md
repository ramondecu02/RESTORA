# Evaluación de la lectura de albaranes (criterio P7 de «MVP terminado»)

Mide con **documentos reales** cuántas líneas lee bien la lectura con IA. Hasta que haya documentos reales, solo hay casos sintéticos (`tests/e2e/calidad.mjs` y `tests/unit/ocr-*.test.ts`).

## Qué necesita

Una carpeta con **pares** «documento + transcripción correcta», con el mismo nombre:

```
albaranes/
  mercadona-0412.jpg      ← foto o PDF del albarán (jpg, png, webp o pdf)
  mercadona-0412.json     ← lo que debería haberse leído, hecho a mano
```

Hacen falta unos **30 documentos de al menos 5 proveedores**, con letra difícil incluida (manuscritos, fotos torcidas, tickets), porque lo que se mide es el caso malo, no el bueno.

La transcripción (`.json`) lleva las líneas de **producto** y lo que quieras comprobar de la cabecera; lo que no pongas no se comprueba:

```json
{
  "proveedor_cif": "B43123456",
  "numero": "A-2231",
  "fecha": "2026-10-04",
  "total": 187.20,
  "lineas": [
    { "descripcion": "Aceite oliva virgen extra 5 L", "cantidad": 4, "unidad": "garrafa", "precio_unitario": 45.00, "importe": 180.00 },
    { "descripcion": "Tomate rama", "cantidad": 12.5, "unidad": "kg", "precio_unitario": 2.10, "importe": 26.25 }
  ]
}
```

Los portes, envases, devoluciones y descuentos **no** van en `lineas` (no son producto).

## Cómo se ejecuta

```bash
# 1) Ver cuántos documentos hay y cuánto costaría (no llama a la API):
EVAL_DIR=/ruta/albaranes npx vitest run --config vitest.eval.config.mts

# 2) Ejecutarlo de verdad (llama a la API; ≈ 8 céntimos por documento, hasta 15):
EVAL_DIR=/ruta/albaranes EVAL_YES=1 ANTHROPIC_API_KEY=sk-ant-… npx vitest run --config vitest.eval.config.mts
```

Se pasa con el modelo y el esfuerzo que usa la app (`OCR_MODEL`, `OCR_ESCALATE_MODEL`, `OCR_EFFORT`), incluido el repaso con el modelo superior cuando la lectura sale dudosa.

## Qué cuenta como «bien»

Una línea está **bien** si la lectura tiene la misma cantidad, el mismo precio unitario (±0,5 %), el mismo importe (±0,02 €) y la misma unidad (kg, ud, l… se igualan: «Kg», «kilo» y «kg.» son lo mismo) que la transcripción. Las líneas se emparejan por el texto y, a igualdad, por el importe.

- **Mal pero avisada**: la lectura dudó (confianza baja o una duda apuntada): la persona la revisa antes de guardar. No es grave.
- **Mal sin avisar**: la lectura estaba «segura» y se equivocó. **Es lo peligroso**: un precio mal guardado mueve el coste de los platos sin que nadie lo vea.
- **Perdida**: la línea no aparece en la lectura (el total que no cuadra suele delatarla).

**Criterio del MVP:** al menos el **95 %** de las líneas bien y como mucho un **1 %** de errores sin avisar.

Los informes se guardan en `tests/eval/out/` (fuera de git: llevan datos reales de tus proveedores).
