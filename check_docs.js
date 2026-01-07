const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.documento.findMany({
    where: { empresa_id: 3, fecha_trabajo: new Date("2025-01-01T00:00:00Z") },
    select: {
      uuid: true,
      identificador_unico: true,
      numero_autorizacion: true,
      monto_total: true,
      cuenta_debe: true,
      cuenta_haber: true,
      tipo: true,
      fecha_trabajo: true,
      fecha_emision: true,
    },
  });
  console.log(docs);
}

main()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
  });
