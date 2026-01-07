// src/app/api/libros/mayor/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const empresaIdParam = searchParams.get("empresa_id") ?? "0";
    const empresaId = Number(empresaIdParam);

    const fechaParam = searchParams.get("fecha") ?? "";
    const ordenParam = (searchParams.get("orden") ?? "ascendente").toLowerCase();
    const orden: "ASC" | "DESC" = ordenParam.startsWith("desc") ? "DESC" : "ASC";

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

    if (!fechaParam) {
      return NextResponse.json(
        {
          status: 400,
          data: [],
          message: "Parámetro 'fecha' obligatorio.",
        },
        { status: 400 }
      );
    }

    // Tomamos "YYYY-MM" de lo que venga
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
    const month = Number(match[2]); // 1..12

    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          status: 400,
          data: [],
          message: "Parámetro 'fecha' inválido.",
        },
        { status: 400 }
      );
    }

    // Igual lógica que Conta Cox: [inicioMes, inicioMesMesSiguiente)
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    // SQL crudo: partidas + cuenta + asiento (mismos filtros que Conta Cox)
    const rows: any[] = await prisma.$queryRawUnsafe(
      `
      SELECT
        p.uuid,
        p.monto_debe,
        p.monto_haber,
        p.cuenta_id,
        ac.empresa_id AS empresa_id,
        p.asiento_contable_id,
        p.referencia,
        c.cuenta AS cuenta,
        c.descripcion AS cuenta_descripcion,
        c.naturaleza AS cuenta_naturaleza,
        ac.fecha,
        ac.correlativo,
        ac.descripcion AS asiento_descripcion,
        ac.tipo_poliza_id
      FROM partidas p
      JOIN asientos_contables ac ON ac.id = p.asiento_contable_id
      LEFT JOIN NomenclaturaCuenta c ON c.id = p.cuenta_id
      WHERE
        ac.empresa_id = ?
        AND ac.estado = 1
        AND ac.fecha >= ?
        AND ac.fecha < ?
      ORDER BY ac.fecha ${orden}, ac.correlativo ${orden}, p.cuenta_id ASC
      `,
      empresaId,
      startDate,
      endDate
    );

    const data = rows.map((row) => {
      const debe = Number(row.monto_debe);
      const haber = Number(row.monto_haber);

      return {
        uuid: row.uuid,
        cuenta_id: row.cuenta_id,
        cuenta: row.cuenta ?? null,
        descripcion: row.cuenta_descripcion ?? null,
        naturaleza: row.cuenta_naturaleza ?? null,
        monto_debe: Number.isNaN(debe) ? 0 : debe,
        monto_haber: Number.isNaN(haber) ? 0 : haber,
        empresa_id: row.empresa_id,
        asiento_contable_id: row.asiento_contable_id,
        referencia: row.referencia ?? null,
        fecha: row.fecha ?? null,
        correlativo: row.correlativo ?? null,
        asiento_descripcion: row.asiento_descripcion ?? null,
        tipo_poliza_id: row.tipo_poliza_id ?? null,
      };
    });

    console.log("[/api/libros/mayor]", {
      empresaId,
      fechaParam,
      startDate,
      endDate,
      orden,
      cantidad: data.length,
    });

    return NextResponse.json(
      {
        status: 200,
        data,
        message: "Libro mayor obtenido correctamente.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en /api/libros/mayor:", error);
    return NextResponse.json(
      {
        status: 500,
        data: [],
        message: "Error interno al obtener libro mayor.",
      },
      { status: 500 }
    );
  }
}
