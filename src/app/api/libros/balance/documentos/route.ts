// src/app/api/libros/balance/documentos/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const parseDateParam = (value: string | null) => {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = match[3] ? Number(match[3]) : 1;

  if (
    Number.isNaN(year) ||
    Number.isNaN(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    (match[3] && (Number.isNaN(day) || day < 1 || day > 31))
  ) {
    return null;
  }

  return {
    date: new Date(Date.UTC(year, monthIndex, day)),
    hasDay: Boolean(match[3]),
    year,
    monthIndex,
    day,
  };
};

const buildEndExclusive = (parsed: NonNullable<ReturnType<typeof parseDateParam>>) => {
  if (parsed.hasDay) {
    return new Date(Date.UTC(parsed.year, parsed.monthIndex, parsed.day + 1));
  }
  return new Date(Date.UTC(parsed.year, parsed.monthIndex + 1, 1));
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const empresaIdParam = searchParams.get("empresa_id") ?? "";
    const empresaId = Number(empresaIdParam);

    if (!empresaId || Number.isNaN(empresaId)) {
      return NextResponse.json(
        {
          status: 400,
          data: [],
          message: "Parámetro 'empresa_id' inválido o ausente.",
        },
        { status: 400 }
      );
    }

    const date1Param = searchParams.get("date1");
    const date2Param = searchParams.get("date2");

    const startParsed = parseDateParam(date1Param);
    const endParsed = parseDateParam(date2Param);

    if (date1Param && !startParsed) {
      return NextResponse.json(
        {
          status: 400,
          data: [],
          message:
            "Parámetro 'date1' inválido. Esperado 'YYYY-MM' o 'YYYY-MM-DD'.",
        },
        { status: 400 }
      );
    }

    if (date2Param && !endParsed) {
      return NextResponse.json(
        {
          status: 400,
          data: [],
          message:
            "Parámetro 'date2' inválido. Esperado 'YYYY-MM' o 'YYYY-MM-DD'.",
        },
        { status: 400 }
      );
    }

    let startDate: Date | null = startParsed?.date ?? null;
    let endDateExclusive: Date | null = null;

    if (endParsed) {
      endDateExclusive = buildEndExclusive(endParsed);
    } else if (startParsed) {
      const end = new Date();
      end.setUTCHours(0, 0, 0, 0);
      end.setUTCDate(end.getUTCDate() + 1);
      endDateExclusive = end;
    }

    const where: any = {
      empresa_id: empresaId,
      estado: 1,
      marca_anulado: "No",
    };

    if (startDate && endDateExclusive) {
      where.fecha_trabajo = { gte: startDate, lt: endDateExclusive };
    } else if (startDate) {
      where.fecha_trabajo = { gte: startDate };
    } else if (endDateExclusive) {
      where.fecha_trabajo = { lt: endDateExclusive };
    }

    const documentos = await prisma.documento.findMany({
      where,
      select: {
        fecha_trabajo: true,
        tipo_operacion: true,
        tipo_dte: true,
      },
    });

    const data = documentos.map((doc) => ({
      fecha_trabajo: doc.fecha_trabajo,
      tipo_operacion: doc.tipo_operacion,
      tipo_dte: doc.tipo_dte,
    }));

    console.log("[/api/libros/balance/documentos]", {
      empresaId,
      date1Param,
      date2Param,
      startDate,
      endDateExclusive,
      cantidad: data.length,
    });

    return NextResponse.json(
      {
        status: 200,
        data,
        message: "Documentos de balance obtenidos correctamente.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en /api/libros/balance/documentos:", error);
    return NextResponse.json(
      {
        status: 500,
        data: [],
        message: "Error interno al obtener documentos de balance.",
      },
      { status: 500 }
    );
  }
}
