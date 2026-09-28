// Calidad de una foto antes de subirla: detecta fotos oscuras o borrosas para leer mejor el albarán.
// Es orientativo (nunca bloquea la subida) y se calcula en el navegador sobre una muestra reducida.
export type ImgQuality = { brightness: number; sharpness: number; dark: boolean; blur: boolean };

// Umbrales sobre grises 0-255 de una muestra reducida (lado ~320 px). Calibrados con albaranes reales
// frente a versiones oscurecidas y desenfocadas: prudentes, para avisar solo cuando es claro.
export const DARK_BELOW = 70; // brillo medio por debajo → poca luz
export const BLUR_BELOW = 100; // varianza del laplaciano por debajo → probablemente borrosa
// Lado de la muestra con la que se mide (más pequeño = más rápido y más estable entre móviles).
export const SAMPLE_SIDE = 320;

/** Analiza una imagen ya pasada a gris (muestra reducida). Devuelve brillo y nitidez, con sus avisos. */
export function assessGray(gray: ArrayLike<number>, w: number, h: number): ImgQuality {
  const n = w * h;
  if (!n || gray.length < n) return { brightness: 255, sharpness: 1e9, dark: false, blur: false };
  let sum = 0;
  for (let i = 0; i < n; i++) sum += gray[i];
  const brightness = sum / n;
  // Nitidez = varianza del laplaciano (los bordes del texto). Poca varianza ⇒ foto borrosa.
  let s = 0, s2 = 0, cnt = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      s += lap; s2 += lap * lap; cnt++;
    }
  }
  const mean = cnt ? s / cnt : 0;
  const sharpness = cnt ? Math.max(0, s2 / cnt - mean * mean) : 1e9;
  const dark = brightness < DARK_BELOW;
  // Con poca luz baja el contraste y la nitidez deja de ser fiable: no marcamos "movida" si ya está oscura.
  const blur = !dark && sharpness < BLUR_BELOW;
  return { brightness, sharpness, dark, blur };
}

/** Convierte píxeles RGBA (de un canvas) a gris. */
export function toGray(rgba: ArrayLike<number>, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; j < w * h; i += 4, j++) {
    // Luminancia perceptual (Rec. 601): coincide con cómo vemos el contraste del texto.
    out[j] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
  }
  return out;
}

/** ¿Hay algo que avisar de esta foto? */
export const flagged = (q: ImgQuality | null): boolean => !!q && (q.dark || q.blur);

/** Etiqueta de una palabra para la miniatura (o null). La falta de luz manda sobre el movimiento. */
export function qualityTag(q: ImgQuality): string | null {
  if (q.dark) return "Oscura";
  if (q.blur) return "Movida";
  return null;
}

/** Mensaje corto para el usuario (o null si la foto está bien). */
export function qualityHint(q: ImgQuality): string | null {
  if (q.dark) return "Se ve algo oscura";
  if (q.blur) return "Se ve algo movida";
  return null;
}
