import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding niches and research plans...');

  // ─── Niches ──────────────────────────────────────────────────────────────
  const abogados = await prisma.niche.upsert({
    where: { slug: 'abogados' },
    update: {},
    create: {
      slug: 'abogados',
      name: 'Abogados',
      description: 'Firmas legales, abogados independientes y profesionales del derecho',
    },
  });

  const recruiters = await prisma.niche.upsert({
    where: { slug: 'recruiters' },
    update: {},
    create: {
      slug: 'recruiters',
      name: 'Recruiters',
      description: 'Recruiters, talent acquisition, headhunters y profesionales de RRHH',
    },
  });

  const taxAdvisors = await prisma.niche.upsert({
    where: { slug: 'tax-advisors' },
    update: {},
    create: {
      slug: 'tax-advisors',
      name: 'Tax Advisors',
      description: 'Asesores fiscales, contables y profesionales de impuestos',
    },
  });

  const psicologos = await prisma.niche.upsert({
    where: { slug: 'psicologos' },
    update: {},
    create: {
      slug: 'psicologos',
      name: 'Psicólogos',
      description: 'Psicólogos clínicos, terapeutas y consultas privadas de psicología',
    },
  });

  const sexologos = await prisma.niche.upsert({
    where: { slug: 'sexologos' },
    update: {},
    create: {
      slug: 'sexologos',
      name: 'Sexólogos',
      description: 'Sexólogos y terapeutas especializados en salud sexual',
    },
  });

  const otros = await prisma.niche.upsert({
    where: { slug: 'otros' },
    update: {},
    create: {
      slug: 'otros',
      name: 'Otros',
      description: 'Conexiones que no encajan en ningún nicho de investigación activo',
    },
  });

  console.log(`✅ Niches: ${abogados.name}, ${recruiters.name}, ${taxAdvisors.name}, ${psicologos.name}, ${sexologos.name}, ${otros.name}`);

  // ─── Research Plan: Abogados ─────────────────────────────────────────────
  const existingPlanAbogados = await prisma.researchPlan.findUnique({
    where: { nicheId: abogados.id },
  });

  if (!existingPlanAbogados) {
    const planAbogados = await prisma.researchPlan.create({
      data: {
        nicheId: abogados.id,
        title: 'Arquitectura Empresarial: Firmas de Abogados',
        description:
          'Investigación sobre cómo operan las firmas legales por dentro: captación, gestión de casos, documentación, tecnología, cuellos de botella y oportunidades.',
        questions: {
          create: [
            {
              order: 1,
              question: '¿Cómo llegan los clientes a tu firma normalmente — referidos, redes sociales, publicidad, otra cosa?',
              context: 'Entender el canal de captación. Identificar si es un proceso estructurado o informal.',
            },
            {
              order: 2,
              question: 'Cuando un cliente potencial contacta con vosotros, ¿cómo es ese primer proceso de intake — qué información recogéis y cómo?',
              context: 'Mapear el proceso de intake: formularios, llamadas, reuniones, sistemas utilizados.',
            },
            {
              order: 3,
              question: '¿Cómo gestionáis los casos activos — usáis algún software específico o es más manual?',
              context: 'Identificar si usan software de gestión legal (Clio, MyCase, etc.) o Excel/email.',
            },
            {
              order: 4,
              question: '¿Cuánto tiempo diría que dedicas a tareas administrativas versus trabajo legal propiamente dicho?',
              context: 'Cuantificar el dolor administrativo. Este número suele sorprender y abrir la conversación.',
            },
            {
              order: 5,
              question: '¿Cómo gestionáis la documentación — contratos, escritos, expedientes? ¿Hay algún proceso de búsqueda o todo está en carpetas?',
              context: 'Identificar si tienen problemas de búsqueda de documentos, versioning, o almacenamiento.',
            },
            {
              order: 6,
              question: '¿Cómo comunicáis con los clientes durante el caso — email, WhatsApp, llamadas, portal cliente?',
              context: 'Entender el canal de comunicación y si hay fricción o desorganización.',
            },
            {
              order: 7,
              question: '¿Cómo gestionáis la facturación y el seguimiento de pagos?',
              context: 'Identificar si usan software de facturación o lo hacen manualmente.',
            },
            {
              order: 8,
              question: 'Si pudieras resolver un solo problema en la operación de tu firma con un chasquido de dedos, ¿cuál sería?',
              context: 'Pregunta abierta para que identifiquen su dolor principal. Altísimo valor diagnóstico.',
            },
            {
              order: 9,
              question: '¿Habéis intentado digitalizar o automatizar algún proceso? ¿Cómo fue esa experiencia?',
              context: 'Entender si ya tienen experiencia con tecnología y qué barreras encontraron.',
            },
            {
              order: 10,
              question: '¿Cómo ves la adopción de IA en el sector legal — amenaza, oportunidad, o todavía muy lejos?',
              context: 'Calibrar su apertura mental a la tecnología. Útil para entender el perfil de early adopter vs. rezagado.',
            },
          ],
        },
      },
    });
    console.log(`✅ Research Plan for Abogados: "${planAbogados.title}" with 10 questions`);
  } else {
    console.log(`ℹ️  Research Plan for Abogados already exists, skipping`);
  }

  // ─── Research Plan: Recruiters ───────────────────────────────────────────
  const existingPlanRecruiters = await prisma.researchPlan.findUnique({
    where: { nicheId: recruiters.id },
  });

  if (!existingPlanRecruiters) {
    const planRecruiters = await prisma.researchPlan.create({
      data: {
        nicheId: recruiters.id,
        title: 'Arquitectura Empresarial: Agencias y Equipos de Recruiting',
        description:
          'Investigación sobre cómo operan los equipos de talent acquisition: sourcing, ATS, flujo de candidatos, comunicación, métricas y puntos de dolor.',
        questions: {
          create: [
            {
              order: 1,
              question: '¿Cómo describirías tu proceso típico para cubrir una vacante, de principio a fin?',
              context: 'Mapear el flujo completo. Identificar dónde hay fricción.',
            },
            {
              order: 2,
              question: '¿Qué herramientas usas para gestionar candidatos — tienes ATS, LinkedIn Recruiter, hojas de cálculo...?',
              context: 'Entender el stack tecnológico actual y si hay fragmentación.',
            },
            {
              order: 3,
              question: '¿Cuánto tiempo te lleva aproximadamente cubrir una vacante desde que recibes el brief hasta que hay candidatos finalistas?',
              context: 'Cuantificar el tiempo de ciclo. Identificar si hay cuellos de botella.',
            },
            {
              order: 4,
              question: '¿Cuáles son las fases del proceso donde más tiempo pierdes o donde más fricción sientes?',
              context: 'Pregunta directa al dolor. Suele generar respuestas muy reveladoras.',
            },
            {
              order: 5,
              question: '¿Cómo gestionas la comunicación con los candidatos — hay mucho trabajo manual de emails o tienes algo automatizado?',
              context: 'Identificar si la comunicación con candidatos es un punto de dolor (suele serlo).',
            },
            {
              order: 6,
              question: '¿Cómo reportas resultados a los hiring managers o clientes?',
              context: 'Entender si el reporting es manual, qué métricas se usan, y si hay desconexión.',
            },
            {
              order: 7,
              question: '¿Qué porcentaje de tu tiempo dirías que dedicas a sourcing vs. coordinación/administración?',
              context: 'Cuantificar la carga administrativa vs. trabajo de valor.',
            },
            {
              order: 8,
              question: 'Si pudieras automatizar o eliminar un proceso de tu día a día, ¿cuál elegiría?',
              context: 'Pregunta abierta de alto valor para identificar el dolor principal.',
            },
            {
              order: 9,
              question: '¿Cómo ves el impacto de la IA en el recruiting — ya lo estás usando, lo estás explorando, o crees que todavía no es el momento?',
              context: 'Calibrar apertura tecnológica y posicionamiento para una eventual propuesta.',
            },
          ],
        },
      },
    });
    console.log(`✅ Research Plan for Recruiters: "${planRecruiters.title}" with 9 questions`);
  } else {
    console.log(`ℹ️  Research Plan for Recruiters already exists, skipping`);
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
