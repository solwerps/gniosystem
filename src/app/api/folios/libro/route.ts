// src/app/api/folios/libro/route.ts
import { prisma } from "@/lib/prisma";
import type { IFolioPutBody } from "@/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const empresa_id_param = searchParams.get("empresa_id") ?? "0";
    const libro_id_param = searchParams.get("libro_id") ?? "0";

    const empresa_id = Number(empresa_id_param);
    const libro_id = Number(libro_id_param);

    if (!empresa_id || empresa_id === 0) {
      throw new Error("La empresa es requerida");
    }
    if (!libro_id || libro_id === 0) {
      throw new Error("El id del libro es requerido");
    }

    // ✅ Validar que exista empresa activa (estado = 1)
    const empresa = await prisma.empresa.findFirst({
      where: {
        id: empresa_id,
        estado: 1,
      },
    });

    if (!empresa) {
      return Response.json({
        status: 400,
        data: { empresa_id },
        message: "No existe una empresa con ese id",
      });
    }

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
    console.log(error);
    return Response.json({
      status: 400,
      data: {},
      message: error?.message ?? "Error al obtener folios",
    });
  }
}

export async function PUT(request: Request) {
  const body: IFolioPutBody = await request.json();

  try {
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
    console.log(error);
    return Response.json({
      status: 400,
      data: {},
      message: error?.message ?? "Error al actualizar los folios",
    });
  }
}
