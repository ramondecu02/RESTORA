const es = {
  hero: {
    eyebrow: "Contacto",
    title: "¿Hablamos?",
    sub: "RESTORA está pensado para restaurantes que quieren profesionalizar su gestión: saber lo que cuesta cada plato, lo que sube cada proveedor y dónde se va el margen. Si eso te suena a tu cocina, escríbenos.",
  },
  emailLabel: "Escríbenos directamente",
  email: "hola@restoraapp.com",
  emailNote: "Te respondemos en 48 h, sin comercial de por medio.",
  formTitle: "O cuéntanos tu caso",
  formSub: "Un minuto de formulario y te contactamos con algo concreto, no con un folleto.",
  next: {
    title: "Qué pasa después",
    steps: [
      { num: "01", title: "Nos escribes", body: "Con el formulario o por email. Nos vale con el nombre del restaurante y tu ciudad." },
      { num: "02", title: "Te respondemos", body: "En 48 h, con una primera lectura honesta de si RESTORA te encaja." },
      { num: "03", title: "Demo de 30 minutos", body: "Te enseñamos el producto con un plato tuyo, no con un ejemplo de catálogo." },
    ],
  },
  founderNote: "Las plazas de socio fundador están limitadas a los primeros restaurantes de Cataluña.",
};

export type ContactoCopy = typeof es;

const ca: ContactoCopy = {
  hero: {
    eyebrow: "Contacte",
    title: "En parlem?",
    sub: "RESTORA està pensat per a restaurants que volen professionalitzar la seva gestió: saber què costa cada plat, què puja cada proveïdor i on se'n va el marge. Si això et sona a la teva cuina, escriu-nos.",
  },
  emailLabel: "Escriu-nos directament",
  email: "hola@restoraapp.com",
  emailNote: "Et responem en 48 h, sense comercial pel mig.",
  formTitle: "O explica'ns el teu cas",
  formSub: "Un minut de formulari i et contactem amb alguna cosa concreta, no amb un fullet.",
  next: {
    title: "Què passa després",
    steps: [
      { num: "01", title: "Ens escrius", body: "Amb el formulari o per correu. Ens val amb el nom del restaurant i la teva ciutat." },
      { num: "02", title: "Et responem", body: "En 48 h, amb una primera lectura honesta de si RESTORA t'encaixa." },
      { num: "03", title: "Demo de 30 minuts", body: "T'ensenyem el producte amb un plat teu, no amb un exemple de catàleg." },
    ],
  },
  founderNote: "Les places de soci fundador estan limitades als primers restaurants de Catalunya.",
};

export const contactoCopy = { es, ca };
