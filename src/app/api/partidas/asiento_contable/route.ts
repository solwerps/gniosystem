// src/app/api/partidas/asiento_contable/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

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

function get_cookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") || "";
  const parts = cookie.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(name + "=")) return decodeURIComponent(part.slice(name.length + 1));
  }
  return null;
}

async function resolve_tenant_id(req: Request): Promise<{ tenant_id: number; tenant_slug: string }> {
  const { searchParams } = new URL(req.url);
  const tenant_slug = searchParams.get("tenant") || "";

  if (!tenant_slug) throw new Error("TENANT_REQUIRED");

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenant_slug },
    select: { id: true },
  });

  if (!tenant) throw new Error("TENANT_NOT_FOUND");

  return { tenant_id: tenant.id, tenant_slug };
}

async function resolve_empresa_id(req: Request, tenant_id: number): Promise<number> {
  const header_empresa = req.headers.get("x-empresa-id");
  const header_empresa_id = Number(header_empresa || 0);

  if (header_empresa_id && !Number.isNaN(header_empresa_id)) {
    const empresa = await prisma.empresa.findFirst({
      where: { id: header_empresa_id, tenantId: tenant_id, estado: 1 },
      select: { id: true },
    });
    if (!empresa) throw new Error("EMPRESA_NOT_FOUND_FOR_TENANT");
    return empresa.id;
  }

  const cookie_empresa = get_cookie(req, "empresa_id");
  const cookie_empresa_id = Number(cookie_empresa || 0);

  if (cookie_empresa_id && !Number.isNaN(cookie_empresa_id)) {
    const empresa = await prisma.empresa.findFirst({
      where: { id: cookie_empresa_id, tenantId: tenant_id, estado: 1 },
      select: { id: true },
    });
    if (!empresa) throw new Error("EMPRESA_NOT_FOUND_FOR_TENANT");
    return empresa.id;
  }

  const empresas = await prisma.empresa.findMany({
    where: { tenantId: tenant_id, estado: 1 },
    select: { id: true },
    orderBy: { id: "asc" },
    take: 2,
  });

  if (empresas.length === 1) return empresas[0].id;
  if (empresas.length === 0) throw new Error("NO_ACTIVE_EMPRESA_IN_TENANT");
  throw new Error("EMPRESA_CONTEXT_REQUIRED");
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
    const body = (await req.json().catch(() => ({}))) as asiento_contable_form;

    if (!body?.poliza_id) {
      return NextResponse.json({ status: 400, data: {}, message: "La poliza es requerida" }, { status: 400 });
    }

    if (!body?.fecha_trabajo) {
      return NextResponse.json({ status: 400, data: {}, message: "La fecha de trabajo es requerida" }, { status: 400 });
    }

    if (!body?.partidas || body.partidas.length === 0) {
      return NextResponse.json({ status: 400, data: {}, message: "Las partidas son requeridas" }, { status: 400 });
    }

    const { tenant_id } = await resolve_tenant_id(req);
    const empresa_id = await resolve_empresa_id(req, tenant_id);

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
    console.log(err);
    return NextResponse.json(
      { status: 400, data: {}, message: to_error_message(err) },
      { status: 400 }
    );
  }
}
