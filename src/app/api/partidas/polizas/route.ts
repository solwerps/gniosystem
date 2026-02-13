// src/app/api/partidas/polizas/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";

export const revalidate = 0;

function to_error_message(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "SERVER_ERROR";
  }
}

// GET /api/partidas/polizas?select=true
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const select = (searchParams.get("select") || "") === "true";
    const tenantSlug = tenantSlugFromRequest(req);
    const empresaId = empresaIdFromRequest(req);

    await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    const polizas = await prisma.tipoPoliza.findMany({
      where: { estado: 1 },
      orderBy: { id: "asc" },
      select: { id: true, nombre: true },
    });

    const data = select
      ? polizas.map((p) => ({ value: p.id, label: p.nombre }))
      : polizas.map((p) => ({ id: p.id, nombre: p.nombre }));

    return NextResponse.json({
      status: 200,
      data,
      message: "Tipos de Polizas obtenidos correctamente",
    });
  } catch (err) {
    if (err instanceof AccountingError) {
      return NextResponse.json(
        {
          status: err.status,
          code: err.code,
          data: {},
          message: err.message,
        },
        { status: err.status }
      );
    }

    console.log(err);
    return NextResponse.json(
      { status: 400, data: {}, message: to_error_message(err) },
      { status: 400 }
    );
  }
}
