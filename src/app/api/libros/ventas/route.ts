// src/app/api/libros/ventas/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const empresaIdParam = searchParams.get("empresa_id") ?? "";
    const empresaId = Number(empresaIdParam);

    const fechaParam = searchParams.get("fecha") ?? "";

    const ordenParam = (searchParams.get("orden") ?? "ascendente").toLowerCase();
    const orden: "asc" | "desc" = ordenParam.startsWith("desc") ? "desc" : "asc";

    if (!empresaId || Number.isNaN(empresaId)) {
      return NextResponse.json(
        { status: 400, data: [], message: "Parámetro 'empresa_id' inválido o ausente." },
        { status: 400 }
      );
    }

    if (!fechaParam) {
      return NextResponse.json(
        { status: 400, data: [], message: "Parámetro 'fecha' obligatorio." },
        { status: 400 }
      );
    }

    // Tomamos solo "YYYY-MM" de lo que venga
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
    const monthIndex = Number(match[2]) - 1; // 0 = enero

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

    // Usamos UTC para evitar problemas de huso horario
    const inicioMes = new Date(Date.UTC(year, monthIndex, 1));
    const finMes = new Date(Date.UTC(year, monthIndex + 1, 1));

    const documentos = await prisma.documento.findMany({
      where: {
        empresa_id: empresaId,
        estado: 1,
        tipo_operacion: "venta",
        marca_anulado: "No",
        fecha_trabajo: {
          gte: inicioMes,
          lt: finMes,
        },
      },
      orderBy: {
        // Conta Cox ordena por fecha_emision
        fecha_emision: orden,
      },
    });

    // Log de control
    const fechasEmision = documentos
      .map((d) => d.fecha_emision as Date | null)
      .filter((f): f is Date => !!f);

    const minFechaEmision =
      fechasEmision.length > 0
        ? new Date(Math.min(...fechasEmision.map((f) => f.getTime())))
        : null;

    const maxFechaEmision =
      fechasEmision.length > 0
        ? new Date(Math.max(...fechasEmision.map((f) => f.getTime())))
        : null;

    console.log("[/libros/ventas]", {
      empresaId,
      year,
      monthIndex,
      inicioMes,
      finMes,
      cantidad: documentos.length,
      minFechaEmision,
      maxFechaEmision,
    });

    return NextResponse.json(
      {
        status: 200,
        data: documentos,
        message: "Documentos de ventas obtenidos correctamente.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en /api/libros/ventas:", error);
    return NextResponse.json(
      { status: 500, data: [], message: "Error interno al obtener documentos de ventas." },
      { status: 500 }
    );
  }
}
