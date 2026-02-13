// src/app/api/cuentas/empresa/route.ts
import prisma from "@/lib/prisma";
import type { Cuenta } from "@/utils/models/nomenclaturas";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
} from "@/lib/accounting/context";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    // 🔹 Igual que el endpoint viejo: empresa_id y select
    const empresaParam = searchParams.get("empresa_id") ?? "0";
    const select = searchParams.get("select") === "true";
    const tenantSlug = tenantSlugFromRequest(request);

    const empresaId = Number(empresaParam);

    if (!empresaId || Number.isNaN(empresaId)) {
      return Response.json(
        {
          status: 400,
          data: [],
          message: "Debe proporcionar un empresa_id válido.",
        },
        { status: 400 }
      );
    }

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    // 1️⃣ Buscar la empresa GNIO y su afiliación (para obtener la nomenclatura)
    const empresa = await prisma.empresa.findUnique({
      where: { id: auth.empresa.id },
      include: {
        afiliaciones: true, // aquí viene nomenclaturaId
      },
    });

    // Si no hay empresa o no tiene nomenclatura afiliada → mismo efecto que el JOIN viejo: no hay filas
    const nomenclaturaId = empresa?.afiliaciones?.nomenclaturaId ?? null;

    if (!empresa || !nomenclaturaId) {
      // Mantenemos la idea de "no truena, solo devuelve vacío"
      return Response.json(
        {
          status: 200,
          data: [],
          message: "Cuentas obtenidas correctamente",
        },
        { status: 200 }
      );
    }

    // 2️⃣ Traer cuentas de esa nomenclatura (equivalente a JOIN empresas → nomenclatura → cuentas)
    const cuentasRaw = await prisma.nomenclaturaCuenta.findMany({
      where: {
        nomenclaturaId,
        // 🛡️ Filtro adicional GNIO: asegurar que la nomenclatura pertenece al mismo tenant de la empresa
        nomenclatura: {
          tenantId: empresa.tenantId,
        },
      },
      select: {
        id: true,
        cuenta: true,
        descripcion: true,
        nivel: true,
        naturaleza: true,
        nomenclaturaId: true,
      },
    });

    // 3️⃣ Ordenar jerárquicamente por código de cuenta (misma lógica que tu utils original)
    const cuentasOrdenadas = ordenarCuentas(cuentasRaw);

    // 4️⃣ Modo "select=true": devolver { value, label, nivel, cuenta } como en el SQL original
    if (select) {
      const data = cuentasOrdenadas.map((c) => ({
        value: c.id, // en GNIO usamos id numérico en vez de uuid
        label: `${c.descripcion} (${c.cuenta})`,
        nivel: c.nivel,
        cuenta: c.cuenta,
      }));

      return Response.json(
        {
          status: 200,
          data,
          message: "Cuentas obtenidas correctamente",
        },
        { status: 200 }
      );
    }

    // 5️⃣ Modo normal: devolvemos las cuentas alineadas a la interface Cuenta de GNIO
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
        message: "Cuentas obtenidas correctamente",
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof AccountingError) {
      return Response.json(
        {
          status: error.status,
          data: [],
          code: error.code,
          message: error.message,
        },
        { status: error.status }
      );
    }

    console.error("Error en GET /api/cuentas/empresa:", error);
    return Response.json(
      {
        status: 500,
        data: [],
        message: "Error interno del servidor",
        error: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}

// 🔧 Mismo algoritmo de orden jerárquico que tu código original
const ordenarCuentas = <T extends { cuenta: string | number }>(cuentas: T[]): T[] => {
  if (!Array.isArray(cuentas) || cuentas.length === 0) {
    return [];
  }

  return [...cuentas].sort((a, b) => {
    const cuentaA = a.cuenta.toString();
    const cuentaB = b.cuenta.toString();

    // Encontrar el prefijo común más largo
    const minLen = Math.min(cuentaA.length, cuentaB.length);
    for (let i = 0; i < minLen; i++) {
      if (cuentaA[i] !== cuentaB[i]) {
        return cuentaA[i].localeCompare(cuentaB[i]);
      }
    }

    // Si una cuenta es prefijo de la otra, la más corta va primero
    return cuentaA.length - cuentaB.length;
  });
};
