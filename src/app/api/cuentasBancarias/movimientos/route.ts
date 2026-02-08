import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

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
    }));

    return NextResponse.json(
      {
        status: 200,
        data,
        message: "Movimientos bancarios obtenidos correctamente.",
      },
      { status: 200 }
    );
  } catch (error) {
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
