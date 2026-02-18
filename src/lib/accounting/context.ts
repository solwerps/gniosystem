import prisma from "@/lib/prisma";
import { getSession, type Session } from "@/lib/auth";

export class AccountingError extends Error {
  status: number;
  code: string;

  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.code = code;
    this.status = status;
  }
}

export type AccountingAccess = {
  session: Session;
  tenant: {
    id: number;
    slug: string;
  };
  empresa: {
    id: number;
    tenantId: number;
    nombre: string;
    nit: string;
    afiliacionesId: number | null;
  };
};

export const normalizeTenantSlug = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const normalizeEmpresaId = (value?: string | number | null) => {
  const n = Number(value ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

export const tenantSlugFromRequest = (req: Request) => {
  const { searchParams } = new URL(req.url);
  return (
    searchParams.get("tenant") ||
    req.headers.get("x-tenant-slug") ||
    req.headers.get("x-tenant") ||
    ""
  );
};

export const empresaIdFromRequest = (req: Request) => {
  const { searchParams } = new URL(req.url);
  return (
    searchParams.get("empresa_id") ||
    searchParams.get("empresaId") ||
    req.headers.get("x-empresa-id") ||
    req.headers.get("x-empresa") ||
    ""
  );
};

type EmpresaAccessRow = {
  id: number;
  tenantId: number;
  nombre: string;
  nit: string;
  afiliacionesId: number | null;
};

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

async function findEmpresaForTenant(input: {
  empresaId: number;
  tenant: { id: number; slug: string };
}): Promise<EmpresaAccessRow | null> {
  const { empresaId, tenant } = input;

  try {
    const modern = await prisma.empresa.findFirst({
      where: {
        id: empresaId,
        tenantId: tenant.id,
        estado: 1,
      },
      select: {
        id: true,
        tenantId: true,
        nombre: true,
        nit: true,
        afiliacionesId: true,
      },
    });

    if (modern) return modern;
  } catch (err) {
    if (!isSchemaMismatchError(err)) throw err;
  }

  try {
    const legacy = await prisma.empresa.findFirst({
      where: {
        id: empresaId,
        tenantSlug: tenant.slug,
      },
      select: {
        id: true,
        nombre: true,
        nit: true,
        afiliacionesId: true,
      },
    });

    if (!legacy) return null;

    return {
      ...legacy,
      tenantId: tenant.id,
    };
  } catch (err) {
    if (isSchemaMismatchError(err)) return null;
    throw err;
  }
}

type RequireAccessInput = {
  tenantSlug?: string | null;
  empresaId?: string | number | null;
  allowAdminWithoutMembership?: boolean;
};

export async function requireAccountingAccess(
  input: RequireAccessInput = {}
): Promise<AccountingAccess> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new AccountingError("UNAUTHORIZED", 401, "Debes iniciar sesión.");
  }

  const tenantSlug = normalizeTenantSlug(input.tenantSlug);
  if (!tenantSlug) {
    throw new AccountingError(
      "TENANT_REQUIRED",
      400,
      "Debe enviar tenant (slug)."
    );
  }

  const empresaId = normalizeEmpresaId(input.empresaId);
  if (!empresaId) {
    throw new AccountingError(
      "EMPRESA_REQUIRED",
      400,
      "Debe enviar empresa_id válido."
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    throw new AccountingError("TENANT_NOT_FOUND", 404, "Tenant no encontrado.");
  }

  const mustCheckMembership =
    !input.allowAdminWithoutMembership || session.user.role !== "ADMIN";

  if (mustCheckMembership) {
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
      throw new AccountingError(
        "FORBIDDEN",
        403,
        "No tienes membresía para operar en este tenant."
      );
    }
  }

  const empresa = await findEmpresaForTenant({
    empresaId,
    tenant,
  });

  if (!empresa) {
    throw new AccountingError(
      "EMPRESA_NOT_FOUND_FOR_TENANT",
      404,
      "La empresa no existe en el tenant indicado."
    );
  }

  return { session, tenant, empresa };
}

type AssertUserAccessInput = {
  userId: number;
  tenantSlug: string;
  empresaId: number;
  role?: Session["user"]["role"];
  allowAdminWithoutMembership?: boolean;
};

export async function assertUserAccountingAccess(
  input: AssertUserAccessInput
): Promise<{
  tenant: { id: number; slug: string };
  empresa: {
    id: number;
    tenantId: number;
    nombre: string;
    nit: string;
    afiliacionesId: number | null;
  };
}> {
  const tenantSlug = normalizeTenantSlug(input.tenantSlug);
  const empresaId = normalizeEmpresaId(input.empresaId);

  if (!tenantSlug) {
    throw new AccountingError("TENANT_REQUIRED", 400, "Tenant requerido.");
  }

  if (!empresaId) {
    throw new AccountingError(
      "EMPRESA_REQUIRED",
      400,
      "empresa_id inválido."
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    throw new AccountingError("TENANT_NOT_FOUND", 404, "Tenant no encontrado.");
  }

  const mustCheckMembership =
    !input.allowAdminWithoutMembership || input.role !== "ADMIN";

  if (mustCheckMembership) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: input.userId,
          tenantId: tenant.id,
        },
      },
      select: { userId: true },
    });

    if (!membership) {
      throw new AccountingError(
        "FORBIDDEN",
        403,
        "El usuario no tiene membresía sobre el tenant."
      );
    }
  }

  const empresa = await findEmpresaForTenant({
    empresaId,
    tenant,
  });

  if (!empresa) {
    throw new AccountingError(
      "EMPRESA_NOT_FOUND_FOR_TENANT",
      404,
      "Empresa no encontrada para el tenant indicado."
    );
  }

  return { tenant, empresa };
}
