import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";

const toInt = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isNaN(n) ? 0 : Math.trunc(n);
};

function parseYearMonth(yearRaw: unknown, monthRaw: unknown) {
  const year = toInt(yearRaw);
  const month = toInt(monthRaw);

  if (year < 2000 || year > 2200) {
    throw new AccountingError("BAD_YEAR", 400, "Año inválido.");
  }
  if (month < 1 || month > 12) {
    throw new AccountingError("BAD_MONTH", 400, "Mes inválido.");
  }

  return { year, month };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = tenantSlugFromRequest(req);
    const empresaId = empresaIdFromRequest(req);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    if (year && month) {
      const ym = parseYearMonth(year, month);
      const cierre = await prisma.cierreMensual.findUnique({
        where: {
          ux_cierres_empresa_year_month: {
            empresa_id: auth.empresa.id,
            year: ym.year,
            month: ym.month,
          },
        },
      });

      return NextResponse.json({
        status: 200,
        message: "Estado del cierre obtenido.",
        data: cierre ?? {
          empresa_id: auth.empresa.id,
          year: ym.year,
          month: ym.month,
          is_closed: false,
          closed_at: null,
          closed_by: null,
        },
      });
    }

    const yearFilter = toInt(searchParams.get("year")) || new Date().getUTCFullYear();
    const rows = await prisma.cierreMensual.findMany({
      where: {
        empresa_id: auth.empresa.id,
        year: yearFilter,
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    return NextResponse.json({
      status: 200,
      message: "Cierres obtenidos correctamente.",
      data: rows,
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

    console.error("GET /api/contabilidad/cierres", error);
    return NextResponse.json(
      {
        status: 500,
        message: "Error interno al obtener cierres.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const tenantSlug = String(body?.tenant ?? tenantSlugFromRequest(req) ?? "");
    const empresaId = body?.empresa_id ?? empresaIdFromRequest(req);
    const action = String(body?.action ?? "close").toLowerCase();

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    if (!["close", "open"].includes(action)) {
      throw new AccountingError(
        "BAD_ACTION",
        400,
        "action debe ser 'close' o 'open'."
      );
    }

    const ym = parseYearMonth(body?.year, body?.month);
    const close = action === "close";

    const cierre = await prisma.$transaction(async (tx) => {
      const row = await tx.cierreMensual.upsert({
        where: {
          ux_cierres_empresa_year_month: {
            empresa_id: auth.empresa.id,
            year: ym.year,
            month: ym.month,
          },
        },
        update: {
          is_closed: close,
          closed_at: close ? new Date() : null,
          closed_by: close ? auth.session.user.id : null,
        },
        create: {
          empresa_id: auth.empresa.id,
          year: ym.year,
          month: ym.month,
          is_closed: close,
          closed_at: close ? new Date() : null,
          closed_by: close ? auth.session.user.id : null,
        },
      });

      await tx.bitacora.create({
        data: {
          usuario_id: auth.session.user.id,
          tipo_accion: close ? "CLOSE_PERIOD" : "OPEN_PERIOD",
          descripcion_accion: close
            ? `Cierre mensual ${ym.year}-${String(ym.month).padStart(2, "0")}`
            : `Reapertura mensual ${ym.year}-${String(ym.month).padStart(2, "0")}`,
          tabla_afectada: "cierres_mensuales",
          registro_afectado_id: row.id,
          detalles_modificacion: JSON.stringify({
            empresa_id: auth.empresa.id,
            year: ym.year,
            month: ym.month,
            is_closed: close,
          }),
        },
      });

      return row;
    });

    return NextResponse.json({
      status: 200,
      message: close ? "Mes cerrado correctamente." : "Mes reabierto correctamente.",
      data: cierre,
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

    console.error("POST /api/contabilidad/cierres", error);
    return NextResponse.json(
      {
        status: 500,
        message: "Error interno al actualizar cierre.",
      },
      { status: 500 }
    );
  }
}
