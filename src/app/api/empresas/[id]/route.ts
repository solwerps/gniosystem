// /src/app/api/empresas/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
} from "@/lib/accounting/context";

// ====================================================================
// CONSTANTS
// ====================================================================

export const revalidate = 0;

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

const isSchemaMismatchError = (err: any) => {
  const code = err?.code;
  if (code === "P2021" || code === "P2022") return true;
  const message = String(err?.message ?? "");
  return (
    /Unknown column/i.test(message) ||
    /column .* does not exist/i.test(message) ||
    /Unknown table/i.test(message) ||
    /doesn't exist/i.test(message)
  );
};

/**
 * Helper: dd/mm/aaaa -> Date | null
 * Parsea una cadena de fecha en formato día/mes/año a un objeto Date.
 */
function parseDMY(d?: string | Date | null): Date | null {
  if (!d) return null;
  if (d instanceof Date) {
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  const s = d.toString().trim();
  if (!s) return null;

  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]) - 1; // Meses son 0-indexados en JS Date
  const yyyy = Number(m[3]);

  const dt = new Date(yyyy, mm, dd);

  // Validación estricta para prevenir fechas inválidas (ej: 32/12/2023)
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm || dt.getDate() !== dd) {
    return null;
  }

  return dt;
}

function normalizeAccountingMode(value: unknown): "CAJA" | "DEVENGO" | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const mode = String(value).trim().toUpperCase();
  if (mode === "CAJA" || mode === "DEVENGO") return mode;
  return undefined;
}

// ====================================================================
// API HANDLERS
// ====================================================================

