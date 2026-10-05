const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const persons = await prisma.person.findMany();
  console.log('Persons:', persons.length);
  console.log(persons);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
