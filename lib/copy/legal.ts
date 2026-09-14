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
  ],
  contactLine: "Para cualquier cuestión sobre tus datos puedes escribirnos a hola@restoraapp.com.",
  contactCta: "Escríbenos",
  updated: "Última actualización: pendiente de la publicación definitiva.",
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
  ],
  contactLine: "Per a qualsevol qüestió sobre les teves dades pots escriure'ns a hola@restoraapp.com.",
  contactCta: "Escriu-nos",
  updated: "Última actualització: pendent de la publicació definitiva.",
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
