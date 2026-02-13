import { randomUUID } from "crypto";
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

const normalizeTipoOperacion = (value: unknown): "compra" | "venta" | null => {
  const t = String(value ?? "").trim().toLowerCase();
  if (t === "compra" || t === "venta") return t;
  return null;
};

const normalizeCondicionPago = (value: unknown): "CONTADO" | "CREDITO" | null => {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "CONTADO" || v === "CREDITO") return v;
  return null;
};

function monthRange(fechaYYYYMM?: string | null) {
  const now = new Date();
  const ref = fechaYYYYMM?.match(/^\d{4}-\d{2}$/)
    ? new Date(`${fechaYYYYMM}-01T00:00:00.000Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const year = ref.getUTCFullYear();
  const month = ref.getUTCMonth();

  return {
    from: new Date(Date.UTC(year, month, 1)),
    to: new Date(Date.UTC(year, month + 1, 1)),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = tenantSlugFromRequest(req);
    const empresaId = empresaIdFromRequest(req);

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    const rawTipo = searchParams.get("tipo") ?? searchParams.get("venta");
    const tipo = normalizeTipoOperacion(rawTipo);
    const fecha = searchParams.get("fecha");

    const { from, to } = monthRange(fecha);

    const where: any = {
      empresa_id: auth.empresa.id,
      estado: 1,
      fecha_trabajo: {
        gte: from,
        lt: to,
      },
    };
    if (tipo) where.tipo_operacion = tipo;

    const rows = await prisma.documento.findMany({
      where,
      include: {
        cuentaDebe: { select: { id: true, cuenta: true, descripcion: true } },
        cuentaHaber: { select: { id: true, cuenta: true, descripcion: true } },
        cuenta_bancaria: { select: { id: true, numero: true, banco: true } },
      },
      orderBy: [{ fecha_emision: "asc" }, { uuid: "asc" }],
    });

    return NextResponse.json(
      {
        status: 200,
        message: "Documentos obtenidos correctamente.",
        data: rows.map((doc) => ({
          ...doc,
          cuenta_debe_nombre: doc.cuentaDebe?.descripcion ?? null,
          cuenta_haber_nombre: doc.cuentaHaber?.descripcion ?? null,
          tipo_operacion_nombre:
            doc.tipo_operacion === "venta"
              ? "Venta"
              : doc.tipo_operacion === "compra"
              ? "Compra"
              : doc.tipo_operacion,
        })),
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
          data: [],
        },
        { status: error.status }
      );
    }

    console.error("GET /api/documentos", error);
    return NextResponse.json(
      {
        status: 500,
        message: "Error interno al obtener documentos.",
        data: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const documentoBody = (body?.documento ?? body) as any;

    const tenantSlug = String(body?.tenant ?? tenantSlugFromRequest(req) ?? "");
    const empresaId = Number(
      body?.empresa_id ??
        documentoBody?.empresa_id ??
        documentoBody?.empresaId ??
        empresaIdFromRequest(req)
    );

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    const tipoOperacion = normalizeTipoOperacion(
      body?.tipo_operacion ?? documentoBody?.tipo_operacion
    );
    if (!tipoOperacion) {
      return NextResponse.json(
        {
          status: 400,
          message: "tipo_operacion debe ser 'compra' o 'venta'.",
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

    const condicionPago =
      normalizeCondicionPago(
        body?.condicion_pago ?? documentoBody?.condicion_pago
      ) ??
      (empresa?.afiliaciones?.accountingMode === "CAJA" ? "CONTADO" : "CREDITO");

    const cuentaBancariaIdRaw =
      body?.cuenta_bancaria_id ?? documentoBody?.cuenta_bancaria_id;
    const cuentaBancariaId = cuentaBancariaIdRaw
      ? Number(cuentaBancariaIdRaw)
      : null;

    if (cuentaBancariaId) {
      const cuentaBanco = await prisma.cuentaBancaria.findFirst({
        where: {
          id: cuentaBancariaId,
          empresaId: auth.empresa.id,
        },
        select: { id: true },
      });
      if (!cuentaBanco) {
        throw new AccountingError(
          "BANK_ACCOUNT_NOT_FOUND",
          404,
          "La cuenta bancaria no pertenece a la empresa."
        );
      }
    }

    if (condicionPago === "CONTADO" && !cuentaBancariaId) {
      throw new AccountingError(
        "BANK_ACCOUNT_REQUIRED",
        409,
        "Documento CONTADO requiere cuenta bancaria/caja."
      );
    }

    const fechaTrabajo =
      parseDate(documentoBody?.fecha_trabajo, new Date()) ?? new Date();
    const fechaEmision =
      parseDate(documentoBody?.fecha_emision, fechaTrabajo) ?? fechaTrabajo;
    const fechaAnulacion = parseDate(documentoBody?.fecha_anulacion, null);

    const serie = String(documentoBody?.serie ?? "").trim();
    const numeroDte = String(documentoBody?.numero_dte ?? "").trim();
    const numeroAutorizacion = String(
      documentoBody?.numero_autorizacion ?? ""
    ).trim();

    if (!serie || !numeroDte || !numeroAutorizacion) {
      return NextResponse.json(
        {
          status: 400,
          message: "Serie, número DTE y número de autorización son obligatorios.",
        },
        { status: 400 }
      );
    }

    const identificadorUnico =
      String(documentoBody?.identificador_unico ?? "").trim() ||
      `${serie}-${numeroDte}-${numeroAutorizacion}-${auth.empresa.id}-${tipoOperacion}`;

    const duplicate = await prisma.documento.findFirst({
      where: {
        empresa_id: auth.empresa.id,
        identificador_unico: identificadorUnico,
      },
      select: { uuid: true },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          status: 409,
          message: "El documento ya existe en la empresa.",
          data: duplicate,
        },
        { status: 409 }
      );
    }

    const clienteId = documentoBody?.cliente_id
      ? Number(documentoBody.cliente_id)
      : null;
    const proveedorId = documentoBody?.proveedor_id
      ? Number(documentoBody.proveedor_id)
      : null;

    const created = await prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, auth.empresa.id, fechaTrabajo);

      if (clienteId) {
        const cliente = await tx.cliente.findFirst({
          where: { id: clienteId, empresa_id: auth.empresa.id },
          select: { id: true },
        });
        if (!cliente) {
          throw new AccountingError(
            "CLIENT_NOT_FOUND",
            404,
            "El cliente no pertenece a la empresa."
          );
        }
      }

      if (proveedorId) {
        const proveedor = await tx.proveedor.findFirst({
          where: { id: proveedorId, empresa_id: auth.empresa.id },
          select: { id: true },
        });
        if (!proveedor) {
          throw new AccountingError(
            "SUPPLIER_NOT_FOUND",
            404,
            "El proveedor no pertenece a la empresa."
          );
        }
      }

      const row = await tx.documento.create({
        data: {
          uuid: randomUUID(),
          numero_autorizacion: numeroAutorizacion,
          fecha_trabajo: fechaTrabajo,
          fecha_emision: fechaEmision,
          tipo_dte: String(documentoBody?.tipo_dte ?? "FACT"),
          serie,
          numero_dte: numeroDte,
          identificador_unico: identificadorUnico,
          nit_emisor: String(documentoBody?.nit_emisor ?? ""),
          nombre_emisor: String(documentoBody?.nombre_emisor ?? ""),
          codigo_establecimiento: String(
            documentoBody?.codigo_establecimiento ?? ""
          ),
          establecimiento_receptor_id: documentoBody?.establecimiento_receptor_id
            ? Number(documentoBody.establecimiento_receptor_id)
            : null,
          nombre_establecimiento: String(
            documentoBody?.nombre_establecimiento ?? ""
          ),
          id_receptor: String(documentoBody?.id_receptor ?? ""),
          nombre_receptor: String(documentoBody?.nombre_receptor ?? ""),
          nit_certificador: String(documentoBody?.nit_certificador ?? ""),
          nombre_certificador: String(
            documentoBody?.nombre_certificador ?? ""
          ),
          moneda: String(documentoBody?.moneda ?? "GTQ"),
          monto_total: toNumber(documentoBody?.monto_total),
          monto_servicio: toNumber(documentoBody?.monto_servicio),
          monto_bien: toNumber(documentoBody?.monto_bien),
          factura_estado: String(documentoBody?.factura_estado ?? "VIGENTE"),
          marca_anulado: String(documentoBody?.marca_anulado ?? "No"),
          fecha_anulacion: fechaAnulacion,
          iva: toNumber(documentoBody?.iva),
          petroleo: toNumber(documentoBody?.petroleo),
          turismo_hospedaje: toNumber(documentoBody?.turismo_hospedaje),
          turismo_pasajes: toNumber(documentoBody?.turismo_pasajes),
          timbre_prensa: toNumber(documentoBody?.timbre_prensa),
          bomberos: toNumber(documentoBody?.bomberos),
          tasa_municipal: toNumber(documentoBody?.tasa_municipal),
          bebidas_alcoholicas: toNumber(documentoBody?.bebidas_alcoholicas),
          tabaco: toNumber(documentoBody?.tabaco),
          cemento: toNumber(documentoBody?.cemento),
          bebidas_no_alcoholicas: toNumber(documentoBody?.bebidas_no_alcoholicas),
          tarifa_portuaria: toNumber(documentoBody?.tarifa_portuaria),
          tipo_operacion: tipoOperacion,
          cuenta_debe: documentoBody?.cuenta_debe
            ? Number(documentoBody.cuenta_debe)
            : null,
          cuenta_haber: documentoBody?.cuenta_haber
            ? Number(documentoBody.cuenta_haber)
            : null,
          condicion_pago: condicionPago,
          cuenta_bancaria_id: cuentaBancariaId,
          cliente_id: clienteId,
          proveedor_id: proveedorId,
          tercero_ref: documentoBody?.tercero_ref ?? null,
          tipo: documentoBody?.tipo ? String(documentoBody.tipo) : null,
          empresa_id: auth.empresa.id,
          estado: 1,
          comentario: documentoBody?.comentario
            ? String(documentoBody.comentario)
            : null,
        },
      });

      await tx.bitacora.create({
        data: {
          usuario_id: auth.session.user.id,
          tipo_accion: "CREATE_DOCUMENTO",
          descripcion_accion: `Documento ${row.uuid} creado`,
          tabla_afectada: "documentos",
          registro_afectado_id: auth.empresa.id,
          detalles_modificacion: JSON.stringify({
            documento_uuid: row.uuid,
            empresa_id: auth.empresa.id,
            tipo_operacion: tipoOperacion,
            condicion_pago: condicionPago,
          }),
        },
      });

      return row;
    });

    return NextResponse.json(
      {
        status: 200,
        message: "Documento creado correctamente.",
        data: created,
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

    console.error("POST /api/documentos", error);
    return NextResponse.json(
      {
        status: 500,
        message: "Error interno al crear documento.",
      },
      { status: 500 }
    );
  }
}
