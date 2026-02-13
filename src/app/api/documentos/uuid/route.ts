import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const uuid = String(searchParams.get("uuid") ?? "").trim();
    const tenantSlug = tenantSlugFromRequest(req);
    const empresaId = empresaIdFromRequest(req);

    if (!uuid) {
      return NextResponse.json(
        { status: 400, message: "Falta parámetro uuid.", data: {} },
        { status: 400 }
      );
    }

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    const documento = await prisma.documento.findFirst({
      where: {
        uuid,
        empresa_id: auth.empresa.id,
        estado: 1,
      },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
            tenantSlug: true,
          },
        },
        cuentaDebe: {
          select: {
            id: true,
            cuenta: true,
            descripcion: true,
          },
        },
        cuentaHaber: {
          select: {
            id: true,
            cuenta: true,
            descripcion: true,
          },
        },
        cuenta_bancaria: {
          select: {
            id: true,
            numero: true,
            banco: true,
          },
        },
      },
    });

    if (!documento) {
      return NextResponse.json(
        { status: 404, message: "Documento no encontrado.", data: { uuid } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        status: 200,
        message: "Documento obtenido correctamente.",
        data: {
          ...documento,
          cuenta_debe_nombre: documento.cuentaDebe?.descripcion ?? null,
          cuenta_haber_nombre: documento.cuentaHaber?.descripcion ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof AccountingError) {
      return NextResponse.json(
        {
          status: error.status,
          code: error.code,
          message: error.message,
        },
        { status: error.status }
      );
    }

    console.error("GET /api/documentos/uuid", error);
    return NextResponse.json(
      { status: 500, message: "Error interno al obtener documento.", data: {} },
      { status: 500 }
    );
  }
}