// GET /api/empresas/:id?tenant=slug
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const empresaId = Number(id);

    if (!empresaId || Number.isNaN(empresaId)) {
      return NextResponse.json({ ok: false, error: "BAD_ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const compact =
      searchParams.get("compact") === "1" ||
      searchParams.get("compact") === "true";

    const tenantSlug = tenantSlugFromRequest(req) || undefined;

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    if (compact) {
      return NextResponse.json({
        ok: true,
        data: {
          id: auth.empresa.id,
          tenant: auth.tenant.slug,
          nombre: auth.empresa.nombre,
          nit: auth.empresa.nit,
        },
      });
    }

    let e: any = null;

    try {
      e = await prisma.empresa.findFirst({
        where: {
          id: auth.empresa.id,
        },
        include: {
          afiliaciones: {
            include: {
              obligaciones: true,
            },
          },
          gestiones: {
            include: {
              folios: true,
            },
          },
          cuentasBancarias: {
            include: {
              cuentaContable: true,
            },
          },
        },
      });
    } catch (err) {
      if (isSchemaMismatchError(err)) {
        return NextResponse.json({
          ok: true,
          data: {
            id: auth.empresa.id,
            tenant: auth.tenant.slug,
            nombre: auth.empresa.nombre,
            nit: auth.empresa.nit,
            sectorEconomico: "",
            razonSocial: "Individual",
            avatarUrl: null,
            infoIndividual: undefined,
            infoJuridico: undefined,
            afiliaciones: {
              regimenIvaId: undefined,
              regimenIsrId: undefined,
              nomenclaturaId: undefined,
              accountingMode: "DEVENGO",
              obligaciones: [],
            },
            gestiones: { folios: [], correlativos: [] },
            cuentasBancarias: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }
      throw err;
    }

    if (!e) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Mapeo de la respuesta para el cliente
    const data = {
      id: e.id,
      tenant: e.tenantSlug ?? auth.tenant.slug, // 👈 fallback si el campo no existe
      nombre: e.nombre,
      nit: e.nit,
      sectorEconomico: e.sectorEconomico,
      razonSocial: e.razonSocial,
      avatarUrl: e.avatarUrl,
      infoIndividual: e.infoIndividual ?? undefined,
      infoJuridico: e.infoJuridico ?? undefined,

      afiliaciones: e.afiliaciones
        ? {
            regimenIvaId: e.afiliaciones.regimenIvaId ?? undefined,
            regimenIsrId: e.afiliaciones.regimenIsrId ?? undefined,
            nomenclaturaId: e.afiliaciones.nomenclaturaId ?? undefined,
            accountingMode: e.afiliaciones.accountingMode,
            obligaciones: (e.afiliaciones.obligaciones || []).map((o) => ({
              id: String(o.id),
              impuesto: o.impuesto || "Otro",
              codigoFormulario: o.codigoFormulario || "",
              fechaPresentacion: o.fechaPresentacion
                ? o.fechaPresentacion.toISOString().slice(0, 10)
                : "",
              nombreObligacion: o.nombreObligacion || "",
            })),
          }
        : {
            regimenIvaId: undefined,
            regimenIsrId: undefined,
            nomenclaturaId: undefined,
            accountingMode: "DEVENGO",
            obligaciones: [],
          },

      gestiones: e.gestiones
        ? {
            folios: (e.gestiones.folios || []).map((f) => ({
              id: f.id,
              libro: f.libro,
              disponibles: Number(f.disponibles ?? 0),
              usados: Number(f.usados ?? 0),
              ultimaFecha: f.ultimaFecha
                ? f.ultimaFecha.toISOString().slice(0, 10)
                : null,
            })),
            correlativos: e.gestiones.correlativos ?? [],
          }
        : { folios: [], correlativos: [] },

      cuentasBancarias: (e.cuentasBancarias || []).map((c) => ({
        id: c.id,
        numero: c.numero,
        banco: c.banco,
        descripcion: c.descripcion ?? "",
        moneda: c.moneda,
        saldoInicial: Number(c.saldoInicial),
        cuentaContableId: c.cuentaContableId ?? undefined,
      })),

      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    if (err instanceof AccountingError) {
      return NextResponse.json(
        { ok: false, error: err.code, message: err.message },
        { status: err.status }
      );
    }

    console.error("GET empresa error:", err);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

// PUT /api/empresas/:id?tenant=slug
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const empresaId = Number(id);

    if (!empresaId || Number.isNaN(empresaId)) {
      return NextResponse.json(
        { ok: false, error: "BAD_ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tenantFromQuery = searchParams.get("tenant") || tenantSlugFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const {
      tenant: tenantFromBody,
      nombre,
      nit,
      sectorEconomico,
      razonSocial,
      avatarUrl,
      info,
      afiliaciones,
      gestiones,
      cuentasBancarias,
    } = body || {};

    const tenantSlug = tenantFromQuery || tenantFromBody;

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    // Validación básica de campos requeridos
    if (!nombre || !nit || !sectorEconomico || !razonSocial) {
      return NextResponse.json(
        { ok: false, error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // Verificar si la empresa existe
    const exists = await prisma.empresa.findFirst({
      where: {
        id: empresaId,
        ...(tenantSlug ? { tenantSlug } : {}),
      },
      include: {
        afiliaciones: { include: { obligaciones: true } },
        gestiones: { include: { folios: true } },
        cuentasBancarias: true,
      },
    });

    if (!exists) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Datos base para la actualización de Empresa
    const patchEmpresa: any = {
      tenantSlug: auth.tenant.slug,
      nombre,
      nit,
      sectorEconomico,
      razonSocial,
      avatarUrl: avatarUrl ?? exists.avatarUrl,
    };

    // Manejo de info (Individual/Juridico)
    if (info?.tipo === "Individual") {
      patchEmpresa.infoIndividual = info;
      patchEmpresa.infoJuridico = null;
    } else if (info?.tipo === "Juridico") {
      patchEmpresa.infoJuridico = info;
      patchEmpresa.infoIndividual = null;
    }

    // Transacción para garantizar atomicidad en las actualizaciones relacionadas
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Actualizar la entidad principal (Empresa)
      const upEmpresa = await tx.empresa.update({
        where: { id: empresaId },
        data: patchEmpresa,
      });

      // =====================================================
      // 2. Afiliaciones y Obligaciones
      // =====================================================
      let afiliId = exists.afiliacionesId;
      const accountingMode =
        normalizeAccountingMode(afiliaciones?.accountingMode) ??
        exists.afiliaciones?.accountingMode ??
        "DEVENGO";

      // Helper interno: recibe un id que puede ser PK global o localId
      // y devuelve siempre el id GLOBAL de la nomenclatura (o null).
      const resolveNomenclaturaId = async (
        maybeId?: number | null
      ): Promise<number | null> => {
        if (!maybeId) return null;

        // 1) Intentar como PK global
        const byPk = await tx.nomenclatura.findUnique({
          where: { id: maybeId },
          select: { id: true, tenantId: true },
        });
        if (byPk && byPk.tenantId === exists.tenantId) {
          return byPk.id;
        }

        // 2) Intentar como localId dentro del tenant
        const byLocal = await tx.nomenclatura.findUnique({
          where: {
            tenantId_localId: {
              tenantId: exists.tenantId,
              localId: maybeId,
            },
          },
          select: { id: true },
        });

        return byLocal?.id ?? null;
      };

      if (!afiliId) {
        // Crear Afiliaciones si no existían y hay datos nuevos
        if (afiliaciones) {
          const nomId = await resolveNomenclaturaId(
            afiliaciones.nomenclaturaId ?? null
          );

          const createdA = await tx.afiliaciones.create({
            data: {
              empresa: { connect: { id: empresaId } },
              regimenIvaId: afiliaciones.regimenIvaId || null,
              regimenIsrId: afiliaciones.regimenIsrId || null,
              nomenclaturaId: nomId,
              accountingMode,
            },
          });
          afiliId = createdA.id;
        }
      } else if (afiliaciones) {
        // Actualizar Afiliaciones si ya existían
        const nomId = await resolveNomenclaturaId(
          afiliaciones.nomenclaturaId ?? null
        );

        await tx.afiliaciones.update({
          where: { id: afiliId },
          data: {
            regimenIvaId: afiliaciones.regimenIvaId || null,
            regimenIsrId: afiliaciones.regimenIsrId || null,
            nomenclaturaId: nomId,
            accountingMode,
          },
        });
      }

      // Reemplazar Obligaciones (DELETE + CREATE)
      if (afiliId) {
        // Borrar todas las obligaciones existentes
        await tx.obligacion.deleteMany({ where: { afiliacionesId: afiliId } });

        // Preparar nuevas obligaciones
        const toCreate = (afiliaciones?.obligaciones || []).map((o: any) => ({
          afiliacionesId: afiliId!,
          impuesto: String(o.impuesto || "Otro"),
          codigoFormulario: o.codigoFormulario || null,
          fechaPresentacion: o.fechaPresentacion
            ? parseDMY(o.fechaPresentacion) ||
              new Date(o.fechaPresentacion as any)
            : null,
          nombreObligacion: o.nombreObligacion || null,
        }));

        // Insertar nuevas obligaciones
        if (toCreate.length) {
          await tx.obligacion.createMany({ data: toCreate });
        }
      }

      // =====================================================
      // 3. Gestiones y Folios de Libro
      // =====================================================
      if (!exists.gestionesId) {
        // Crear Gestiones si no existían
        if (gestiones) {
          const g = await tx.gestiones.create({
            data: {
              empresa: { connect: { id: empresaId } },
              correlativos: gestiones.correlativos ?? [],
            },
          });

          // Crear Folios de Libro
          const folios = (gestiones.folios || []).map((f: any) => ({
            gestionesId: g.id,
            libro: String(f.libro),
            disponibles: Number(f.disponibles || 0),
            usados: Number(f.usados || 0),
            ultimaFecha: f.ultimaFecha
              ? parseDMY(f.ultimaFecha) || new Date(f.ultimaFecha as any)
              : null,
          }));

          if (folios.length) {
            await tx.folioLibro.createMany({ data: folios });
          }
        }
      } else {
        // Reemplazar Folios de Libro (DELETE + CREATE)
        await tx.folioLibro.deleteMany({
          where: { gestionesId: exists.gestionesId },
        });

        if (gestiones) {
          // Actualizar Gestiones (solo correlativos)
          await tx.gestiones.update({
            where: { id: exists.gestionesId },
            data: { correlativos: gestiones.correlativos ?? [] },
          });

          // Insertar Folios de Libro
          const folios = (gestiones.folios || []).map((f: any) => ({
            gestionesId: exists.gestionesId!,
            libro: String(f.libro),
            disponibles: Number(f.disponibles || 0),
            usados: Number(f.usados || 0),
            ultimaFecha: f.ultimaFecha
              ? parseDMY(f.ultimaFecha) || new Date(f.ultimaFecha as any)
              : null,
          }));

          if (folios.length) {
            await tx.folioLibro.createMany({ data: folios });
          }
        }
      }

      // =====================================================
      // 4. Cuentas bancarias
      // =====================================================
      // Reemplazar Cuentas Bancarias (DELETE + CREATE)
      await tx.cuentaBancaria.deleteMany({ where: { empresaId } });

      const cuentas = (cuentasBancarias || []).map((c: any) => ({
        empresaId,
        numero: String(c.numero || ""),
        banco: String(c.banco || ""),
        descripcion: c.descripcion || null,
        moneda: c.moneda || "GTQ",
        saldoInicial: Number(c.saldoInicial || 0),
        cuentaContableId: c.cuentaContableId || null,
      }));

      if (cuentas.length) {
        await tx.cuentaBancaria.createMany({ data: cuentas });
      }

      // Devolver la empresa actualizada al final de la transacción
      return upEmpresa;
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err: any) {
    if (err instanceof AccountingError) {
      return NextResponse.json(
        { ok: false, error: err.code, message: err.message },
        { status: err.status }
      );
    }

    console.error("PUT empresa error:", err);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
