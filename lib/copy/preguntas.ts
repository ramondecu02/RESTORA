// Grouped FAQ copy — answers are shown open, organised by theme, so the page
// reads as an editorial spread instead of an endless accordion.

const es = {
  hero: {
    eyebrow: "Preguntas",
    title: "Todo lo que quieres saber antes de escribirnos.",
    sub: "Sin letra pequeña. Si algo no está aquí, te lo contamos en la demo sin rodeos.",
  },
  groups: [
    {
      title: "El producto",
      items: [
        { q: "¿Tengo que cambiar mi TPV?", a: "No. RESTORA es una capa por encima de lo que ya usas. Empiezas registrando tus compras y no tocas tu operativa de sala." },
        { q: "¿Sirve si mi carta cambia cada temporada?", a: "Sí, es justo donde más rinde. Actualizas la receta y el coste, el food cost y el margen se recalculan solos." },
        { q: "¿Necesito instalar algo?", a: "No. Se usa desde el navegador, en ordenador o tablet. No hay instalación ni servidor que mantener." },
        { q: "¿Funciona con varios locales?", a: "Está pensado para empezar por un local y crecer a un grupo pequeño. Si llevas varios, cuéntanoslo y lo vemos contigo." },
      ],
    },
    {
      title: "Puesta en marcha",
      items: [
        { q: "¿Cuánto tardo en tenerlo funcionando?", a: "La primera carga de recetas y proveedores se hace en la primera semana, contigo. A partir del día 7 ya ves tu food cost por plato." },
        { q: "¿Y si hoy lo llevo todo en Excel?", a: "Perfecto: partimos de ahí. No hace falta rehacer nada; usamos lo que ya tienes como punto de partida." },
        { q: "¿Quién carga los datos?", a: "Te acompañamos en el arranque. Después, el mantenimiento es registrar tus albaranes como ya haces." },
      ],
    },
    {
      title: "Precio y acceso",
      items: [
        { q: "¿Ya puedo contratar RESTORA?", a: "Todavía no. Esto es una vista previa de lo que estamos construyendo: puedes reservar plaza como socio fundador y te avisamos en cuanto abramos acceso." },
        { q: "¿Cuánto cuesta?", a: "Desde 89 €/mes, con todo incluido y sin permanencia. Los socios fundadores tienen condiciones especiales detalladas en la página de precios." },
        { q: "¿Cuándo estará disponible?", a: "Estamos arrancando con los primeros restaurantes de Cataluña. Déjanos tus datos y serás de los primeros en entrar." },
      ],
    },
    {
      title: "Tus datos",
      items: [
        { q: "¿Mis datos son privados?", a: "Sí. Tus datos son tuyos y no se comparten con otros restaurantes ni con proveedores. Cualquier referencia sectorial sería siempre anónima y agregada." },
        { q: "¿Puedo llevarme mis datos si me voy?", a: "Sí. Puedes exportar tu información cuando quieras y solicitar su eliminación escribiéndonos." },
        { q: "¿Qué hacéis con lo que envío en el formulario?", a: "Solo lo usamos para contactarte sobre el programa de socios fundadores. Lo detallamos en la política de privacidad." },
      ],
    },
  ],
  still: {
    title: "¿Te queda alguna duda?",
    sub: "Escríbenos y te respondemos en 48 h, sin comercial de por medio.",
    cta: "Hablar con nosotros",
  },
};

export type PreguntasCopy = typeof es;

const ca: PreguntasCopy = {
  hero: {
    eyebrow: "Preguntes",
    title: "Tot el que vols saber abans d'escriure'ns.",
    sub: "Sense lletra petita. Si alguna cosa no hi és, t'ho expliquem a la demo sense embuts.",
  },
  groups: [
    {
      title: "El producte",
      items: [
        { q: "He de canviar el meu TPV?", a: "No. RESTORA és una capa per sobre del que ja fas servir. Comences registrant les teves compres i no toques la teva operativa de sala." },
        { q: "Serveix si la meva carta canvia cada temporada?", a: "Sí, és justament on més rendeix. Actualitzes la recepta i el cost, el food cost i el marge es recalculen sols." },
        { q: "Necessito instal·lar res?", a: "No. Es fa servir des del navegador, en ordinador o tauleta. No hi ha instal·lació ni servidor per mantenir." },
        { q: "Funciona amb diversos locals?", a: "Està pensat per començar per un local i créixer a un grup petit. Si en portes diversos, explica'ns-ho i ho veiem amb tu." },
      ],
    },
    {
      title: "Posada en marxa",
      items: [
        { q: "Quant trigo a tenir-ho funcionant?", a: "La primera càrrega de receptes i proveïdors es fa la primera setmana, amb tu. A partir del dia 7 ja veus el teu food cost per plat." },
        { q: "I si avui ho porto tot a l'Excel?", a: "Perfecte: partim d'aquí. No cal refer res; fem servir el que ja tens com a punt de partida." },
        { q: "Qui carrega les dades?", a: "T'acompanyem en l'arrencada. Després, el manteniment és registrar els teus albarans com ja fas." },
      ],
    },
    {
      title: "Preu i accés",
      items: [
        { q: "Ja puc contractar RESTORA?", a: "Encara no. Això és una vista prèvia del que estem construint: pots reservar plaça com a soci fundador i t'avisem quan obrim l'accés." },
        { q: "Quant costa?", a: "Des de 89 €/mes, amb tot inclòs i sense permanència. Els socis fundadors tenen condicions especials detallades a la pàgina de preus." },
        { q: "Quan estarà disponible?", a: "Estem arrencant amb els primers restaurants de Catalunya. Deixa'ns les teves dades i seràs dels primers a entrar." },
      ],
    },
    {
      title: "Les teves dades",
      items: [
        { q: "Les meves dades són privades?", a: "Sí. Les teves dades són teves i no es comparteixen amb altres restaurants ni amb proveïdors. Qualsevol referència sectorial seria sempre anònima i agregada." },
        { q: "Puc emportar-me les meves dades si marxo?", a: "Sí. Pots exportar la teva informació quan vulguis i sol·licitar-ne l'eliminació escrivint-nos." },
        { q: "Què feu amb el que envio al formulari?", a: "Només ho fem servir per contactar-te sobre el programa de socis fundadors. Ho detallem a la política de privacitat." },
      ],
    },
  ],
  still: {
    title: "Et queda algun dubte?",
    sub: "Escriu-nos i et responem en 48 h, sense comercial pel mig.",
    cta: "Parlar amb nosaltres",
  },
};

export const preguntasCopy = { es, ca };
