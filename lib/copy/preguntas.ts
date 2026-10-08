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
        { q: "¿En qué se diferencia de un TPV?", a: "El TPV registra lo que vendes y cobra. RESTORA trabaja al otro lado: lo que compras, lo que te cuesta cada receta y el margen que deja cada plato, con avisos cuando un proveedor sube. No sustituye al TPV; le pone números a lo que el TPV no ve. Cuando conectemos ambos, cada venta descontará consumo real de tu inventario. Hoy puedes importar el CSV de ventas de tu TPV y el inventario descuenta lo vendido." },
        { q: "¿Sirve si mi carta cambia cada temporada?", a: "Sí, es justo donde más rinde. Actualizas la receta y el coste, el food cost y el margen se recalculan solos." },
        { q: "¿Necesito instalar algo?", a: "No. Se usa desde el navegador, en ordenador o tablet. No hay instalación ni servidor que mantener." },
        { q: "¿Funciona con varios locales?", a: "Hoy RESTORA gestiona un local por cuenta de negocio, sin vista conjunta entre locales. Si llevas varios, cuéntanoslo y lo vemos contigo." },
        { q: "¿En qué idioma está la app?", a: "Hoy la app está en castellano; la web está en castellano y en catalán." },
      ],
    },
    {
      title: "Puesta en marcha",
      items: [
        { q: "¿Cuánto tardo en tenerlo funcionando?", a: "La primera carga de recetas y proveedores se hace en la primera semana, contigo. A partir del día 7 ya ves tu food cost por plato." },
        { q: "¿Y si hoy lo llevo todo en Excel?", a: "Perfecto: partimos de ahí. No hace falta rehacer nada; usamos lo que ya tienes como punto de partida." },
        { q: "¿Quién carga los datos?", a: "Te acompañamos en el arranque. Después, el mantenimiento es registrar tus albaranes como ya haces." },
        { q: "¿Cómo migro los datos que ya tengo?", a: "Nos pasas lo que tengas —el Excel de escandallos, la lista de productos y proveedores, las últimas facturas— y lo cargamos contigo durante la primera semana. Si tu TPV exporta ventas en CSV, también partimos de ahí. No hay que volver a teclear nada que ya exista." },
      ],
    },
    {
      title: "Precio y acceso",
      items: [
        { q: "¿Ya puedo usar RESTORA?", a: "Sí. Crea tu cuenta y pruébalo gratis 14 días, sin tarjeta. Al terminar, si quieres seguir, nos escribes y activamos tu suscripción mensual, sin permanencia." },
        { q: "¿Cuánto cuesta?", a: "Pruébalo gratis 14 días, sin tarjeta. Al terminar, si quieres seguir, activamos tu suscripción mensual, sin permanencia. Hay tres planes: Premium (49,90 €/mes), Pro (89,90 €/mes) y Max (149,90 €/mes), todos sin IVA; el IVA se añade aparte. Los detalles están en la página de Precios." },
        { q: "¿Y si cambio de opinión?", a: "No hay permanencia ni penalización. Puedes darte de baja cuando quieras, puedes descargar tus datos y no se cobra nada más. Y para empezar no hace falta tarjeta: la prueba son 14 días." },
        { q: "¿Desde cuándo puedo usarlo?", a: "Desde hoy: crea tu cuenta y empieza con una foto de un albarán." },
      ],
    },
    {
      title: "Tus datos",
      items: [
        { q: "¿Mis datos son privados?", a: "Sí. Tus datos son tuyos y no se comparten con otros restaurantes ni con proveedores. Los precios de tus albaranes alimentan, sin tu nombre, un precio de referencia agregado que solo se muestra cuando hay datos de 5 restaurantes o más." },
        { q: "¿Cómo protegéis mis datos?", a: "La web y el producto se sirven solo por HTTPS, el acceso a la información está protegido con autenticación y los formularios tienen límites anti-abuso. Cumplimos el RGPD: recogemos lo mínimo, no vendemos datos y puedes pedir acceso, rectificación o borrado en hola@restoraapp.com. El detalle está en la política de privacidad y en la información RGPD." },
        { q: "¿Puedo llevarme mis datos si me voy?", a: "Sí. Descargas tus datos en CSV cuando quieras (artículos, proveedores, compras, escandallos y ventas) y el propietario puede borrar el negocio con todos sus datos desde «Mi local»." },
        { q: "¿Qué hacéis con lo que envío en el formulario?", a: "Solo lo usamos para contactarte sobre RESTORA, por ejemplo para organizar tu demo o responder tu consulta. Lo detallamos en la política de privacidad." },
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
        { q: "En què es diferencia d'un TPV?", a: "El TPV registra el que vens i cobra. RESTORA treballa a l'altra banda: el que compres, el que et costa cada recepta i el marge que deixa cada plat, amb avisos quan un proveïdor puja. No substitueix el TPV; posa números al que el TPV no veu. Quan connectem tots dos, cada venda descomptarà consum real del teu inventari. Avui pots importar el CSV de vendes del teu TPV i l'inventari descompta el que s'ha venut." },
        { q: "Serveix si la meva carta canvia cada temporada?", a: "Sí, és justament on més rendeix. Actualitzes la recepta i el cost, el food cost i el marge es recalculen sols." },
        { q: "Necessito instal·lar res?", a: "No. Es fa servir des del navegador, en ordinador o tauleta. No hi ha instal·lació ni servidor per mantenir." },
        { q: "Funciona amb diversos locals?", a: "Avui RESTORA gestiona un local per compte de negoci, sense vista conjunta entre locals. Si en portes diversos, explica'ns-ho i ho veiem amb tu." },
        { q: "En quin idioma és l'app?", a: "Avui l'app és en castellà; el web és en castellà i en català." },
      ],
    },
    {
      title: "Posada en marxa",
      items: [
        { q: "Quant trigo a tenir-ho funcionant?", a: "La primera càrrega de receptes i proveïdors es fa la primera setmana, amb tu. A partir del dia 7 ja veus el teu food cost per plat." },
        { q: "I si avui ho porto tot a l'Excel?", a: "Perfecte: partim d'aquí. No cal refer res; fem servir el que ja tens com a punt de partida." },
        { q: "Qui carrega les dades?", a: "T'acompanyem en l'arrencada. Després, el manteniment és registrar els teus albarans com ja fas." },
        { q: "Com migro les dades que ja tinc?", a: "Ens passes el que tinguis —l'Excel d'escandalls, la llista de productes i proveïdors, les últimes factures— i ho carreguem amb tu durant la primera setmana. Si el teu TPV exporta vendes en CSV, també partim d'aquí. No cal tornar a teclejar res que ja existeixi." },
      ],
    },
    {
      title: "Preu i accés",
      items: [
        { q: "Ja puc fer servir RESTORA?", a: "Sí. Crea el teu compte i prova-ho gratis 14 dies, sense targeta. En acabar, si vols continuar, ens escrius i activem la teva subscripció mensual, sense permanència." },
        { q: "Quant costa?", a: "Prova-ho gratis 14 dies, sense targeta. En acabar, si vols continuar, activem la teva subscripció mensual, sense permanència. Hi ha tres plans: Premium (49,90 €/mes), Pro (89,90 €/mes) i Max (149,90 €/mes), tots sense IVA; l'IVA s'afegeix a part. Els detalls són a la pàgina de Preus." },
        { q: "I si canvio d'opinió?", a: "No hi ha permanència ni penalització. Pots donar-te de baixa quan vulguis, pots descarregar les teves dades i no es cobra res més. I per començar no cal targeta: la prova són 14 dies." },
        { q: "Des de quan el puc fer servir?", a: "Des d'avui: crea el teu compte i comença amb una foto d'un albarà." },
      ],
    },
    {
      title: "Les teves dades",
      items: [
        { q: "Les meves dades són privades?", a: "Sí. Les teves dades són teves i no es comparteixen amb altres restaurants ni amb proveïdors. Els preus dels teus albarans alimenten, sense el teu nom, un preu de referència agregat que només es mostra quan hi ha dades de 5 restaurants o més." },
        { q: "Com protegiu les meves dades?", a: "El web i el producte se serveixen només per HTTPS, l'accés a la informació està protegit amb autenticació i els formularis tenen límits antiabús. Complim el RGPD: recollim el mínim, no venem dades i pots demanar accés, rectificació o esborrat a hola@restoraapp.com. El detall és a la política de privacitat i a la informació RGPD." },
        { q: "Puc emportar-me les meves dades si marxo?", a: "Sí. Descarregues les teves dades en CSV quan vulguis (articles, proveïdors, compres, escandalls i vendes) i el propietari pot esborrar el negoci amb totes les seves dades des de «Mi local»." },
        { q: "Què feu amb el que envio al formulari?", a: "Només ho fem servir per contactar-te sobre RESTORA, per exemple per organitzar la teva demo o respondre la teva consulta. Ho detallem a la política de privacitat." },
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
