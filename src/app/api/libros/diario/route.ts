// src/app/api/libros/diario/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const fechaParam = searchParams.get("fecha") ?? "";
    const ordenParam = (searchParams.get("orden") ?? "ascendente").toLowerCase();
    const orden: "asc" | "desc" = ordenParam.startsWith("desc") ? "desc" : "asc";
    const tenantSlug = tenantSlugFromRequest(request);
    const empresaId = empresaIdFromRequest(request);
    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    if (!fechaParam) {
      return NextResponse.json(
        { status: 400, data: [], message: "Parámetro 'fecha' obligatorio." },
        { status: 400 }
      );
    }

    // Aceptamos YYYY-MM o fecha ISO; tomamos solo año/mes
    const match = fechaParam.match(/^(\d{4})-(\d{2})/);
    if (!match) {
      return NextResponse.json(
        {
          status: 400,
          data: [],
          message: "Parámetro 'fecha' inválido. Esperado 'YYYY-MM' o 'YYYY-MM-DD'.",
        },
        { status: 400 }
      );
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;

    if (
      Number.isNaN(year) ||
      Number.isNaN(monthIndex) ||
      monthIndex < 0 ||
      monthIndex > 11
    ) {
      return NextResponse.json(
        { status: 400, data: [], message: "Parámetro 'fecha' inválido." },
        { status: 400 }
      );
    }

    // Rango [primer día del mes, primer día del mes siguiente)
    const inicioMes = new Date(Date.UTC(year, monthIndex, 1));
    const finMes = new Date(Date.UTC(year, monthIndex + 1, 1));

    const documentos = await prisma.documento.findMany({
      where: {
        empresa_id: auth.empresa.id,
        estado: 1,
        marca_anulado: "No",
        fecha_trabajo: {
          gte: inicioMes,
          lt: finMes,
        },
      },
      orderBy: {
        fecha_emision: orden,
      },
    });

    return NextResponse.json(
      { status: 200, data: documentos, message: "Documentos obtenidos correctamente." },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AccountingError) {
      return NextResponse.json(
        {
          status: error.status,
          code: error.code,
          message: error.message,
          data: [],
        },
        { status: error.status }
      );
    }

    console.error("Error en /api/libros/diario:", error);
    return NextResponse.json(
      { status: 500, data: [], message: "Error interno al obtener documentos." },
      { status: 500 }
    );
  }
}
