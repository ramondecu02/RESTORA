// Legal pages. IMPORTANT: no company identification data is invented here.
// Everything that legally must come from the company is listed in `pending`
// and rendered as an explicit "to be completed" block.

const es = {
  pendingTitle: "Pendiente de completar",
  pendingNote:
    "Estos datos identificativos deben rellenarse con la información real de la empresa antes de publicar la web. No los inventamos.",
  pendingFields: [
    "Razón social",
    "NIF / CIF",
    "Domicilio social",
    "Datos de inscripción registral (si aplica)",
    "Responsable del tratamiento y datos de contacto",
    "Delegado de Protección de Datos (si se designa)",
    "Plazo de conservación concreto de los datos",
    "Créditos y licencias de las fotografías",
  ],
  contactLine: "Para cualquier cuestión sobre tus datos puedes escribirnos a hola@restoraapp.com.",
  contactCta: "Escríbenos",
  updated: "Última actualización: pendiente de la publicación definitiva.",
  avisoLegal: {
    eyebrow: "Legal",
    title: "Aviso legal",
    sub: "Quién es el titular de esta web, para qué sirve y en qué condiciones puedes usarla (Ley 34/2002, LSSI-CE).",
    sections: [
      {
        title: "Datos identificativos del titular",
        body: "En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico, se informa de que el titular de restoraapp.app es la entidad responsable de RESTORA. Su razón social, NIF, domicilio y, si procede, datos de inscripción registral figuran en el bloque de datos pendientes de esta misma página y se completarán antes de la publicación definitiva. Correo de contacto: hola@restoraapp.com.",
      },
      {
        title: "Objeto de la web",
        body: "Esta web presenta RESTORA, una herramienta de control de food cost y rentabilidad para restaurantes, y permite solicitar una demostración, enviarnos un mensaje o suscribirse a nuestras comunicaciones. El acceso y la navegación implican la aceptación de este aviso legal; si no estás de acuerdo con él, te pedimos que no utilices el sitio.",
      },
      {
        title: "Condiciones de uso",
        body: "Te comprometes a usar la web y sus formularios de forma lícita y de buena fe: sin enviar información falsa o de terceros sin su consentimiento, sin intentar acceder a áreas restringidas ni alterar el funcionamiento del sitio. Los contenidos son informativos y pueden cambiar sin previo aviso; hacemos lo posible por mantener la web disponible, pero no garantizamos la ausencia de interrupciones.",
      },
      {
        title: "Propiedad intelectual e industrial",
        body: "La marca RESTORA, el logotipo, los textos, el diseño, el código y las capturas del producto son titularidad de RESTORA o se usan con licencia. Puedes consultar y compartir la web con fines informativos, pero no reproducir, modificar ni explotar comercialmente sus contenidos sin autorización previa por escrito. Las fotografías se publican con las licencias que se indicarán en el bloque de datos pendientes.",
      },
      {
        title: "Enlaces a terceros",
        body: "La web puede enlazar a servicios de terceros (por ejemplo, WhatsApp o una plataforma de vídeo). No controlamos esos sitios ni respondemos de sus contenidos, sus condiciones o su tratamiento de datos; te recomendamos revisar sus políticas al salir de restoraapp.app.",
      },
      {
        title: "Exclusión de responsabilidad",
        body: "Las pantallas, cifras y ejemplos que aparecen en la web son ilustrativos y sirven para explicar el producto; los resultados reales dependen de los datos de cada restaurante. RESTORA no se hace responsable de decisiones tomadas únicamente a partir de la información publicada aquí, ni de daños derivados de virus, indisponibilidad o usos no autorizados de la web ajenos a nuestro control.",
      },
      {
        title: "Protección de datos",
        body: "El tratamiento de los datos que nos facilitas a través de los formularios se rige por nuestra política de privacidad y por la información RGPD, disponibles en esta misma web.",
      },
      {
        title: "Legislación aplicable y jurisdicción",
        body: "Este aviso legal se rige por la legislación española. Para cualquier controversia serán competentes los juzgados y tribunales que correspondan al domicilio del titular, salvo que la normativa de consumidores y usuarios establezca otro fuero imperativo.",
      },
    ],
  },
  cookies: {
    eyebrow: "Legal",
    title: "Política de cookies",
    sub: "Qué guarda esta web en tu navegador (muy poco) y por qué no verás un banner de cookies.",
    sections: [
      {
        title: "Qué es una cookie",
        body: "Una cookie es un pequeño archivo que un sitio web guarda en tu navegador para recordar algo entre visitas: un idioma, una sesión iniciada, una preferencia. Existen también otras técnicas similares, como el almacenamiento local del navegador, que tratamos aquí del mismo modo.",
      },
      {
        title: "Qué usamos en esta web",
        body: "Solo elementos estrictamente necesarios para que la web funcione como esperas: la cookie técnica NEXT_LOCALE, que recuerda el idioma que has elegido (castellano o catalán) durante un año; y la preferencia de tema claro u oscuro (clave restora-theme), guardada en el almacenamiento local de tu navegador hasta que la borres. Ninguna de las dos identifica a personas ni sale de tu navegador.",
      },
      {
        title: "Lo que no usamos",
        body: "No utilizamos cookies de analítica, de publicidad, de seguimiento entre sitios ni de redes sociales, y no compartimos datos de navegación con terceros. Por eso no mostramos banner de consentimiento: las cookies estrictamente necesarias están exentas de él según el artículo 22.2 de la LSSI-CE y las guías de la Agencia Española de Protección de Datos.",
      },
      {
        title: "Servicios de terceros que puedes activar tú",
        body: "Algunas acciones te llevan a servicios externos con sus propias cookies: el botón de WhatsApp abre whatsapp.com, y el vídeo de presentación, cuando esté disponible, solo se carga desde la plataforma de vídeo si pulsas reproducir. Hasta ese momento no se descarga nada de esos dominios.",
      },
      {
        title: "Cómo gestionar o borrar las cookies",
        body: "Puedes eliminar la cookie de idioma y la preferencia de tema desde la configuración de tu navegador (apartado de privacidad, cookies y datos de sitios). Si lo haces, la web volverá a mostrarte el idioma por defecto y el tema de tu sistema. Cada navegador explica cómo hacerlo en su ayuda: Chrome, Firefox, Safari y Edge.",
      },
      {
        title: "Si esto cambia",
        body: "Si en el futuro incorporamos analítica u otra cookie no estrictamente necesaria, pediremos tu consentimiento previo mediante un banner, actualizaremos esta política y la fecha de última actualización.",
      },
    ],
  },
  privacidad: {
    eyebrow: "Legal",
    title: "Política de privacidad",
    sub: "Qué datos recogemos, para qué los usamos y qué puedes pedirnos en cualquier momento.",
    sections: [
      {
        title: "Quién es el responsable",
        body: "El responsable del tratamiento es la entidad titular de RESTORA, cuyos datos identificativos completos se indican en el bloque de datos pendientes de esta misma página. Puedes contactar con nosotros en hola@restoraapp.com.",
      },
      {
        title: "Qué datos recogemos",
        body: "Solo los que nos facilitas en el formulario de contacto: nombre del restaurante, ciudad, tu rol, el TPV que usas actualmente y el mensaje que quieras dejarnos. Guardamos también el idioma de la web y la dirección IP desde la que se envía el formulario, únicamente para evitar envíos automatizados y abuso.",
      },
      {
        title: "Para qué los usamos",
        body: "Para ponernos en contacto contigo sobre RESTORA y el programa de socios fundadores. No los usamos para publicidad de terceros, no los vendemos y no los cedemos a otros restaurantes ni a proveedores.",
      },
      {
        title: "Base legal",
        body: "El tratamiento se basa en tu consentimiento al enviarnos el formulario y en nuestro interés legítimo en responder a una solicitud de información que tú inicias. Puedes retirar tu consentimiento en cualquier momento.",
      },
      {
        title: "Cuánto tiempo los conservamos",
        body: "Mientras dure la relación de contacto y el programa de socios fundadores, o hasta que nos pidas que los eliminemos. El plazo máximo concreto se indicará en el bloque de datos pendientes.",
      },
      {
        title: "Con quién los compartimos",
        body: "Con los proveedores tecnológicos necesarios para que la web funcione: Cloudflare (alojamiento de la web y base de datos donde se guarda tu solicitud) y, si está activado, un proveedor de envío de correo para avisarnos de tu mensaje. Actúan como encargados del tratamiento y solo tratan los datos siguiendo nuestras instrucciones.",
      },
      {
        title: "Cookies y almacenamiento local",
        body: "No usamos cookies de publicidad ni herramientas de analítica o seguimiento. Guardamos una cookie técnica con tu idioma preferido y una preferencia de tema (claro/oscuro) en el almacenamiento local de tu navegador. Puedes borrarlas desde tu navegador cuando quieras.",
      },
      {
        title: "Tus derechos",
        body: "Puedes solicitar acceso a tus datos, su rectificación, su supresión, la limitación u oposición al tratamiento y su portabilidad, escribiéndonos a hola@restoraapp.com. Si consideras que no hemos atendido tu solicitud correctamente, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).",
      },
      {
        title: "Cambios en esta política",
        body: "Si cambiamos la forma en que tratamos tus datos, actualizaremos esta página y la fecha de última actualización.",
      },
    ],
  },
  rgpd: {
    eyebrow: "Legal",
    title: "Información RGPD",
    sub: "Cómo aplicamos el Reglamento General de Protección de Datos en RESTORA.",
    sections: [
      {
        title: "Nuestro papel",
        body: "Respecto a los datos que nos dejas en la web, actuamos como responsables del tratamiento. Cuando RESTORA esté operativo y trates datos dentro del producto, actuaremos como encargados del tratamiento de los datos que tú gestiones, en los términos que se recojan en el contrato de servicio.",
      },
      {
        title: "Principios que aplicamos",
        body: "Minimización: solo pedimos lo que necesitamos para contactarte. Limitación de finalidad: no reutilizamos tus datos para otra cosa. Transparencia: puedes saber en todo momento qué tenemos y pedir que lo borremos.",
      },
      {
        title: "Encargados del tratamiento",
        body: "Utilizamos Cloudflare para alojar la web y la base de datos de solicitudes, y un proveedor de correo electrónico para recibir los avisos de contacto. Con cada uno existe o se firmará el correspondiente acuerdo de encargo de tratamiento.",
      },
      {
        title: "Transferencias internacionales",
        body: "Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo. En ese caso se amparan en las cláusulas contractuales tipo aprobadas por la Comisión Europea u otras garantías equivalentes.",
      },
      {
        title: "Medidas de seguridad",
        body: "La web se sirve íntegramente sobre HTTPS, el acceso a las solicitudes recibidas está protegido con autenticación, y aplicamos límites de envío para evitar abuso del formulario. Revisamos estas medidas de forma continua.",
      },
      {
        title: "Cómo ejercer tus derechos",
        body: "Escríbenos a hola@restoraapp.com indicando qué derecho quieres ejercer (acceso, rectificación, supresión, limitación, oposición o portabilidad). Te responderemos en el plazo legalmente previsto. Puedes reclamar ante la Agencia Española de Protección de Datos si no estás conforme.",
      },
      {
        title: "Brechas de seguridad",
        body: "Si se produjera una violación de seguridad que afecte a tus datos y suponga un riesgo para tus derechos, te lo comunicaríamos y lo notificaríamos a la autoridad de control en los plazos establecidos por el RGPD.",
      },
    ],
  },
};

