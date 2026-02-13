import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";

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

    const existing = await prisma.formularioIsrOpcionalMensual.findFirst({
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

    await prisma.formularioIsrOpcionalMensual.create({
      data: {
        monto_bienes: Number(resumen.monto_bienes ?? 0),
        monto_servicios: Number(resumen.monto_servicios ?? 0),
        monto_descuentos: Number(resumen.monto_descuentos ?? 0),
        iva: Number(resumen.iva ?? 0),
        monto_base: Number(resumen.monto_base ?? 0),
        facturas_emitidas: Number(resumen.facturas_emitidas ?? 0),
        retenciones_isr: Number(resumen.retenciones_isr ?? 0),
        monto_isr_porcentaje_5: Number(resumen.monto_isr_porcentaje_5 ?? 0),
        monto_isr_porcentaje_7: Number(resumen.monto_isr_porcentaje_7 ?? 0),
        isr: Number(resumen.isr ?? 0),
        isr_retenido: Number(resumen.isr_retenido ?? 0),
        isr_x_pagar: Number(resumen.isr_x_pagar ?? 0),
        empresa_id: auth.empresa.id,
        fecha_trabajo: fechaTrabajo,
      },
    });

    return NextResponse.json({
      status: 200,
      data: {},
      message: "Registro para ISR opcional guardado correctamente",
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

    console.error("ERROR POST /api/formularios/isrOpcional:", error);
    return NextResponse.json({
      status: 400,
      message: error.message || "Error al guardar ISR opcional",
    });
  }
}
