import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = tenantSlugFromRequest(request);
    const empresaId = Number(
      searchParams.get("empresa_id") ??
        searchParams.get("empresaId") ??
        empresaIdFromRequest(request)
    );

    const cuentaId = Number(
      searchParams.get("cuenta_bancaria_id") ??
        searchParams.get("cuentaBancariaId")
    );
    const fechaInicioRaw =
      searchParams.get("fecha_inicio") ?? searchParams.get("fechaInicio");
    const fechaFinRaw =
      searchParams.get("fecha_fin") ?? searchParams.get("fechaFin");

    if (!cuentaId || Number.isNaN(cuentaId)) {
      return NextResponse.json(
        {
          status: 400,
          data: [],
          message: "Parámetro 'cuenta_bancaria_id' inválido o ausente.",
        },
        { status: 400 }
      );
    }

    if (!fechaInicioRaw || !fechaFinRaw) {
      return NextResponse.json(
        {
          status: 400,
          data: [],
          message: "Parámetros 'fecha_inicio' y 'fecha_fin' son obligatorios.",
        },
        { status: 400 }
      );
    }

    const fechaInicio = new Date(fechaInicioRaw);
    const fechaFin = new Date(fechaFinRaw);

    if (
      Number.isNaN(fechaInicio.getTime()) ||
      Number.isNaN(fechaFin.getTime())
    ) {
      return NextResponse.json(
        {
          status: 400,
          data: [],
          message: "Parámetros de fecha inválidos.",
        },
        { status: 400 }
      );
    }

    if (isDateOnly(fechaFinRaw)) {
      fechaFin.setHours(23, 59, 59, 999);
    }

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    const cuenta = await prisma.cuentaBancaria.findFirst({
      where: {
        id: cuentaId,
        empresaId: auth.empresa.id,
      },
      select: { id: true },
    });

    if (!cuenta) {
      return NextResponse.json(
        {
          status: 404,
          data: [],
          message: "La cuenta bancaria no pertenece a la empresa.",
        },
        { status: 404 }
      );
    }

    const movimientos = await prisma.movimientoCuentaBancaria.findMany({
      where: {
        cuenta_bancaria_id: cuentaId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      orderBy: [{ fecha: "asc" }, { id: "asc" }],
      select: {
        id: true,
        cuenta_bancaria_id: true,
        fecha: true,
        descripcion: true,
        tipo_movimiento: true,
        monto: true,
        referencia: true,
        estado: true,
        estado_conciliacion: true,
        match_id: true,
        documento_uuid: true,
        asiento_contable_id: true,
      },
    });

    const data = movimientos.map((movimiento) => ({
      id: movimiento.id,
      cuenta_bancaria_id: movimiento.cuenta_bancaria_id,
      fecha: movimiento.fecha,
      descripcion: movimiento.descripcion ?? "",
      tipo_movimiento: movimiento.tipo_movimiento,
      monto: movimiento.monto.toString(),
      referencia: movimiento.referencia ?? "",
      estado: movimiento.estado,
      estado_conciliacion: movimiento.estado_conciliacion,
      match_id: movimiento.match_id,
      documento_uuid: movimiento.documento_uuid,
      asiento_contable_id: movimiento.asiento_contable_id,
    }));

    return NextResponse.json(
      {
        status: 200,
        data,
        message: "Movimientos bancarios obtenidos correctamente.",
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
          data: [],
        },
        { status: error.status }
      );
    }

    console.error("GET /api/cuentasBancarias/movimientos:", error);
    return NextResponse.json(
      {
        status: 500,
        data: [],
        message: "Error interno al obtener movimientos bancarios.",
      },
      { status: 500 }
    );
  }
}
