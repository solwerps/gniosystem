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

    let fecha = fechaParam;
    if (!fecha || fecha === "null") {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      fecha = `${y}-${m}`;
    }

    const [year, month] = String(fecha).split("-");
    if (!year || !month) {
      return NextResponse.json({
        status: 400,
        message: "fecha debe tener formato YYYY-MM",
      });
    }

    const baseDate = new Date(`${year}-${month}-01T00:00:00`);
    const prevDate = new Date(baseDate);
    prevDate.setMonth(prevDate.getMonth() - 1);

    const startDate = new Date(prevDate.getFullYear(), prevDate.getMonth(), 1);
    const endDate = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1);

    const data = await prisma.ivaGeneralMensual.findFirst({
      where: {
        empresa_id: auth.empresa.id,
        fecha_trabajo: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        fecha_trabajo: "desc",
      },
    });

    return NextResponse.json({
      status: 200,
      data: data ?? null,
      message: "Formulario IVA mensual obtenido correctamente",
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

    console.error("ERROR GET /api/formularios/ivaMensual:", error);
    return NextResponse.json({
      status: 400,
      message: error.message || "Error al obtener formulario IVA mensual",
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tenantSlug = String(body?.tenant ?? tenantSlugFromRequest(request) ?? "");
    const empresaId = Number(body?.empresa_id ?? empresaIdFromRequest(request));
    const fecha = String(body.fecha ?? "");
    const resumen = body.resumenData ?? {};
    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    if (!fecha) {
      return NextResponse.json({
        status: 400,
        message: "fecha es requerida",
      });
    }

    const fechaAjustada = `${fecha.substring(0, 7)}-01`;
    const fechaTrabajo = new Date(`${fechaAjustada}T00:00:00`);

    const existing = await prisma.ivaGeneralMensual.findFirst({
      where: {
        empresa_id: auth.empresa.id,
        fecha_trabajo: fechaTrabajo,
      },
    });

    if (existing) {
      return NextResponse.json({
        status: 400,
        message: "Ya existe un registro con los datos proporcionados",
      });
    }

    await prisma.ivaGeneralMensual.create({
      data: {
        debito_total: Number(resumen.debito_total ?? 0),
        remanente_credito: Number(resumen.remanente_credito ?? 0),
        credito_total: Number(resumen.credito_total ?? 0),
        credito_periodo_siguiente: Number(resumen.credito_periodo_siguiente ?? 0),
        remanente_retenciones: Number(resumen.remanente_retenciones ?? 0),
        retenciones_recibidas: Number(resumen.retenciones_recibidas ?? 0),
        retenciones_periodo_siguiente: Number(resumen.retenciones_periodo_siguiente ?? 0),
        impuesto_a_pagar: Number(resumen.impuesto_a_pagar ?? 0),
        empresa_id: auth.empresa.id,
        fecha_trabajo: fechaTrabajo,
      },
    });

    return NextResponse.json({
      status: 200,
      data: {},
      message: "Registro para IVA mensual guardado correctamente",
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

    console.error("ERROR POST /api/formularios/ivaMensual:", error);
    return NextResponse.json({
      status: 400,
      message: error.message || "Error al guardar IVA mensual",
    });
  }
}
