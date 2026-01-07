// prisma/seed.ts
import { PrismaClient, Role, TenantType, TenantRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed GNIO...");

  // ===========================
  // 1) Usuarios base
  // ===========================
  const users = [
    { username: 'admin',    email: 'admin@gnio.local',    password: 'admin123',    role: Role.ADMIN },
    { username: 'contador', email: 'contador@gnio.local', password: 'contador123', role: Role.CONTADOR },
    { username: 'empresa',  email: 'empresa@gnio.local',  password: 'empresa123',  role: Role.EMPRESA },
  ];

  const createdUsers: Record<string, { id: number }> = {};

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { email: u.email, passwordHash, role: u.role },
      create: { username: u.username, email: u.email, passwordHash, role: u.role },
      select: { id: true },
    });
    createdUsers[u.username] = user;
  }

  const contadorUserId = createdUsers['contador'].id;
  const empresaUserId  = createdUsers['empresa'].id;

  // ===========================
  // 2) Tenants base
  // ===========================
  const tenantContador = await prisma.tenant.upsert({
    where: { slug: 'contador' },
    update: {},
    create: {
      type: TenantType.PERSONAL,
      slug: 'contador',
      displayName: 'Entorno Contador',
      createdById: contadorUserId,
    },
  });

  const tenantEmpresa = await prisma.tenant.upsert({
    where: { slug: 'empresa' },
    update: {},
    create: {
      type: TenantType.COMPANY,
      slug: 'empresa',
      displayName: 'Empresa S.A.',
      createdById: empresaUserId,
    },
  });

  // ===========================
  // 3) Memberships OWNER
  // ===========================
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: contadorUserId, tenantId: tenantContador.id } },
    update: {},
    create: {
      userId: contadorUserId,
      tenantId: tenantContador.id,
      role: TenantRole.OWNER,
    },
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: empresaUserId, tenantId: tenantEmpresa.id } },
    update: {},
    create: {
      userId: empresaUserId,
      tenantId: tenantEmpresa.id,
      role: TenantRole.OWNER,
    },
  });

  // ===========================
  // 4) Tipos de póliza (catálogo Conta Cox 1–12)
  // ===========================
  await prisma.tipoPoliza.createMany({
    data: [
      { id: 1,  nombre: "Poliza de Diario",                 estado: 1 },
      { id: 2,  nombre: "Poliza de Ajustes",                estado: 1 },
      { id: 3,  nombre: "Poliza de Apertura",               estado: 1 },
      { id: 4,  nombre: "Poliza de Cierre",                 estado: 1 },
      { id: 5,  nombre: "Poliza de Nomina",                 estado: 1 },
      { id: 6,  nombre: "Poliza de Compras",                estado: 1 },
      { id: 7,  nombre: "Poliza de Ventas",                 estado: 1 },
      { id: 8,  nombre: "Poliza de Bancos",                 estado: 1 },
      { id: 9,  nombre: "Poliza de Cuentas por Pagar",      estado: 1 },
      { id: 10, nombre: "Poliza de Retenciones de IVA",     estado: 1 },
      { id: 11, nombre: "Poliza de Retenciones de ISR",     estado: 1 },
      { id: 12, nombre: "Poliza de Regularización de IVA",  estado: 1 },
    ],
    skipDuplicates: true, // por si corres el seed varias veces
  });

  console.log("✅ Tipos de póliza sembrados (1–12, estilo Conta Cox)");

  // ===========================
  // 5) Libros contables (catálogo Conta Cox 1–12)
  // ===========================
  await prisma.libroContable.createMany({
    data: [
      { id: 1,  nombre_libro: "Libro de Compras" },
      { id: 2,  nombre_libro: "Libro de Ventas" },
      { id: 3,  nombre_libro: "Libro Diario" },
      { id: 4,  nombre_libro: "Libro Mayor" },
      { id: 5,  nombre_libro: "Estados Financieros" },
      { id: 6,  nombre_libro: "Libro de Caja" },
      { id: 7,  nombre_libro: "Libro de Inventario" },
      { id: 8,  nombre_libro: "Libro de Cuentas Corrientes" },
      { id: 9,  nombre_libro: "Libro de Planillas" },
      { id: 10, nombre_libro: "Libro de Mayor General" },
      { id: 11, nombre_libro: "Libro de Registros Auxiliares" },
      { id: 12, nombre_libro: "Libro Diario (Resumen)" },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Libros contables sembrados (1–12, estilo Conta Cox)");

  // ===========================
  // 6) Resumen
  // ===========================
  console.table([
    { user: 'admin@gnio.local',    role: 'ADMIN',    tenant: '(no aplica)' },
    { user: 'contador@gnio.local', role: 'CONTADOR', tenant: tenantContador.slug },
    { user: 'empresa@gnio.local',  role: 'EMPRESA',  tenant: tenantEmpresa.slug },
  ]);

  console.log("✅ Seed listo: usuarios, tenants, tipos de póliza y libros contables.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed GNIO:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
