// src/app/api/libros/compras/route.ts
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

    // Usamos UTC para evitar que el huso horario mueva el día
    const inicioMes = new Date(Date.UTC(year, monthIndex, 1));      // 2025-01-01 00:00:00Z
    const finMes = new Date(Date.UTC(year, monthIndex + 1, 1));     // 2025-02-01 00:00:00Z

    const documentos = await prisma.documento.findMany({
      where: {
        empresa_id: empresaId,
        estado: 1,
        tipo_operacion: "compra",
        fecha_trabajo: {
          gte: inicioMes,
          lt: finMes,
        },
      },
      orderBy: {
        fecha_trabajo: orden,
      },
    });

    // Log de control para ver si se cuela otro mes
    const fechas = documentos.map((d) => d.fecha_trabajo as Date);
    const minFecha =
      fechas.length > 0 ? new Date(Math.min(...fechas.map((f) => f.getTime()))) : null;
    const maxFecha =
      fechas.length > 0 ? new Date(Math.max(...fechas.map((f) => f.getTime()))) : null;

    console.log("[V1 /libros/compras]", {
      empresaId,
      year,
      monthIndex,
      inicioMes,
      finMes,
      cantidad: documentos.length,
      minFecha,
      maxFecha,
    });

    return NextResponse.json(
      {
        status: 200,
        data: documentos,
        message: "Documentos de compras obtenidos correctamente (V1).",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en V1 /api/libros/compras:", error);
    return NextResponse.json(
      { status: 500, data: [], message: "Error interno al obtener documentos de compras." },
      { status: 500 }
    );
  }
}