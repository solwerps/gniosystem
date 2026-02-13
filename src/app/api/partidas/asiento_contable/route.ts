// src/app/api/partidas/asiento_contable/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";
import { assertPeriodOpen } from "@/lib/accounting/periods";

export const revalidate = 0;

// -----------------------------
// helpers
// -----------------------------
function to_error_message(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "SERVER_ERROR";
  }
}

function parse_fecha_trabajo(fecha_trabajo: string): Date {
  const ymd = (fecha_trabajo || "").toString().trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new Error("BAD_FECHA_TRABAJO");
  return new Date(`${ymd}T00:00:00.000Z`);
}


const handle_poliza_desc = (poliza_id: number, correlativo: number) => {
  switch (poliza_id) {
    case 1:
      return "Registro de transacciones diarias.";
    case 2:
      return "Ajustes de cuentas y correcciones.";
    case 3:
      return "Inicio de operaciones de la empresa.";
    case 4:
      return "Cierre de cuentas al final del periodo.";
    case 5:
      return "Registro de sueldos y salarios.";
    case 6:
      return "Registro de compras realizadas.";
    case 7:
      return "Registro de ventas realizadas.";
    case 8:
      return "Movimientos bancarios.";
    case 9:
      return "Registro de cuentas por pagar.";
    default:
      return `${correlativo}`;
  }
};

type partida_input = {
  cuenta_id: number; // NomenclaturaCuenta.id en GNIO
  monto_debe?: number;
  monto_haber?: number;
  referencia?: string | null;
};

type asiento_contable_form = {
  poliza_id: number;         // TipoPoliza.id
  fecha_trabajo: string;     // "YYYY-MM-DD" o ISO
  descripcion?: string | null;
  referencia?: string | null;
  partidas: partida_input[];
};

// POST /api/partidas/asiento_contable?tenant=slug
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as asiento_contable_form & {
      tenant?: string;
      empresa_id?: number;
    };

    const tenantSlug = String(body?.tenant ?? tenantSlugFromRequest(req) ?? "");
    const empresaId = Number(body?.empresa_id ?? empresaIdFromRequest(req));
    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    if (!body?.poliza_id) {
      return NextResponse.json({ status: 400, data: {}, message: "La poliza es requerida" }, { status: 400 });
    }

    if (!body?.fecha_trabajo) {
      return NextResponse.json({ status: 400, data: {}, message: "La fecha de trabajo es requerida" }, { status: 400 });
    }

    if (!body?.partidas || body.partidas.length === 0) {
      return NextResponse.json({ status: 400, data: {}, message: "Las partidas son requeridas" }, { status: 400 });
    }

    const empresa_id = auth.empresa.id;

    // validar empresa + obtener nomenclatura afiliada
    const empresa = await prisma.empresa.findFirst({
      where: { id: empresa_id, tenantId: tenant_id, estado: 1 },
      select: { id: true, afiliaciones: { select: { nomenclaturaId: true } } },
    });

    if (!empresa) {
      return NextResponse.json({ status: 400, data: {}, message: "No existe una empresa válida para este tenant" }, { status: 400 });
    }

    const nomenclatura_id = empresa.afiliaciones?.nomenclaturaId ?? null;
    if (!nomenclatura_id) {
      return NextResponse.json({ status: 400, data: {}, message: "La empresa no tiene nomenclatura afiliada" }, { status: 400 });
    }

    // validar que las cuentas pertenezcan a la nomenclatura de esa empresa (multi-tenant correcto)
    const cuenta_ids = Array.from(
      new Set(
        body.partidas
          .map((p) => Number(p.cuenta_id))
          .filter((n) => !!n && !Number.isNaN(n))
      )
    );

    if (!cuenta_ids.length) {
      return NextResponse.json({ status: 400, data: {}, message: "Las partidas no incluyen cuenta_id válido" }, { status: 400 });
    }

    const cuentas_validas = await prisma.nomenclaturaCuenta.count({
      where: { nomenclaturaId: nomenclatura_id, id: { in: cuenta_ids } },
    });

    if (cuentas_validas !== cuenta_ids.length) {
      return NextResponse.json(
        { status: 400, data: {}, message: "Hay cuentas que no pertenecen a la nomenclatura de esta empresa" },
        { status: 400 }
      );
    }

    const fecha = parse_fecha_trabajo(body.fecha_trabajo);

    await prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, empresa_id, fecha);

      // correlativo = max(correlativo) + 1 dentro de la empresa
      const agg = await tx.asientoContable.aggregate({
        where: { empresa_id },
        _max: { correlativo: true },
      });

      const correlativo = (agg._max.correlativo ?? 0) + 1;

      const descripcion =
        body.descripcion && body.descripcion.trim() !== ""
          ? body.descripcion.trim()
          : handle_poliza_desc(body.poliza_id, correlativo);

      const asiento = await tx.asientoContable.create({
        data: {
          correlativo,
          tipo_poliza_id: body.poliza_id,
          descripcion,
          referencia: body.referencia ?? null,
          fecha,
          empresa_id,
          estado: 1,
        },
        select: { id: true },
      });

      await tx.partida.createMany({
        data: body.partidas.map((p) => ({
          uuid: randomUUID(),
          monto_debe: p.monto_debe ?? 0,
          monto_haber: p.monto_haber ?? 0,
          referencia: p.referencia ?? null,
          cuenta_id: Number(p.cuenta_id),
          empresa_id,
          asiento_contable_id: asiento.id,
        })),
      });
    });

    return NextResponse.json({
      status: 200,
      data: {},
      message: "Asiento contable creado correctamente",
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
