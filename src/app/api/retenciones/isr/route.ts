// src/app/api/retenciones/isr/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const fechaParam = searchParams.get("fecha");
    const tenantSlug = tenantSlugFromRequest(request);
    const empresaId = empresaIdFromRequest(request);
    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    // ==========================
    // MANEJO DE FECHA (YYYY-MM)
    // ==========================
    let fecha = fechaParam;

    if (!fecha || fecha === "null") {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      fecha = `${y}-${m}`;
    }

    const [year, month] = fecha.split("-");

    // Primer día del mes
    const startDate = new Date(`${year}-${month}-01T00:00:00`);

    // Primer día del mes siguiente
    let nextY = Number(year);
    let nextM = Number(month);

    if (nextM === 12) {
      nextM = 1;
      nextY++;
    } else {
      nextM++;
    }

    const endDate = new Date(`${nextY}-${String(nextM).padStart(2, "0")}-01T00:00:00`);

    // ==========================
    // CONSULTA GNIO CON PRISMA
    // ==========================
    const retenciones = await prisma.retencionIsr.findMany({
      where: {
        empresa_id: auth.empresa.id,
        fecha_trabajo: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        fecha_trabajo: "asc",
      },
    });

    return NextResponse.json({
      status: 200,
      data: retenciones,
      message: "Retenciones ISR obtenidas correctamente",
    });
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

    console.error("ERROR GET RETENCIONES ISR:", error);

    return NextResponse.json({
      status: 400,
      message: error.message || "Ocurrió un error al obtener retenciones ISR",
    });
  }
}
