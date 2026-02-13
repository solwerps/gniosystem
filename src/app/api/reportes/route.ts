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
    const ventaParam = searchParams.get("venta");

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

    const startDate = new Date(`${year}-${month}-01T00:00:00`);
    let nextY = Number(year);
    let nextM = Number(month);

    if (nextM === 12) {
      nextM = 1;
      nextY++;
    } else {
      nextM++;
    }

    const endDate = new Date(
      `${nextY}-${String(nextM).padStart(2, "0")}-01T00:00:00`
    );

    const tipo_operacion = ventaParam === "true" ? "venta" : "compra";

    const documentos = await prisma.documento.findMany({
      where: {
        empresa_id: auth.empresa.id,
        estado: 1,
        tipo_operacion,
        fecha_trabajo: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        cuentaDebe: { select: { descripcion: true, cuenta: true } },
        cuentaHaber: { select: { descripcion: true, cuenta: true } },
      },
      orderBy: {
        fecha_trabajo: "asc",
      },
    });

    const data = documentos.map(({ cuentaDebe, cuentaHaber, ...doc }) => ({
      ...doc,
      cuenta_debe: cuentaDebe
        ? `${cuentaDebe.descripcion} (${cuentaDebe.cuenta})`
        : doc.cuenta_debe,
      cuenta_haber: cuentaHaber
        ? `${cuentaHaber.descripcion} (${cuentaHaber.cuenta})`
        : doc.cuenta_haber,
    }));

    return NextResponse.json({
      status: 200,
      data,
      message: "Documentos obtenidos correctamente",
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

    console.error("ERROR GET /api/reportes:", error);
    return NextResponse.json({
      status: 400,
      message: error.message || "Error al obtener documentos de reportes",
    });
  }
}
