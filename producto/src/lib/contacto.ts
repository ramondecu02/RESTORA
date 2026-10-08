// Contacto de RESTORA: el mismo que enseña la web (restoraapp.app).
export const CONTACTO_EMAIL = "hola@restoraapp.com";
export const CONTACTO_TEL = "640 648 985";
export const CONTACTO_WHATSAPP = "https://wa.me/34640648985?text=" + encodeURIComponent("Hola, quiero activar mi suscripción de RESTORA");
/** Enlace de WhatsApp con un mensaje ya escrito (para pedir un plan a mano mientras los pagos con Stripe no estén activos). */
export const whatsappCon = (texto: string) => "https://wa.me/34640648985?text=" + encodeURIComponent(texto);
