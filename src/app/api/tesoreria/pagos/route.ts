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

const round2 = (n: number) => Number(n.toFixed(2));

type AplicacionInput = {
  documento_uuid: string;
  monto_aplicado: number;
};

function parseDate(input: unknown) {
  const date = new Date(String(input ?? ""));
  if (Number.isNaN(date.getTime())) {
    throw new AccountingError("BAD_DATE", 400, "Fecha inválida.");
  }
  return date;
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

    const fechaDesdeRaw = searchParams.get("fecha_desde");
    const fechaHastaRaw = searchParams.get("fecha_hasta");
    const where: any = { empresa_id: auth.empresa.id };

    if (fechaDesdeRaw || fechaHastaRaw) {
      const from = fechaDesdeRaw ? parseDate(fechaDesdeRaw) : new Date("2000-01-01");
      const to = fechaHastaRaw ? parseDate(fechaHastaRaw) : new Date("2200-12-31");
      where.fecha = { gte: from, lte: to };
    }

    const data = await prisma.pago.findMany({
      where,
      include: {
        proveedor: true,
        cuenta_bancaria: true,
        aplicaciones: true,
      },
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
    });

    return NextResponse.json({
      status: 200,
      message: "Pagos obtenidos correctamente.",
      data,
    });
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

    console.error("GET /api/tesoreria/pagos", error);
    return NextResponse.json(
      { status: 500, message: "Error interno al obtener pagos." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const tenantSlug = String(body?.tenant ?? tenantSlugFromRequest(req) ?? "");
    const empresaId = body?.empresa_id ?? empresaIdFromRequest(req);

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    const fecha = parseDate(body?.fecha);
    const monto = round2(toNumber(body?.monto));
    const referencia = body?.referencia ? String(body.referencia) : null;
    const cuentaBancariaId = Number(body?.cuenta_bancaria_id ?? 0);
    const proveedorId = body?.proveedor_id ? Number(body.proveedor_id) : null;
    const aplicaciones: AplicacionInput[] = Array.isArray(body?.aplicaciones)
      ? body.aplicaciones
          .map((a: any) => ({
            documento_uuid: String(a?.documento_uuid ?? "").trim(),
            monto_aplicado: round2(toNumber(a?.monto_aplicado)),
          }))
          .filter((a: AplicacionInput) => a.documento_uuid && a.monto_aplicado > 0)
      : [];

    if (!cuentaBancariaId) {
      throw new AccountingError(
        "BANK_ACCOUNT_REQUIRED",
        400,
        "Debe seleccionar cuenta_bancaria_id."
      );
    }

    if (monto <= 0) {
      throw new AccountingError("BAD_AMOUNT", 400, "Monto inválido.");
    }

    const totalAplicado = round2(
      aplicaciones.reduce((acc, a) => acc + a.monto_aplicado, 0)
    );
    if (totalAplicado > monto) {
      throw new AccountingError(
        "APPLIED_AMOUNT_EXCEEDS",
        409,
        "La suma aplicada no puede ser mayor al monto del pago."
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, auth.empresa.id, fecha);

      const [empresa, cuentaBanco] = await Promise.all([
        tx.empresa.findUnique({
          where: { id: auth.empresa.id },
          select: {
            id: true,
            afiliaciones: { select: { nomenclaturaId: true } },
          },
        }),
        tx.cuentaBancaria.findFirst({
          where: {
            id: cuentaBancariaId,
            empresaId: auth.empresa.id,
          },
          select: { id: true, cuentaContableId: true },
        }),
      ]);

      if (!empresa?.afiliaciones?.nomenclaturaId) {
        throw new AccountingError(
          "NOMENCLATURA_REQUIRED",
          409,
          "La empresa no tiene nomenclatura afiliada."
        );
      }

      if (!cuentaBanco?.cuentaContableId) {
        throw new AccountingError(
          "BANK_ACCOUNT_NOT_LINKED",
          409,
          "La cuenta bancaria debe tener cuenta contable vinculada."
        );
      }

      const cuentaCxp = await tx.nomenclaturaCuenta.findFirst({
        where: {
          nomenclaturaId: empresa.afiliaciones.nomenclaturaId,
          cuenta: "210101",
        },
        select: { id: true },
      });

      if (!cuentaCxp?.id) {
        throw new AccountingError(
          "CXP_ACCOUNT_NOT_FOUND",
          409,
          "No se encontró cuenta 210101 (Proveedores)."
        );
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

      if (aplicaciones.length) {
        const docs = await tx.documento.findMany({
          where: {
            uuid: { in: aplicaciones.map((a) => a.documento_uuid) },
            empresa_id: auth.empresa.id,
            tipo_operacion: "compra",
            condicion_pago: "CREDITO",
            estado: 1,
          },
          select: { uuid: true },
        });

        if (docs.length !== aplicaciones.length) {
          throw new AccountingError(
            "INVALID_APPLIED_DOCUMENT",
            409,
            "Hay documentos inválidos para aplicar pago."
          );
        }
      }

      const agg = await tx.asientoContable.aggregate({
        where: { empresa_id: auth.empresa.id },
        _max: { correlativo: true },
      });
      const correlativo = (agg._max.correlativo ?? 0) + 1;

      const asiento = await tx.asientoContable.create({
        data: {
          correlativo,
          tipo_poliza_id: 8,
          descripcion: "[AUTO] Pago de tesorería",
          referencia: referencia ?? `PAGO-${correlativo}`,
          fecha,
          estado: 1,
          empresa_id: auth.empresa.id,
        },
        select: { id: true },
      });

      await tx.partida.createMany({
        data: [
          {
            uuid: randomUUID(),
            cuenta_id: cuentaCxp.id,
            monto_debe: monto,
            monto_haber: 0,
            referencia: referencia,
            empresa_id: auth.empresa.id,
            asiento_contable_id: asiento.id,
          },
          {
            uuid: randomUUID(),
            cuenta_id: cuentaBanco.cuentaContableId,
            monto_debe: 0,
            monto_haber: monto,
            referencia: referencia,
            empresa_id: auth.empresa.id,
            asiento_contable_id: asiento.id,
          },
        ],
      });

      const pago = await tx.pago.create({
        data: {
          empresa_id: auth.empresa.id,
          cuenta_bancaria_id: cuentaBancariaId,
          proveedor_id: proveedorId,
          fecha,
          monto,
          referencia,
          estado: 1,
          asiento_contable_id: asiento.id,
        },
        select: { id: true },
      });

      await tx.movimientoCuentaBancaria.create({
        data: {
          cuenta_bancaria_id: cuentaBancariaId,
          asiento_contable_id: asiento.id,
          documento_uuid: aplicaciones.length === 1 ? aplicaciones[0].documento_uuid : null,
          fecha,
          descripcion: "[AUTO] Pago de tesorería",
          tipo_movimiento: "credito",
          monto,
          referencia: referencia ?? `PAGO-${pago.id}`,
          estado: 1,
          estado_conciliacion: "PENDIENTE",
        },
      });

      if (aplicaciones.length) {
        await tx.aplicacionPagoDocumento.createMany({
          data: aplicaciones.map((a) => ({
            pago_id: pago.id,
            documento_uuid: a.documento_uuid,
            monto_aplicado: a.monto_aplicado,
          })),
        });
      }

      await tx.bitacora.create({
        data: {
          usuario_id: auth.session.user.id,
          tipo_accion: "CREATE_PAGO",
          descripcion_accion: `Pago ${pago.id} registrado`,
          tabla_afectada: "pagos",
          registro_afectado_id: pago.id,
          detalles_modificacion: JSON.stringify({
            empresa_id: auth.empresa.id,
            monto,
            cuenta_bancaria_id: cuentaBancariaId,
            aplicaciones,
          }),
        },
      });

      return { pagoId: pago.id, asientoId: asiento.id };
    });

    return NextResponse.json({
      status: 200,
      message: "Pago registrado correctamente.",
      data: result,
    });
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

    console.error("POST /api/tesoreria/pagos", error);
    return NextResponse.json(
      { status: 500, message: "Error interno al registrar pago." },
      { status: 500 }
    );
  }
}
