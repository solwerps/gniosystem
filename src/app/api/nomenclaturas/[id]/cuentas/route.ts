///src/app/api/nomenclaturas/[id]/cuentas/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSessionAndTenant } from "../../../_utils/nomenclaturaTenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Resolver ID global (nomenclatura.id) a partir del localId
   ============================================================ */
async function resolveGlobalIdOr404(tenantId: number, localIdParam: string) {
  const localId = Number(localIdParam);

  if (!localId || Number.isNaN(localId)) {
    return { error: NextResponse.json({ ok: false, error: "BAD_ID" }, { status: 400 }) };
  }

  const nom = await prisma.nomenclatura.findUnique({
    where: { tenantId_localId: { tenantId, localId } },
    select: { id: true },
  });

  if (!nom) {
    return { error: NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 }) };
  }

  return { idGlobal: nom.id };
}

/* ============================================================
   GET /api/nomenclaturas/:id/cuentas
   ============================================================ */
export async function GET(req: Request, context: { params: { id: string } }) {
  const { params } = context;

  const auth = await requireSessionAndTenant(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { idGlobal, error } = await resolveGlobalIdOr404(auth.tenant.id, params.id);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const size = Number(searchParams.get("size") ?? 1000); // devuelvo TODO por default para select

  const total = await prisma.nomenclaturaCuenta.count({
    where: { nomenclaturaId: idGlobal },
  });

  const items = await prisma.nomenclaturaCuenta.findMany({
    where: { nomenclaturaId: idGlobal },
    orderBy: [
      { orden: "asc" },
      { id: "asc" }
    ],
    skip: (page - 1) * size,
    take: size,
  });

  return NextResponse.json({ ok: true, items, page, size, total });
}

/* ============================================================
   POST /api/nomenclaturas/:id/cuentas
   ============================================================ */
export async function POST(req: Request, context: { params: { id: string } }) {
  const { params } = context;

  const auth = await requireSessionAndTenant(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { idGlobal, error } = await resolveGlobalIdOr404(auth.tenant.id, params.id);
  if (error) return error;

  const data = await req.json();

  // Naturaleza por defecto
  if (!data.naturaleza) {
    const top = await prisma.nomenclaturaCuenta.findFirst({
      where: { nomenclaturaId: idGlobal },
      orderBy: { orden: "desc" },
    });

    data.naturaleza = top?.naturaleza ?? "ACTIVO";
  }

  // Orden secuencial
  const ordenMax = await prisma.nomenclaturaCuenta.aggregate({
    where: { nomenclaturaId: idGlobal },
    _max: { orden: true },
  });

  data.orden = (ordenMax._max.orden ?? 0) + 1;

  const created = await prisma.nomenclaturaCuenta.create({
    data: { ...data, nomenclaturaId: idGlobal },
  });

  return NextResponse.json({ ok: true, item: created }, { status: 201 });
}

/* ============================================================
   PUT /api/nomenclaturas/:id/cuentas
   ============================================================ */
export async function PUT(req: Request) {
  const auth = await requireSessionAndTenant(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const { idFila, ...upd } = body;

  const row = await prisma.nomenclaturaCuenta.findUnique({
    where: { id: Number(idFila) },
    include: { nomenclatura: { select: { tenantId: true } } },
  });

  if (!row) {
    return NextResponse.json({ ok: false, error: "ROW_NOT_FOUND" }, { status: 404 });
  }

  if (row.nomenclatura.tenantId !== auth.tenant.id) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  // Respeto de bloqueos
  if (row.lockCuenta) delete upd.cuenta;
  if (row.lockDescripcion) delete upd.descripcion;
  if (row.lockDebeHaber) delete upd.debeHaber;
  if (row.lockPrincipalDetalle) delete upd.principalDetalle;
  if (row.lockNivel) delete upd.nivel;
  if (row.lockTipo) delete upd.tipo;
  if (row.lockNaturaleza) delete upd.naturaleza;

  const updated = await prisma.nomenclaturaCuenta.update({
    where: { id: Number(idFila) },
    data: upd,
  });

  return NextResponse.json({ ok: true, item: updated });
}

/* ============================================================
   DELETE /api/nomenclaturas/:id/cuentas
   ============================================================ */
export async function DELETE(req: Request) {
  const auth = await requireSessionAndTenant(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = await req.json();

  const fila = await prisma.nomenclaturaCuenta.findUnique({
    where: { id: Number(body.idFila) },
    include: { nomenclatura: { select: { tenantId: true } } },
  });

  if (!fila) {
    return NextResponse.json({ ok: false, error: "ROW_NOT_FOUND" }, { status: 404 });
  }

  if (fila.nomenclatura.tenantId !== auth.tenant.id) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  if (fila.isPlantilla) {
    return NextResponse.json(
      { ok: false, error: "NO_DELETE_PLANTILLA_ROW" },
      { status: 403 }
    );
  }

  await prisma.nomenclaturaCuenta.delete({
    where: { id: Number(body.idFila) },
  });

  return NextResponse.json({ ok: true });
}
