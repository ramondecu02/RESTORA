// Límite de una subida de documentos. La función de Vercel acepta como mucho 4,5 MB de cuerpo, y el formulario añade
// su propio relleno: con 4,4 MB de archivos la petición se rechazaba antes de llegar al código y el usuario solo veía
// «Prueba otra vez». 4 MB deja margen y se avisa en el navegador antes de enviar.
export const MAX_SUBIDA_BYTES = 4 * 1024 * 1024;
export const MENSAJE_PESADO = "Los archivos pesan demasiado (máximo 4 MB en total). Sube menos páginas o un PDF más ligero.";
