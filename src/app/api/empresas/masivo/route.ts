import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const revalidate = 0;

type EmpresaPayload = {
  nombre?: string;
  nit?: string;
  sectorEconomico?: string;
  razonSocial?: string;
};

function normalizeText(value?: string | null) {
  return String(value ?? "").trim();
}

function normalizeRazonSocial(value?: string | null) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!raw) return null;
  if (raw.includes("jurid")) return "Juridico";
  if (raw.includes("individual")) return "Individual";
  return null;
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantFromQuery = searchParams.get("tenant");
    const body = await req.json();

    const tenantSlug = tenantFromQuery || body?.tenant;
    const empresas = Array.isArray(body?.empresas) ? (body.empresas as EmpresaPayload[]) : [];

    if (!tenantSlug) {
      return NextResponse.json({ ok: false, error: "MISSING_TENANT" }, { status: 400 });
    }

    if (!empresas.length) {
      return NextResponse.json({ ok: false, error: "EMPTY_PAYLOAD" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ ok: false, error: "TENANT_NOT_FOUND" }, { status: 404 });
    }

    const errors: Array<{ index: number; error: string }> = [];
    let created = 0;

    for (let i = 0; i < empresas.length; i += 1) {
      const row = empresas[i] || {};
      const nombre = normalizeText(row.nombre);
      const nit = normalizeText(row.nit);
      const sectorEconomico = normalizeText(row.sectorEconomico);
      const razonSocial = normalizeRazonSocial(row.razonSocial);

      if (!nombre || !nit || !sectorEconomico || !razonSocial) {
        errors.push({ index: i + 1, error: "MISSING_FIELDS" });
        continue;
      }

      await prisma.empresa.create({
        data: {
          tenantId: tenant.id,
          tenantSlug,
          nombre,
          nit,
          sectorEconomico,
          razonSocial,
        },
      });

      created += 1;
    }

    return NextResponse.json({ ok: true, created, errors });
  } catch (err) {
    console.error("POST /api/empresas/masivo", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
