import { randomUUID } from "crypto";
import moment from "moment";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";
import { assertPeriodOpen } from "@/lib/accounting/periods";

const toNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

const parseDate = (input: unknown, fallback?: Date) => {
  if (!input) return fallback ?? null;
  const date = new Date(String(input));
  if (Number.isNaN(date.getTime())) return fallback ?? null;
  return date;
};

const normalizeCondicionPago = (value: unknown): "CONTADO" | "CREDITO" | null => {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "CONTADO" || v === "CREDITO") return v;
  return null;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const tenantSlug = String(body?.tenant ?? tenantSlugFromRequest(req) ?? "");
    const empresaId = Number(body?.empresa_id ?? empresaIdFromRequest(req));
    const operacionTipo = String(body?.operacion_tipo ?? "")
      .trim()
      .toLowerCase();
    const fechaTrabajo = parseDate(body?.date, new Date());
    const documentos = Array.isArray(body?.documentos) ? body.documentos : [];

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    if (!["compra", "venta"].includes(operacionTipo)) {
      return NextResponse.json(
        {
          status: 400,
          message: "operacion_tipo debe ser 'compra' o 'venta'.",
        },
        { status: 400 }
      );
    }

    if (!documentos.length) {
      return NextResponse.json(
        {
          status: 400,
          message: "No se enviaron documentos.",
        },
        { status: 400 }
      );
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: auth.empresa.id },
      select: {
        afiliaciones: {
          select: { accountingMode: true },
        },
      },
    });

    const defaultCondicion =
      empresa?.afiliaciones?.accountingMode === "CAJA" ? "CONTADO" : "CREDITO";
    const fromBodyCondicion = normalizeCondicionPago(body?.condicion_pago);
    const cuentaBancariaId = body?.cuenta_bancaria_id
      ? Number(body.cuenta_bancaria_id)
      : null;

    const cuentaIds = new Set<number>();
    if (cuentaBancariaId) cuentaIds.add(cuentaBancariaId);
    documentos.forEach((doc: any) => {
      const id = doc?.cuenta_bancaria_id != null ? Number(doc.cuenta_bancaria_id) : null;
      if (id) cuentaIds.add(id);
    });

    if (cuentaIds.size) {
      const cuentas = await prisma.cuentaBancaria.findMany({
        where: {
          id: { in: Array.from(cuentaIds) },
          empresaId: auth.empresa.id,
        },
        select: { id: true },
      });
      const allowed = new Set(cuentas.map((c) => c.id));
      const invalid = Array.from(cuentaIds).filter((id) => !allowed.has(id));
      if (invalid.length) {
        throw new AccountingError(
          "BANK_ACCOUNT_NOT_FOUND",
          404,
          "Una o más cuentas bancarias no pertenecen a la empresa."
        );
      }
    }

    const selectedMonth = fechaTrabajo!.getUTCMonth();
    const selectedYear = fechaTrabajo!.getUTCFullYear();

    const docsToInsert = documentos.map((doc: any) => {
      const fechaEmision = parseDate(doc?.fecha_emision, fechaTrabajo);
      if (
        !fechaEmision ||
        fechaEmision.getUTCMonth() !== selectedMonth ||
        fechaEmision.getUTCFullYear() !== selectedYear
      ) {
        throw new AccountingError(
          "BAD_DOCUMENT_MONTH",
          409,
          "Hay documentos fuera del mes seleccionado."
        );
      }

      const serie = String(doc?.serie ?? "").trim();
      const numeroDte = String(doc?.numero_dte ?? "").trim();
      const numeroAutorizacion = String(doc?.numero_autorizacion ?? "").trim();
      if (!serie || !numeroDte || !numeroAutorizacion) {
        throw new AccountingError(
          "BAD_DOCUMENT_KEYS",
          400,
          "Serie, número de DTE y número de autorización son obligatorios."
        );
      }

      const identificadorUnico =
        String(doc?.identificador_unico ?? "").trim() ||
        `${serie}-${numeroDte}-${numeroAutorizacion}-${auth.empresa.id}-${operacionTipo}`;

      const fechaAnulacion = parseDate(doc?.fecha_anulacion, null);
      const condicionPago =
        normalizeCondicionPago(doc?.condicion_pago) ??
        fromBodyCondicion ??
        defaultCondicion;

      const cuentaBancariaDoc =
        doc?.cuenta_bancaria_id != null
          ? Number(doc.cuenta_bancaria_id)
          : cuentaBancariaId;

      if (condicionPago === "CONTADO" && !cuentaBancariaDoc) {
        throw new AccountingError(
          "BANK_ACCOUNT_REQUIRED",
          409,
          "Documentos CONTADO requieren cuenta bancaria/caja."
        );
      }

      return {
        uuid: randomUUID(),
        identificador_unico: identificadorUnico,
        fecha_trabajo: fechaTrabajo,
        fecha_emision: fechaEmision,
        numero_autorizacion: numeroAutorizacion,
        tipo_dte: String(doc?.tipo_dte ?? "FACT"),
        serie,
        numero_dte: numeroDte,
        nit_emisor: String(doc?.nit_emisor ?? ""),
        nombre_emisor: String(doc?.nombre_emisor ?? ""),
        codigo_establecimiento: String(doc?.codigo_establecimiento ?? ""),
        establecimiento_receptor_id: doc?.establecimiento_receptor_id
          ? Number(doc.establecimiento_receptor_id)
          : null,
        nombre_establecimiento: String(doc?.nombre_establecimiento ?? ""),
        id_receptor: String(doc?.id_receptor ?? ""),
        nombre_receptor: String(doc?.nombre_receptor ?? ""),
        nit_certificador: String(doc?.nit_certificador ?? ""),
        nombre_certificador: String(doc?.nombre_certificador ?? ""),
        moneda: String(doc?.moneda ?? "GTQ"),
        monto_total: toNumber(doc?.monto_total),
        monto_bien: toNumber(doc?.monto_bien),
        monto_servicio: toNumber(doc?.monto_servicio),
        factura_estado: String(doc?.factura_estado ?? doc?.estado ?? "VIGENTE"),
        marca_anulado: String(doc?.marca_anulado ?? ""),
        fecha_anulacion: fechaAnulacion,
        iva: toNumber(doc?.iva),
        petroleo: toNumber(doc?.petroleo),
        turismo_hospedaje: toNumber(doc?.turismo_hospedaje),
        turismo_pasajes: toNumber(doc?.turismo_pasajes),
        timbre_prensa: toNumber(doc?.timbre_prensa),
        bomberos: toNumber(doc?.bomberos),
        tasa_municipal: toNumber(doc?.tasa_municipal),
        bebidas_alcoholicas: toNumber(doc?.bebidas_alcoholicas),
        tabaco: toNumber(doc?.tabaco),
        cemento: toNumber(doc?.cemento),
        bebidas_no_alcoholicas: toNumber(doc?.bebidas_no_alcoholicas),
        tarifa_portuaria: toNumber(doc?.tarifa_portuaria),
        tipo_operacion: operacionTipo,
        cuenta_debe: doc?.cuenta_debe ? Number(doc.cuenta_debe) : null,
        cuenta_haber: doc?.cuenta_haber ? Number(doc.cuenta_haber) : null,
        condicion_pago: condicionPago,
        cuenta_bancaria_id: cuentaBancariaDoc,
        tipo: doc?.tipo ? String(doc.tipo) : null,
        tercero_ref: doc?.tercero_ref ?? null,
        empresa_id: auth.empresa.id,
        estado: 1,
      };
    });

    const duplicadosInternos = new Set<string>();
    const seen = new Set<string>();
    for (const d of docsToInsert) {
      if (seen.has(d.identificador_unico)) duplicadosInternos.add(d.identificador_unico);
      seen.add(d.identificador_unico);
    }
    if (duplicadosInternos.size) {
      throw new AccountingError(
        "DUPLICATE_IN_BATCH",
        409,
        "Hay documentos duplicados dentro del lote."
      );
    }

    const existentes = await prisma.documento.findMany({
      where: {
        empresa_id: auth.empresa.id,
        identificador_unico: { in: docsToInsert.map((d) => d.identificador_unico) },
      },
      select: { identificador_unico: true },
    });

    if (existentes.length) {
      return NextResponse.json(
        {
          status: 409,
          message: "Uno o más documentos ya existen en la empresa.",
          data: existentes.map((e) => e.identificador_unico),
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, auth.empresa.id, fechaTrabajo!);

      await tx.documento.createMany({
        data: docsToInsert,
      });

      await tx.bitacora.create({
        data: {
          usuario_id: auth.session.user.id,
          tipo_accion: "CREATE_DOCUMENTO_BATCH",
          descripcion_accion: `${docsToInsert.length} documentos cargados`,
          tabla_afectada: "documentos",
          registro_afectado_id: auth.empresa.id,
          detalles_modificacion: JSON.stringify({
            empresa_id: auth.empresa.id,
            cantidad: docsToInsert.length,
            operacion_tipo: operacionTipo,
            fecha_trabajo: moment(fechaTrabajo).format("YYYY-MM-DD"),
          }),
        },
      });
    });

    return NextResponse.json(
      {
        status: 200,
        message: "Documentos creados correctamente.",
        data: {
          total: docsToInsert.length,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof AccountingError) {
      return NextResponse.json(
        {
          status: error.status,
          code: error.code,
          message: error.message,
        },
        { status: error.status }
      );
    }

    console.error("POST /api/documentos/masivo", error);
    return NextResponse.json(
      {
        status: 500,
        message: "Error interno al crear documentos masivos.",
      },
      { status: 500 }
    );
  }
}
