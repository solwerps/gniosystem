// src/app/api/cuentas/route.ts
import { prisma } from "@/lib/prisma";
import type { Cuenta } from "@/utils/models/nomenclaturas";

// Firma igual a la original: GET(request: Request)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 🔹 Mismos parámetros que el endpoint antiguo
  const nomenclaturaParam = searchParams.get("nomenclatura_contable_id");
  const selectParam = searchParams.get("select");

  // 🔹 Filtro adicional opcional por empresa (puedes mandar empresa_id o empresaId)
  const empresaParam =
    searchParams.get("empresa_id") ?? searchParams.get("empresaId");

  const select = selectParam === "true";

  try {
    let nomenclaturaId: number | null = null;
    let tenantId: number | undefined = undefined;

    // 1️⃣ Si viene empresa_id, resolvemos tenant y nomenclatura desde GNIO
    if (empresaParam) {
      const empresaId = Number(empresaParam);
      if (!empresaId || Number.isNaN(empresaId)) {
        return Response.json(
          {
            status: 400,
            data: [],
            message: "empresa_id inválido.",
          },
          { status: 400 }
        );
      }

      const empresa = await prisma.empresa.findUnique({
        where: { id: empresaId },
        include: { afiliaciones: true },
      });

      if (!empresa) {
        return Response.json(
          {
            status: 404,
            data: [],
            message: "Empresa no encontrada.",
          },
          { status: 404 }
        );
      }

      tenantId = empresa.tenantId;

      // Si la empresa tiene nomenclatura afiliada, se usa esa como prioridad
      if (empresa.afiliaciones?.nomenclaturaId) {
        nomenclaturaId = empresa.afiliaciones.nomenclaturaId;
      }
    }

    // 2️⃣ Si no se resolvió nomenclatura aún, usamos nomenclatura_contable_id del query (como antes)
    if (!nomenclaturaId && nomenclaturaParam) {
      const n = Number(nomenclaturaParam);
      if (!Number.isNaN(n) && n > 0) {
        nomenclaturaId = n;
      }
    }

    if (!nomenclaturaId) {
      return Response.json(
        {
          status: 400,
          data: [],
          message:
            "Debe proporcionar un nomenclatura_contable_id válido o una empresa con nomenclatura afiliada.",
        },
        { status: 400 }
      );
    }

    // 3️⃣ Armamos el where para Prisma (con filtro adicional por tenant si lo tenemos)
    const where: any = {
      nomenclaturaId,
    };

    if (tenantId) {
      // Asegura que la nomenclatura pertenece al mismo tenant de la empresa
      where.nomenclatura = { tenantId };
    }

    // 4️⃣ Consultamos NomenclaturaCuenta (equivalente a la tabla 'cuentas' vieja)
    const cuentasRaw = await prisma.nomenclaturaCuenta.findMany({
      where,
      select: {
        id: true,
        cuenta: true,
        descripcion: true,
        nivel: true,
        naturaleza: true,
        nomenclaturaId: true,
      },
    });

    // 5️⃣ Ordenamos igual que antes por código de cuenta
    const cuentasOrdenadas = ordenarCuentas(cuentasRaw);

    // 6️⃣ Modo "select=true": devuelve { value, label } como antes
    if (select) {
      const options = cuentasOrdenadas.map((c) => ({
        value: c.id, // ahora id numérico, alineado con SelectOption de GNIO
        label: `${c.descripcion} (${c.cuenta})`,
      }));

      return Response.json(
        {
          status: 200,
          data: options,
          message: "Cuentas obtenidas correctamente (modo select).",
        },
        { status: 200 }
      );
    }

    // 7️⃣ Modo normal: devolvemos las cuentas completas alineadas a tu interface Cuenta
    const cuentas: Cuenta[] = cuentasOrdenadas.map((c) => ({
      id: c.id,
      cuenta: c.cuenta,
      descripcion: c.descripcion,
      nivel: c.nivel,
      naturaleza: c.naturaleza,
      nomenclaturaId: c.nomenclaturaId,
    }));

    return Response.json(
      {
        status: 200,
        data: cuentas,
        message: "Cuentas obtenidas correctamente.",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error en GET /api/cuentas:", error);
    return Response.json(
      {
        status: 500,
        data: [],
        message: "Error interno del servidor.",
        error: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}

// 🔧 Ordena por código de cuenta jerárquicamente (misma idea que tu utils original)
function ordenarCuentas<T extends { cuenta: string | number }>(cuentas: T[]): T[] {
  if (!Array.isArray(cuentas) || cuentas.length === 0) return [];

  return [...cuentas].sort((a, b) => {
    const cuentaA = a.cuenta.toString();
    const cuentaB = b.cuenta.toString();

    const minLen = Math.min(cuentaA.length, cuentaB.length);
    for (let i = 0; i < minLen; i++) {
      if (cuentaA[i] !== cuentaB[i]) {
        return cuentaA[i].localeCompare(cuentaB[i]);
      }
    }

    // Si una cuenta es prefijo de la otra, la más corta va primero
    return cuentaA.length - cuentaB.length;
  });
}
