// src/app/api/cuentas/empresa/nit/route.ts
import { prisma } from "@/lib/prisma";
import type { Cuenta } from "@/utils/models/nomenclaturas";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    // 🔹 Mismos parámetros que el endpoint antiguo
    const nitParam = searchParams.get("nit") || "";
    const select = searchParams.get("select") === "true";

    if (!nitParam.trim()) {
      return Response.json(
        {
          status: 400,
          data: [],
          message: "Debe proporcionar un NIT válido.",
        },
        { status: 400 }
      );
    }

    // 1️⃣ Buscar la empresa por NIT (GNIO) + afiliaciones para obtener la nomenclatura
    const empresa = await prisma.empresa.findFirst({
      where: {
        nit: nitParam,
      },
      include: {
        afiliaciones: true, // aquí viene nomenclaturaId
      },
    });

    const nomenclaturaId = empresa?.afiliaciones?.nomenclaturaId ?? null;

    // 🧠 Comportamiento equivalente al JOIN original:
    // si no hay empresa o no tiene nomenclatura, simplemente no hay cuentas → lista vacía
    if (!empresa || !nomenclaturaId) {
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
    //    Filtro adicional GNIO: aseguramos que la Nomenclatura pertenezca al mismo tenant que la Empresa
    const cuentasRaw = await prisma.nomenclaturaCuenta.findMany({
      where: {
        nomenclaturaId,
        nomenclatura: {
          tenantId: empresa.tenantId, // 🔒 filtro adicional multi-tenant
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

    // 3️⃣ Ordenar jerárquicamente por código de cuenta (misma lógica que tu código original)
    const cuentasOrdenadas = ordenarCuentas(cuentasRaw);

    // 4️⃣ Modo "select=true": devolver { value, label, nivel, cuenta } como en el SQL original
    if (select) {
      const data = cuentasOrdenadas.map((c) => ({
        value: c.id, // en GNIO: id numérico de NomenclaturaCuenta (antes era uuid de cuentas)
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
    console.error("Error en GET /api/cuentas/empresa/nit:", error);
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

// 🔧 Mismo algoritmo de orden jerárquico por código de cuenta
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
