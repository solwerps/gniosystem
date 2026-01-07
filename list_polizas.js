const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const polizas = await prisma.tipoPoliza.findMany({
    select: { id: true, nombre: true },
    orderBy: { id: "asc" },
  });
  console.log(polizas);
}

main()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
  });
