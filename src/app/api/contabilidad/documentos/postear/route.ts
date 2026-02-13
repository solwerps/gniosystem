import { NextResponse } from "next/server";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";
import { postDocumento } from "@/lib/accounting/postingEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const tenantSlug = String(
      body?.tenant ?? tenantSlugFromRequest(req) ?? ""
    ).trim();
    const empresaId = Number(body?.empresa_id ?? empresaIdFromRequest(req));

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    const documentoUuid = String(body?.documento_uuid ?? "").trim();
    const documentosUuid = Array.isArray(body?.documentos_uuid)
      ? body.documentos_uuid.map((x: unknown) => String(x ?? "").trim()).filter(Boolean)
      : [];

    const queue = documentoUuid ? [documentoUuid] : documentosUuid;
    if (!queue.length) {
      return NextResponse.json(
        {
          status: 400,
          message: "Debe enviar documento_uuid o documentos_uuid[].",
          data: [],
        },
        { status: 400 }
      );
    }

    const ok: any[] = [];
    const errors: any[] = [];

    for (const uuid of queue) {
      try {
        const result = await postDocumento(
          uuid,
          auth.empresa.id,
          auth.session.user.id,
          auth.tenant.slug
        );
        ok.push({ documento_uuid: uuid, ...result });
      } catch (error: any) {
        if (error instanceof AccountingError) {
          errors.push({
            documento_uuid: uuid,
            code: error.code,
            message: error.message,
          });
          continue;
        }

        errors.push({
          documento_uuid: uuid,
          code: "POSTING_ERROR",
          message: error?.message || "Error al contabilizar documento.",
        });
      }
    }

    return NextResponse.json(
      {
        status: errors.length ? 207 : 200,
        message: errors.length
          ? "Contabilización parcial finalizada."
          : "Documentos contabilizados correctamente.",
        data: {
          ok,
          errors,
        },
      },
      { status: errors.length ? 207 : 200 }
    );
  } catch (error: any) {
    if (error instanceof AccountingError) {
      return NextResponse.json(
        {
          status: error.status,
          message: error.message,
          code: error.code,
        },
        { status: error.status }
      );
    }

    console.error("POST /api/contabilidad/documentos/postear", error);
    return NextResponse.json(
      {
        status: 500,
        message: "Error interno al contabilizar documentos.",
      },
      { status: 500 }
    );
  }
}
