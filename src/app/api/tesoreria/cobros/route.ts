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

    const data = await prisma.cobro.findMany({
      where,
      include: {
        cliente: true,
        cuenta_bancaria: true,
        aplicaciones: true,
      },
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
    });

    return NextResponse.json({
      status: 200,
      message: "Cobros obtenidos correctamente.",
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

    console.error("GET /api/tesoreria/cobros", error);
    return NextResponse.json(
      { status: 500, message: "Error interno al obtener cobros." },
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
    const clienteId = body?.cliente_id ? Number(body.cliente_id) : null;
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
        "La suma aplicada no puede ser mayor al monto del cobro."
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

      const cuentaCxc = await tx.nomenclaturaCuenta.findFirst({
        where: {
          nomenclaturaId: empresa.afiliaciones.nomenclaturaId,
          cuenta: "110301",
        },
        select: { id: true },
      });

      if (!cuentaCxc?.id) {
        throw new AccountingError(
          "CXC_ACCOUNT_NOT_FOUND",
          409,
          "No se encontró cuenta 110301 (Clientes)."
        );
      }

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

      if (aplicaciones.length) {
        const docs = await tx.documento.findMany({
          where: {
            uuid: { in: aplicaciones.map((a) => a.documento_uuid) },
            empresa_id: auth.empresa.id,
            tipo_operacion: "venta",
            condicion_pago: "CREDITO",
            estado: 1,
          },
          select: { uuid: true },
        });

        if (docs.length !== aplicaciones.length) {
          throw new AccountingError(
            "INVALID_APPLIED_DOCUMENT",
            409,
            "Hay documentos inválidos para aplicar cobro."
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
          descripcion: "[AUTO] Cobro de tesorería",
          referencia: referencia ?? `COBRO-${correlativo}`,
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
            cuenta_id: cuentaBanco.cuentaContableId,
            monto_debe: monto,
            monto_haber: 0,
            referencia: referencia,
            empresa_id: auth.empresa.id,
            asiento_contable_id: asiento.id,
          },
          {
            uuid: randomUUID(),
            cuenta_id: cuentaCxc.id,
            monto_debe: 0,
            monto_haber: monto,
            referencia: referencia,
            empresa_id: auth.empresa.id,
            asiento_contable_id: asiento.id,
          },
        ],
      });

      const cobro = await tx.cobro.create({
        data: {
          empresa_id: auth.empresa.id,
          cuenta_bancaria_id: cuentaBancariaId,
          cliente_id: clienteId,
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
          descripcion: "[AUTO] Cobro de tesorería",
          tipo_movimiento: "debito",
          monto,
          referencia: referencia ?? `COBRO-${cobro.id}`,
          estado: 1,
          estado_conciliacion: "PENDIENTE",
        },
      });

      if (aplicaciones.length) {
        await tx.aplicacionPagoDocumento.createMany({
          data: aplicaciones.map((a) => ({
            cobro_id: cobro.id,
            documento_uuid: a.documento_uuid,
            monto_aplicado: a.monto_aplicado,
          })),
        });
      }

      await tx.bitacora.create({
        data: {
          usuario_id: auth.session.user.id,
          tipo_accion: "CREATE_COBRO",
          descripcion_accion: `Cobro ${cobro.id} registrado`,
          tabla_afectada: "cobros",
          registro_afectado_id: cobro.id,
          detalles_modificacion: JSON.stringify({
            empresa_id: auth.empresa.id,
            monto,
            cuenta_bancaria_id: cuentaBancariaId,
            aplicaciones,
          }),
        },
      });

      return { cobroId: cobro.id, asientoId: asiento.id };
    });

    return NextResponse.json({
      status: 200,
      message: "Cobro registrado correctamente.",
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

    console.error("POST /api/tesoreria/cobros", error);
    return NextResponse.json(
      { status: 500, message: "Error interno al registrar cobro." },
      { status: 500 }
    );
  }
}