export type LegalCopy = typeof es;

const ca: LegalCopy = {
  pendingTitle: "Pendent de completar",
  pendingNote:
    "Aquestes dades identificatives s'han d'emplenar amb la informació real de l'empresa abans de publicar el web. No les inventem.",
  pendingFields: [
    "Raó social",
    "NIF / CIF",
    "Domicili social",
    "Dades d'inscripció registral (si escau)",
    "Responsable del tractament i dades de contacte",
    "Delegat de Protecció de Dades (si se'n designa)",
    "Termini de conservació concret de les dades",
    "Crèdits i llicències de les fotografies",
  ],
  contactLine: "Per a qualsevol qüestió sobre les teves dades pots escriure'ns a hola@restoraapp.com.",
  contactCta: "Escriu-nos",
  updated: "Última actualització: pendent de la publicació definitiva.",
  avisoLegal: {
    eyebrow: "Legal",
    title: "Avís legal",
    sub: "Qui és el titular d'aquest web, per a què serveix i en quines condicions el pots fer servir (Llei 34/2002, LSSI-CE).",
    sections: [
      {
        title: "Dades identificatives del titular",
        body: "En compliment de l'article 10 de la Llei 34/2002, d'11 de juliol, de serveis de la societat de la informació i de comerç electrònic, s'informa que el titular de restoraapp.app és l'entitat responsable de RESTORA. La seva raó social, NIF, domicili i, si escau, dades d'inscripció registral figuren al bloc de dades pendents d'aquesta mateixa pàgina i es completaran abans de la publicació definitiva. Correu de contacte: hola@restoraapp.com.",
      },
      {
        title: "Objecte del web",
        body: "Aquest web presenta RESTORA, una eina de control de food cost i rendibilitat per a restaurants, i permet sol·licitar una demostració, enviar-nos un missatge o subscriure's a les nostres comunicacions. L'accés i la navegació impliquen l'acceptació d'aquest avís legal; si no hi estàs d'acord, et demanem que no utilitzis el lloc.",
      },
      {
        title: "Condicions d'ús",
        body: "Et compromets a fer servir el web i els seus formularis de manera lícita i de bona fe: sense enviar informació falsa o de tercers sense el seu consentiment, sense intentar accedir a àrees restringides ni alterar el funcionament del lloc. Els continguts són informatius i poden canviar sense avís previ; fem el possible per mantenir el web disponible, però no garantim l'absència d'interrupcions.",
      },
      {
        title: "Propietat intel·lectual i industrial",
        body: "La marca RESTORA, el logotip, els textos, el disseny, el codi i les captures del producte són titularitat de RESTORA o es fan servir amb llicència. Pots consultar i compartir el web amb finalitats informatives, però no reproduir, modificar ni explotar comercialment els seus continguts sense autorització prèvia per escrit. Les fotografies es publiquen amb les llicències que s'indicaran al bloc de dades pendents.",
      },
      {
        title: "Enllaços a tercers",
        body: "El web pot enllaçar a serveis de tercers (per exemple, WhatsApp o una plataforma de vídeo). No controlem aquests llocs ni responem dels seus continguts, les seves condicions o el seu tractament de dades; et recomanem revisar les seves polítiques en sortir de restoraapp.app.",
      },
      {
        title: "Exclusió de responsabilitat",
        body: "Les pantalles, xifres i exemples que apareixen al web són il·lustratius i serveixen per explicar el producte; els resultats reals depenen de les dades de cada restaurant. RESTORA no es fa responsable de decisions preses únicament a partir de la informació publicada aquí, ni de danys derivats de virus, indisponibilitat o usos no autoritzats del web aliens al nostre control.",
      },
      {
        title: "Protecció de dades",
        body: "El tractament de les dades que ens facilites a través dels formularis es regeix per la nostra política de privacitat i per la informació RGPD, disponibles en aquest mateix web.",
      },
      {
        title: "Legislació aplicable i jurisdicció",
        body: "Aquest avís legal es regeix per la legislació espanyola. Per a qualsevol controvèrsia seran competents els jutjats i tribunals que corresponguin al domicili del titular, llevat que la normativa de consumidors i usuaris estableixi un altre fur imperatiu.",
      },
    ],
  },
  cookies: {
    eyebrow: "Legal",
    title: "Política de galetes",
    sub: "Què desa aquest web al teu navegador (molt poc) i per què no veuràs cap bàner de galetes.",
    sections: [
      {
        title: "Què és una galeta",
        body: "Una galeta (cookie) és un petit fitxer que un lloc web desa al teu navegador per recordar alguna cosa entre visites: un idioma, una sessió iniciada, una preferència. També hi ha altres tècniques similars, com l'emmagatzematge local del navegador, que tractem aquí de la mateixa manera.",
      },
      {
        title: "Què fem servir en aquest web",
        body: "Només elements estrictament necessaris perquè el web funcioni com esperes: la galeta tècnica NEXT_LOCALE, que recorda l'idioma que has triat (castellà o català) durant un any; i la preferència de tema clar o fosc (clau restora-theme), desada a l'emmagatzematge local del teu navegador fins que l'esborris. Cap de les dues identifica persones ni surt del teu navegador.",
      },
      {
        title: "El que no fem servir",
        body: "No utilitzem galetes d'analítica, de publicitat, de seguiment entre llocs ni de xarxes socials, i no compartim dades de navegació amb tercers. Per això no mostrem cap bàner de consentiment: les galetes estrictament necessàries n'estan exemptes segons l'article 22.2 de la LSSI-CE i les guies de l'Agència Espanyola de Protecció de Dades.",
      },
      {
        title: "Serveis de tercers que pots activar tu",
        body: "Algunes accions et porten a serveis externs amb les seves pròpies galetes: el botó de WhatsApp obre whatsapp.com, i el vídeo de presentació, quan estigui disponible, només es carrega des de la plataforma de vídeo si prems reproduir. Fins aleshores no es descarrega res d'aquells dominis.",
      },
      {
        title: "Com gestionar o esborrar les galetes",
        body: "Pots eliminar la galeta d'idioma i la preferència de tema des de la configuració del teu navegador (apartat de privacitat, galetes i dades de llocs). Si ho fas, el web et tornarà a mostrar l'idioma per defecte i el tema del teu sistema. Cada navegador explica com fer-ho a la seva ajuda: Chrome, Firefox, Safari i Edge.",
      },
      {
        title: "Si això canvia",
        body: "Si en el futur incorporem analítica o una altra galeta no estrictament necessària, demanarem el teu consentiment previ mitjançant un bàner, actualitzarem aquesta política i la data d'última actualització.",
      },
    ],
  },
  privacidad: {
    eyebrow: "Legal",
    title: "Política de privacitat",
    sub: "Quines dades recollim, per a què les fem servir i què ens pots demanar en qualsevol moment.",
    sections: [
      {
        title: "Qui és el responsable",
        body: "El responsable del tractament és l'entitat titular de RESTORA, les dades identificatives completes de la qual s'indiquen al bloc de dades pendents d'aquesta mateixa pàgina. Pots contactar amb nosaltres a hola@restoraapp.com.",
      },
      {
        title: "Quines dades recollim",
        body: "Només les que ens facilites al formulari de contacte: nom del restaurant, ciutat, el teu rol, el TPV que fas servir actualment i el missatge que ens vulguis deixar. També desem l'idioma del web i l'adreça IP des de la qual s'envia el formulari, únicament per evitar enviaments automatitzats i abús.",
      },
      {
        title: "Per a què les fem servir",
        body: "Per posar-nos en contacte amb tu sobre RESTORA i el programa de socis fundadors. No les fem servir per a publicitat de tercers, no les venem i no les cedim a altres restaurants ni a proveïdors.",
      },
      {
        title: "Base legal",
        body: "El tractament es basa en el teu consentiment en enviar-nos el formulari i en el nostre interès legítim a respondre una sol·licitud d'informació que tu inicies. Pots retirar el teu consentiment en qualsevol moment.",
      },
      {
        title: "Quant de temps les conservem",
        body: "Mentre duri la relació de contacte i el programa de socis fundadors, o fins que ens demanis que les eliminem. El termini màxim concret s'indicarà al bloc de dades pendents.",
      },
      {
        title: "Amb qui les compartim",
        body: "Amb els proveïdors tecnològics necessaris perquè el web funcioni: Cloudflare (allotjament del web i base de dades on es desa la teva sol·licitud) i, si està activat, un proveïdor d'enviament de correu per avisar-nos del teu missatge. Actuen com a encarregats del tractament i només tracten les dades seguint les nostres instruccions.",
      },
      {
        title: "Galetes i emmagatzematge local",
        body: "No fem servir galetes de publicitat ni eines d'analítica o seguiment. Desem una galeta tècnica amb el teu idioma preferit i una preferència de tema (clar/fosc) a l'emmagatzematge local del teu navegador. Pots esborrar-les des del navegador quan vulguis.",
      },
      {
        title: "Els teus drets",
        body: "Pots sol·licitar accés a les teves dades, la seva rectificació, la seva supressió, la limitació o oposició al tractament i la seva portabilitat, escrivint-nos a hola@restoraapp.com. Si consideres que no hem atès la teva sol·licitud correctament, pots reclamar davant l'Agència Espanyola de Protecció de Dades (aepd.es).",
      },
      {
        title: "Canvis en aquesta política",
        body: "Si canviem la manera com tractem les teves dades, actualitzarem aquesta pàgina i la data d'última actualització.",
      },
    ],
  },
  rgpd: {
    eyebrow: "Legal",
    title: "Informació RGPD",
    sub: "Com apliquem el Reglament General de Protecció de Dades a RESTORA.",
    sections: [
      {
        title: "El nostre paper",
        body: "Respecte a les dades que ens deixes al web, actuem com a responsables del tractament. Quan RESTORA estigui operatiu i tractis dades dins del producte, actuarem com a encarregats del tractament de les dades que tu gestionis, en els termes que reculli el contracte de servei.",
      },
      {
        title: "Principis que apliquem",
        body: "Minimització: només demanem el que necessitem per contactar-te. Limitació de finalitat: no reutilitzem les teves dades per a res més. Transparència: pots saber en tot moment què tenim i demanar que ho esborrem.",
      },
      {
        title: "Encarregats del tractament",
        body: "Fem servir Cloudflare per allotjar el web i la base de dades de sol·licituds, i un proveïdor de correu electrònic per rebre els avisos de contacte. Amb cadascun existeix o se signarà el corresponent acord d'encàrrec de tractament.",
      },
      {
        title: "Transferències internacionals",
        body: "Alguns d'aquests proveïdors poden tractar dades fora de l'Espai Econòmic Europeu. En aquest cas s'emparen en les clàusules contractuals tipus aprovades per la Comissió Europea o altres garanties equivalents.",
      },
      {
        title: "Mesures de seguretat",
        body: "El web se serveix íntegrament sobre HTTPS, l'accés a les sol·licituds rebudes està protegit amb autenticació, i apliquem límits d'enviament per evitar abús del formulari. Revisem aquestes mesures de manera contínua.",
      },
      {
        title: "Com exercir els teus drets",
        body: "Escriu-nos a hola@restoraapp.com indicant quin dret vols exercir (accés, rectificació, supressió, limitació, oposició o portabilitat). Et respondrem en el termini legalment previst. Pots reclamar davant l'Agència Espanyola de Protecció de Dades si no hi estàs conforme.",
      },
      {
        title: "Violacions de seguretat",
        body: "Si es produís una violació de seguretat que afecti les teves dades i suposi un risc per als teus drets, t'ho comunicaríem i ho notificaríem a l'autoritat de control en els terminis establerts pel RGPD.",
      },
    ],
  },
};

export const legalCopy = { es, ca };
