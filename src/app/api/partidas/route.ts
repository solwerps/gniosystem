// src/app/api/partidas/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

function parse_ymd(ymd: string): Date {
  const s = (ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("BAD_DATE");
  return new Date(`${s}T00:00:00.000Z`);
}

function format_ymd(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : null;
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
  const { searchParams } = new URL(req.url);

  // 0) querystring (GNIO: permitir override explícito, igual que Conta Cox)
  const qs_empresa = searchParams.get("empresa_id");
  const qs_empresa_id = Number(qs_empresa || 0);
  if (qs_empresa_id && !Number.isNaN(qs_empresa_id)) {
    const empresa = await prisma.empresa.findFirst({
      where: { id: qs_empresa_id, tenantId: tenant_id, estado: 1 },
      select: { id: true },
    });
    if (!empresa) throw new Error("EMPRESA_NOT_FOUND_FOR_TENANT");
    return empresa.id;
  }

  // 1) header
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

  // 2) cookie
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

  // 3) si solo existe una empresa activa en el tenant, usarla
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

// -----------------------------
// GET /api/partidas?tenant=slug&dates=YYYY-MM-DD,YYYY-MM-DD&poliza_id=1&correlativo=10
// (sin empresa_id)
// -----------------------------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const dates = searchParams.get("dates");
    const poliza_id_param = searchParams.get("poliza_id");
    const correlativo_param = searchParams.get("correlativo");

    const { tenant_id } = await resolve_tenant_id(req);
    const empresa_id = await resolve_empresa_id(req, tenant_id);

    const where: any = {
      empresa_id,
    };

    if (dates && dates.trim().length > 0) {
      // Permitimos 1 o 2 fechas:
      // - "YYYY-MM-DD,YYYY-MM-DD" → rango [from,to]
      // - "YYYY-MM-DD"            → rango [date,date]
      const parts = dates.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length === 1) {
        const d = parse_ymd(parts[0]);
        where.fecha = { gte: d, lte: d };
      } else if (parts.length === 2) {
        const [from, to] = parts;
        const fromDate = parse_ymd(from);
        const toDate = parse_ymd(to);
        where.fecha = { gte: fromDate, lte: toDate };
      } else {
        throw new Error("BAD_DATES_RANGE");
      }
    }

    if (poliza_id_param && poliza_id_param !== "0") {
      const poliza_id = Number(poliza_id_param);
      if (!poliza_id || Number.isNaN(poliza_id)) throw new Error("BAD_POLIZA_ID");
      where.tipo_poliza_id = poliza_id;
    }

    if (correlativo_param && correlativo_param !== "") {
      const correlativo = Number(correlativo_param);
      if (!correlativo || Number.isNaN(correlativo)) throw new Error("BAD_CORRELATIVO");
      where.correlativo = correlativo;
    }

    const asientos = await prisma.asientoContable.findMany({
      where,
      orderBy: [{ id: "desc" }],
      include: {
        tipo_poliza: { select: { nombre: true } },
        partidas: {
          include: {
            cuenta: { select: { descripcion: true, cuenta: true } }, // NomenclaturaCuenta
          },
          orderBy: { uuid: "asc" },
        },
      },
    });

    // Ensamblar respuesta + rellenar partidas sintéticas si faltan (caso ventas sin DEBE)
    const data = [];

    for (const ac of asientos) {
      const partidas = (ac.partidas || []).map((p) => ({
        uuid: p.uuid,
        monto_debe: Number(p.monto_debe ?? 0),
        monto_haber: Number(p.monto_haber ?? 0),
        cuenta_id: p.cuenta_id,
        empresa_id: p.empresa_id,
        asiento_contable_id: p.asiento_contable_id,
        descripcion: p.cuenta?.descripcion ?? null,
        cuenta: p.cuenta?.cuenta ?? null,
      }));

      const totalDebe = partidas.reduce((s, p) => s + (p.monto_debe ?? 0), 0);
      const totalHaber = partidas.reduce((s, p) => s + (p.monto_haber ?? 0), 0);

      // Si no hay DEBE pero sí HABER, intentamos inyectar uno usando la cuenta_debe del documento (igual que en /libros/diario/asientos)
      if (totalDebe === 0 && totalHaber > 0 && ac.referencia) {
        const doc = await prisma.documento.findFirst({
          where: { identificador_unico: ac.referencia, empresa_id: ac.empresa_id },
          include: { cuentaDebe: true },
        });

        const cuenta_debe_id = doc?.cuenta_debe ?? doc?.cuentaDebe?.id ?? null;
        const cuenta_debe_desc = (doc?.cuentaDebe as any)?.descripcion ?? null;
        const cuenta_debe_codigo = (doc?.cuentaDebe as any)?.cuenta ?? null;

        if (cuenta_debe_id) {
          partidas.unshift({
            uuid: `synthetic-${ac.id}`,
            monto_debe: totalHaber,
            monto_haber: 0,
            cuenta_id: cuenta_debe_id as any,
            empresa_id: ac.empresa_id,
            asiento_contable_id: ac.id,
            descripcion: cuenta_debe_desc,
            cuenta: cuenta_debe_codigo,
          });
        }
      }

      data.push({
        asiento_id: ac.id,
        fecha: format_ymd(ac.fecha),
        empresa_id: ac.empresa_id,
        descripcion: ac.descripcion,
        correlativo: ac.correlativo,
        estado: ac.estado,
        poliza_nombre: ac.tipo_poliza?.nombre ?? null,
        partidas,
      });
    }

    return NextResponse.json({
      status: 200,
      data,
      message: "Partidas obtenidas correctamente",
    });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { status: 400, data: {}, message: to_error_message(err) || "Ocurrió un error al obtener las partidas" },
      { status: 400 }
    );
  }
}
