// src/app/api/libros/diario/asientos/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const empresaIdParam = searchParams.get("empresa_id") ?? "";
    const empresaId = Number(empresaIdParam);

    const fechaParam = searchParams.get("fecha") ?? "";

    // Opcional: permitir orden asc/desc (aunque en Conta Cox no lo usabas)
    const ordenParam = (searchParams.get("orden") ?? "ascendente").toLowerCase();
    const orden: "asc" | "desc" = ordenParam.startsWith("desc") ? "desc" : "asc";

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

    // Tomamos solo "YYYY-MM" de lo que venga (igual patrón que en compras)
    const match = fechaParam.match(/^(\d{4})-(\d{2})/);
    if (!match) {
      return NextResponse.json(
        {
          status: 400,
          data: [],
          message:
            "Parámetro 'fecha' inválido. Esperado 'YYYY-MM' o 'YYYY-MM-DD'.",
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
        {
          status: 400,
          data: [],
          message: "Parámetro 'fecha' inválido.",
        },
        { status: 400 }
      );
    }

    // Mismo criterio de rango que Conta Cox:
    // [primer día del mes, primer día del mes siguiente)
    // Usamos UTC para evitar problemas de huso horario.
    const inicioMes = new Date(Date.UTC(year, monthIndex, 1));
    const finMes = new Date(Date.UTC(year, monthIndex + 1, 1));

    const asientos = await prisma.asientoContable.findMany({
      where: {
        empresa_id: empresaId,
        estado: 1,
        fecha: {
          gte: inicioMes,
          lt: finMes,
        },
      },
      orderBy: [
        { fecha: orden },
        { correlativo: orden },
        { id: orden },
      ],
      include: {
        tipo_poliza: { select: { nombre: true } },
        partidas: {
          orderBy: { uuid: "asc" },
          include: {
            cuenta: { select: { cuenta: true, descripcion: true } },
          },
        },
      },
    });

    const referencias = Array.from(
      new Set(
        asientos
          .map((a) => a.referencia)
          .filter((ref): ref is string => typeof ref === "string" && ref.trim() !== "")
      )
    );

    const documentos = referencias.length
      ? await prisma.documento.findMany({
          where: { identificador_unico: { in: referencias } },
          select: {
            identificador_unico: true,
            cuenta_debe: true,
            cuentaDebe: { select: { cuenta: true, descripcion: true } },
          },
        })
      : [];

    const documentosByRef = new Map(
      documentos.map((doc) => [doc.identificador_unico, doc])
    );

    const data = asientos.map((asiento) => {
      const partidas = (asiento.partidas ?? []).map((p) => {
        const montoDebe = Number(p.monto_debe);
        const montoHaber = Number(p.monto_haber);

        return {
          uuid: p.uuid,
          monto_debe: Number.isNaN(montoDebe) ? 0 : montoDebe,
          monto_haber: Number.isNaN(montoHaber) ? 0 : montoHaber,
          cuenta_id: p.cuenta_id,
          empresa_id: p.empresa_id,
          asiento_contable_id: p.asiento_contable_id,
          descripcion: p.cuenta?.descripcion ?? null,
          cuenta: p.cuenta?.cuenta ?? null,
        };
      });

      const totalDebe = partidas.reduce((sum, p) => sum + (p.monto_debe ?? 0), 0);
      const totalHaber = partidas.reduce((sum, p) => sum + (p.monto_haber ?? 0), 0);

      if (totalDebe === 0 && totalHaber > 0 && asiento.referencia) {
        const doc = documentosByRef.get(asiento.referencia);
        if (doc?.cuenta_debe) {
          partidas.unshift({
            uuid: `synthetic-${asiento.id}`,
            monto_debe: totalHaber,
            monto_haber: 0,
            cuenta_id: doc.cuenta_debe,
            empresa_id: asiento.empresa_id,
            asiento_contable_id: asiento.id,
            descripcion: doc.cuentaDebe?.descripcion ?? null,
            cuenta: doc.cuentaDebe?.cuenta ?? null,
          });
        }
      }

      return {
        asiento_id: asiento.id,
        fecha: asiento.fecha,
        empresa_id: asiento.empresa_id,
        descripcion: asiento.descripcion,
        referencia: asiento.referencia,
        correlativo: asiento.correlativo,
        poliza_nombre: asiento.tipo_poliza?.nombre ?? null,
        partidas,
      };
    });

    // Log de control
    const fechas = data.map((a) => a.fecha as Date);
    const minFecha =
      fechas.length > 0 ? new Date(Math.min(...fechas.map((f) => f.getTime()))) : null;
    const maxFecha =
      fechas.length > 0 ? new Date(Math.max(...fechas.map((f) => f.getTime()))) : null;

    console.log("[/api/libros/diario/asientos GNIO]", {
      empresaId,
      year,
      monthIndex,
      inicioMes,
      finMes,
      orden,
      cantidad: data.length,
      minFecha,
      maxFecha,
    });

    return NextResponse.json(
      {
        status: 200,
        data,
        message: "Asientos contables obtenidos correctamente.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error en /api/libros/diario/asientos GNIO:", error);
    return NextResponse.json(
      {
        status: 500,
        data: [],
        message: "Error interno al obtener asientos contables.",
      },
      { status: 500 }
    );
  }
}
