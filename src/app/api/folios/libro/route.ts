// src/app/api/folios/libro/route.ts
import { prisma } from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";
import type { IFolioPutBody } from "@/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const libro_id_param = searchParams.get("libro_id") ?? "0";

    const tenantSlug = tenantSlugFromRequest(request);
    const empresaId = empresaIdFromRequest(request);
    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    const empresa_id = auth.empresa.id;
    const libro_id = Number(libro_id_param);
    if (!libro_id || libro_id === 0) {
      throw new Error("El id del libro es requerido");
    }

    // ✅ Validar que exista empresa activa (estado = 1)
    // ✅ Validar que exista el libro contable
    const libro = await prisma.libroContable.findUnique({
      where: {
        id: libro_id,
      },
    });

    if (!libro) {
      return Response.json({
        status: 400,
        data: { libro_id },
        message: "No existe una libro contable con ese id",
      });
    }

    // ✅ Obtener el folio para esa empresa y ese libro
    const folio = await prisma.folio.findFirst({
      where: {
        empresa_id,
        libro_contable_id: libro_id,
      },
      include: {
        libro_contable: true,
      },
    });

    if (!folio) {
      // En Conta Cox asumíamos que siempre existía, pero aquí devolvemos error controlado
      return Response.json({
        status: 400,
        data: { empresa_id, libro_id },
        message: "No existe un folio configurado para esa empresa y libro",
      });
    }

    const data = {
      folio_id: folio.id,
      contador_folios: folio.contador_folios,
      libro_contable_id: folio.libro_contable_id,
      folios_disponibles: folio.folios_disponibles,
      nombre_libro: folio.libro_contable.nombre_libro,
    };

    return Response.json({
      status: 200,
      data,
      message: "Folios obtenidos correctamente",
    });
  } catch (error: any) {
    if (error instanceof AccountingError) {
      return Response.json(
        {
          status: error.status,
          code: error.code,
          data: {},
          message: error.message,
        },
        { status: error.status }
      );
    }

    console.log(error);
    return Response.json({
      status: 400,
      data: {},
      message: error?.message ?? "Error al obtener folios",
    });
  }
}

export async function PUT(request: Request) {
  const body: IFolioPutBody & { tenant?: string; empresa_id?: number } =
    await request.json();

  try {
    const tenantSlug = String(body?.tenant ?? tenantSlugFromRequest(request) ?? "");
    const empresaId = Number(body?.empresa_id ?? empresaIdFromRequest(request));
    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    if (!body.folio_id) {
      throw new Error("El id del folio es requerido");
    }

    // ✅ Validar que exista el folio
    const folio = await prisma.folio.findUnique({
      where: {
        id: body.folio_id,
      },
    });

    if (!folio) {
      return Response.json({
        status: 400,
        data: { folio_id: body.folio_id },
        message: "No existe un folio con ese ID",
      });
    }
    if (folio.empresa_id !== auth.empresa.id) {
      return Response.json(
        {
          status: 403,
          data: { folio_id: body.folio_id },
          message: "El folio no pertenece a la empresa autorizada",
        },
        { status: 403 }
      );
    }

    // ✅ Actualizar contador y folios disponibles (misma lógica que el SQL)
    const updated = await prisma.folio.update({
      where: {
        id: body.folio_id,
      },
      data: {
        contador_folios: {
          increment: body.folios_used,
        },
        folios_disponibles: {
          decrement: body.folios_used,
        },
      },
    });

    return Response.json({
      status: 200,
      data: updated,
      message: "Folios obtenidos correctamente",
    });
  } catch (error: any) {
    if (error instanceof AccountingError) {
      return Response.json(
        {
          status: error.status,
          code: error.code,
          data: {},
          message: error.message,
        },
        { status: error.status }
      );
    }

    console.log(error);
    return Response.json({
      status: 400,
      data: {},
      message: error?.message ?? "Error al actualizar los folios",
    });
  }
}
