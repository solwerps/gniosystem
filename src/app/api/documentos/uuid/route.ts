// src/app/api/documentos/uuid/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { is_value_unique } from "@/utils/functions/validateData";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const uuid = searchParams.get("uuid");
    if (!uuid) {
      return NextResponse.json(
        { status: 400, message: "Falta parámetro uuid", data: {} },
        { status: 400 }
      );
    }

    // 🔍 Verificar si el documento existe y está activo
    const existe = !(await is_value_unique("documentos", ["uuid", "estado"], [uuid, 1]));
    if (!existe) {
      return NextResponse.json(
        {
          status: 404,
          data: { uuid },
          message: "No existe un documento activo con ese UUID",
        },
        { status: 404 }
      );
    }

    // ✅ Buscar documento con Prisma e incluir relaciones
    const documento = await prisma.documento.findFirst({
      where: { uuid, estado: 1 },
      include: {
        empresa: {
          select: { id: true, nombre: true, nit: true, tenant: true },
        },
        cuentaDebe: {
          select: { cuenta: true, descripcion: true },
        },
        cuentaHaber: {
          select: { cuenta: true, descripcion: true },
        },
      },
    });

    if (!documento) {
      return NextResponse.json(
        {
          status: 404,
          data: { uuid },
          message: "Documento no encontrado o no pertenece al tenant actual",
        },
        { status: 404 }
      );
    }

    // 🧾 Formatear respuesta igual al front original
    const data = {
      ...documento,
      cuenta_debe: documento.cuentaDebe
        ? `${documento.cuentaDebe.descripcion} (${documento.cuentaDebe.cuenta})`
        : null,
      cuenta_haber: documento.cuentaHaber
        ? `${documento.cuentaHaber.descripcion} (${documento.cuentaHaber.cuenta})`
        : null,
    };

    return NextResponse.json({
      status: 200,
      data,
      message: "Documento obtenido correctamente",
    });
  } catch (error: any) {
    console.error("Error GET /api/documentos/uuid:", error);
    return NextResponse.json(
      { status: 500, data: {}, message: error.message || "Error al obtener documento" },
      { status: 500 }
    );
  }
}
