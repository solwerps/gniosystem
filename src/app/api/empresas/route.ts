import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireTenantMembership(tenantSlug?: string | null) {
  if (!tenantSlug) {
    return {
      ok: false as const,
      status: 400,
      message: "Debe enviar tenant.",
    };
  }

  const session = await getSession();
  if (!session?.user?.id) {
    return {
      ok: false as const,
      status: 401,
      message: "Debes iniciar sesión.",
    };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });

  if (!tenant) {
    return {
      ok: false as const,
      status: 404,
      message: "Tenant no encontrado.",
    };
  }

  if (session.user.role !== "ADMIN") {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: session.user.id,
          tenantId: tenant.id,
        },
      },
      select: { userId: true },
    });

    if (!membership) {
      return {
        ok: false as const,
        status: 403,
        message: "No tienes membresía para este tenant.",
      };
    }
  }

  return { ok: true as const, tenant };
}

export const revalidate = 0;

// Helper: dd/mm/aaaa → Date | null
function parseDMY(d?: string | null): Date | null {
  if (!d) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d.trim());
  if (!m) return null;
  const dd = Number(m[1]),
    mm = Number(m[2]) - 1,
    yyyy = Number(m[3]);
  const dt = new Date(yyyy, mm, dd);
  if (
    dt.getFullYear() !== yyyy ||
    dt.getMonth() !== mm ||
    dt.getDate() !== dd
  )
    return null;
  return dt;
}

/* ============================================================
   GET: Lista simple de empresas para el contador
   ============================================================ */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantSlug = searchParams.get("tenant") || undefined;

  const access = await requireTenantMembership(tenantSlug);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.message },
      { status: access.status }
    );
  }

  const empresas = await prisma.empresa.findMany({
    where: { tenantId: access.tenant.id },
    orderBy: { id: "desc" },
    select: {
      id: true,
      nombre: true,
      nit: true,
      sectorEconomico: true,
      infoIndividual: true,
      infoJuridico: true,
    },
  });

  return NextResponse.json({
    ok: true,
    data: empresas,
  });
}

/* ============================================================
   POST: Crear empresa + afiliaciones + obligaciones
   ============================================================ */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantFromQuery = searchParams.get("tenant");

    const body = await req.json();

    const {
      tenant: tenantFromBody,
      nombre,
      nit,
      sectorEconomico,
      razonSocial,
      avatarUrl,
      info,
      afiliaciones,
    } = body || {};

    const tenantSlug = tenantFromQuery || tenantFromBody;

    if (!tenantSlug || !nombre || !nit || !sectorEconomico || !razonSocial) {
      return NextResponse.json(
        { ok: false, error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    const access = await requireTenantMembership(tenantSlug);
    if (!access.ok) {
      return NextResponse.json(
        { ok: false, error: access.message },
        { status: access.status }
      );
    }

    const patchEmpresa: any = {
      tenantId: access.tenant.id,
      tenantSlug,
      nombre,
      nit,
      sectorEconomico,
      razonSocial,
      avatarUrl: avatarUrl ?? null,
    };

    if (info?.tipo === "Individual") {
      patchEmpresa.infoIndividual = info;
      patchEmpresa.infoJuridico = null;
    } else if (info?.tipo === "Juridico") {
      patchEmpresa.infoJuridico = info;
      patchEmpresa.infoIndividual = null;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear Empresa
      const empresa = await tx.empresa.create({
        data: patchEmpresa,
        select: { id: true },
      });

      // 2. Resolver nomenclaturaId
      let nomenclaturaId: number | null = null;

      if (afiliaciones?.nomenclaturaId) {
        const raw = Number(afiliaciones.nomenclaturaId);

        const found = await tx.nomenclatura.findUnique({
          where: { id: raw },
          select: { id: true },
        });

        if (found) {
          nomenclaturaId = found.id;
        }
      }

      // 3. Crear afiliaciones
      const afili = await tx.afiliaciones.create({
        data: {
          empresa: { connect: { id: empresa.id } },
          regimenIvaId: afiliaciones?.regimenIvaId ?? null,
          regimenIsrId: afiliaciones?.regimenIsrId ?? null,
          nomenclaturaId,
          accountingMode:
            afiliaciones?.accountingMode === "CAJA" ? "CAJA" : "DEVENGO",
          obligaciones: afiliaciones?.obligaciones?.length
            ? {
                createMany: {
                  data: afiliaciones.obligaciones.map((o: any) => ({
                    impuesto: String(o.impuesto || "Otro"),
                    codigoFormulario: o.codigoFormulario || null,
                    fechaPresentacion: o.fechaPresentacion
                      ? parseDMY(o.fechaPresentacion)
                      : null,
                    nombreObligacion: o.nombreObligacion || null,
                  })),
                },
              }
            : undefined,
        },
        select: { id: true },
      });

      // 4. Actualizar empresa con afiliacionesId
      await tx.empresa.update({
        where: { id: empresa.id },
        data: { afiliacionesId: afili.id },
      });

      return { empresaId: empresa.id, afiliacionesId: afili.id };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("POST /api/empresas", err);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
