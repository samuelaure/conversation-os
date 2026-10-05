import { PrismaClient, PersonStatus, PersonSource } from '@prisma/client';

const prisma = new PrismaClient();

const skippedRecords = [
  {
    lineNum: 68,
    connectedOn: new Date('2026-09-01'),
  },
  {
    lineNum: 263,
    connectedOn: new Date('2025-09-04'),
  },
  {
    lineNum: 268,
    connectedOn: new Date('2025-08-02'),
  },
  {
    lineNum: 293,
    connectedOn: new Date('2023-11-14'),
  },
  {
    lineNum: 296,
    connectedOn: new Date('2023-09-02'),
  },
  {
    lineNum: 327,
    connectedOn: new Date('2023-03-17'),
  },
];

async function main() {
  const otrosNiche = await prisma.niche.findUnique({ where: { slug: 'otros' } });
  if (!otrosNiche) {
    throw new Error('Niche "otros" not found');
  }

  console.log(`Using niche: ${otrosNiche.name} (${otrosNiche.id})`);

  for (const rec of skippedRecords) {
    const syntheticUrl = `https://www.linkedin.com/in/deleted-account-csv-${rec.lineNum}`;
    
    const existing = await prisma.person.findUnique({
      where: { linkedinUrl: syntheticUrl },
    });

    if (existing) {
      console.log(`Already exists: line ${rec.lineNum} (ID: ${existing.id})`);
      continue;
    }

    const created = await prisma.person.create({
      data: {
        linkedinUrl: syntheticUrl,
        firstName: 'LinkedIn',
        lastName: `Member (Cuenta Cerrada - Fila ${rec.lineNum})`,
        headline: 'Perfil cerrado, eliminado o restringido en LinkedIn',
        jobTitle: 'Cuenta de LinkedIn no disponible',
        nicheId: otrosNiche.id,
        status: PersonStatus.PAUSED,
        source: PersonSource.CSV_IMPORT,
        linkedinConnectedOn: rec.connectedOn,
        tags: ['cuenta_cerrada', `csv_line:${rec.lineNum}`],
        notes: `Registro vacío exportado por LinkedIn el 05/10/2026 (línea ${rec.lineNum} de Connections.csv). LinkedIn exporta únicamente la fecha de conexión cuando el usuario dio de baja su cuenta o eliminó sus datos.`,
      },
    });

    console.log(`Created: ${created.firstName} ${created.lastName} (ID: ${created.id}, Connected: ${rec.connectedOn.toISOString().split('T')[0]})`);
  }

  const count = await prisma.person.count();
  console.log(`\nTotal persons in database now: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
