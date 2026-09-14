import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fictional sample leads for local development / demos.
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000);

const sample = [
  { restaurant: "Cal Traginer", role: "propietario", city: "Tarragona", pos: "Ágora", lang: "ca", status: "nuevo", createdAt: daysAgo(0) },
  { restaurant: "El Racó de Marta", role: "jefe_cocina", city: "Reus", pos: null, lang: "ca", status: "nuevo", createdAt: daysAgo(1) },
  { restaurant: "Vermuteria 47", role: "gestor", city: "Barcelona", pos: "Glop", lang: "es", status: "contactado", createdAt: daysAgo(4) },
  { restaurant: "Brasería del Port", role: "propietario", city: "Tarragona", pos: "Ninguno", lang: "ca", status: "contactado", createdAt: daysAgo(9) },
  { restaurant: "Cocina Norte", role: "gestor", city: "Girona", pos: "Revo", lang: "es", status: "descartado", createdAt: daysAgo(15) },
  { restaurant: "Taverna Set Portes", role: "jefe_cocina", city: "Lleida", pos: null, lang: "ca", status: "nuevo", createdAt: daysAgo(2) },
];

async function main() {
  const existing = await prisma.lead.count();
  if (existing > 0) {
    console.log(`Leads already present (${existing}). Skipping seed.`);
    return;
  }
  await prisma.lead.createMany({ data: sample });
  console.log(`Seeded ${sample.length} sample leads.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
