const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const data = await prisma.asientoContable.findMany({
    where: { correlativo: { in: [79, 80] } },
    include: { partidas: true },
  });
  console.log(JSON.stringify(data, null, 2));
}

main()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
  });
