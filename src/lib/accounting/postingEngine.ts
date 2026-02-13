import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import {
  AccountingError,
  assertUserAccountingAccess,
} from "@/lib/accounting/context";
import { assertPeriodOpen } from "@/lib/accounting/periods";

type PostDocumentoResult = {
  asientoId: number;
  movimientoId: number | null;
  accountingMode: "CAJA" | "DEVENGO";
  condicionPago: "CONTADO" | "CREDITO";
};

const toNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

const round2 = (n: number) => Number(n.toFixed(2));

const impuestosExtrasFromDocumento = (doc: any) =>
  [
    doc.petroleo,
    doc.turismo_hospedaje,
    doc.turismo_pasajes,
    doc.timbre_prensa,
    doc.bomberos,
    doc.tasa_municipal,
    doc.bebidas_alcoholicas,
    doc.tabaco,
    doc.cemento,
    doc.bebidas_no_alcoholicas,
    doc.tarifa_portuaria,
  ].reduce((acc, curr) => acc + toNumber(curr), 0);

const resolveBaseAndIva = (doc: any) => {
  const total = round2(toNumber(doc.monto_total));
  const iva = round2(toNumber(doc.iva));
  const extras = round2(impuestosExtrasFromDocumento(doc));

  let base = round2(total - iva - extras);
  if (base < 0) {
    base = round2(total - iva);
  }
  if (base < 0) {
    base = total;
  }

  const lineSum = round2(base + iva + extras);
  const adjust = round2(total - lineSum);
  if (adjust !== 0) {
    base = round2(base + adjust);
  }

  return { total, iva, extras, base };
};

async function findCuentaByCodigo(
  tx: any,
  nomenclaturaId: number,
  codigo: string
) {
  return tx.nomenclaturaCuenta.findFirst({
    where: {
      nomenclaturaId,
      cuenta: codigo,
    },
    select: {
      id: true,
      cuenta: true,
      descripcion: true,
    },
  });
}

export async function postDocumento(
  documentoUuid: string,
  empresaId: number,
  userId: number,
  tenantSlug: string
): Promise<PostDocumentoResult> {
  if (!documentoUuid?.trim()) {
    throw new AccountingError(
      "DOCUMENTO_UUID_REQUIRED",
      400,
      "Debe enviar documentoUuid."
    );
  }

  await assertUserAccountingAccess({
    userId,
    tenantSlug,
    empresaId,
  });

  return prisma.$transaction(async (tx) => {
    const documento = await tx.documento.findFirst({
      where: {
        uuid: documentoUuid,
        empresa_id: empresaId,
        estado: 1,
      },
      include: {
        empresa: {
          select: {
            id: true,
            tenantId: true,
            afiliaciones: {
              select: {
                accountingMode: true,
                nomenclaturaId: true,
              },
            },
          },
        },
        cuentaDebe: {
          select: { id: true, cuenta: true, descripcion: true },
        },
        cuentaHaber: {
          select: { id: true, cuenta: true, descripcion: true },
        },
        cuenta_bancaria: {
          select: {
            id: true,
            empresaId: true,
            cuentaContableId: true,
            banco: true,
            numero: true,
          },
        },
      },
    });

    if (!documento) {
      throw new AccountingError(
        "DOCUMENTO_NOT_FOUND",
        404,
        "Documento no encontrado para la empresa."
      );
    }

    if (documento.asiento_contable_id) {
      throw new AccountingError(
        "DOCUMENTO_ALREADY_POSTED",
        409,
        "Este documento ya fue contabilizado."
      );
    }

    const fechaTrabajo = documento.fecha_trabajo ?? documento.fecha_emision;
    await assertPeriodOpen(tx, empresaId, fechaTrabajo);

    const nomenclaturaId = documento.empresa.afiliaciones?.nomenclaturaId;
    if (!nomenclaturaId) {
      throw new AccountingError(
        "NOMENCLATURA_REQUIRED",
        409,
        "La empresa no tiene nomenclatura afiliada."
      );
    }

    const accountingMode =
      (documento.empresa.afiliaciones?.accountingMode as "CAJA" | "DEVENGO") ??
      "DEVENGO";
    const condicionPago =
      (documento.condicion_pago as "CONTADO" | "CREDITO" | null) ??
      (accountingMode === "CAJA" ? "CONTADO" : "CREDITO");

    const isVenta = documento.tipo_operacion === "venta";
    const isContado = condicionPago === "CONTADO";

    const [cuentaCxC, cuentaCxP, cuentaIvaDebito, cuentaIvaCredito] =
      await Promise.all([
        findCuentaByCodigo(tx, nomenclaturaId, "110301"),
        findCuentaByCodigo(tx, nomenclaturaId, "210101"),
        findCuentaByCodigo(tx, nomenclaturaId, "210201"),
        findCuentaByCodigo(tx, nomenclaturaId, "110401"),
      ]);

    const cuentaBancoId = documento.cuenta_bancaria?.cuentaContableId ?? null;
    if (isContado && !cuentaBancoId) {
      throw new AccountingError(
        "BANK_ACCOUNT_REQUIRED",
        409,
        "Documento CONTADO requiere cuenta bancaria/caja con cuenta contable."
      );
    }

    const { total, iva, extras, base } = resolveBaseAndIva(documento);

    if (total <= 0) {
      throw new AccountingError(
        "DOCUMENT_TOTAL_INVALID",
        409,
        "El documento no tiene monto total válido para contabilizar."
      );
    }

    const lines: Array<{ cuenta_id: number; debe: number; haber: number }> = [];

    if (isVenta) {
      const cuentaIngresoId = Number(documento.cuenta_haber ?? 0);
      if (!cuentaIngresoId) {
        throw new AccountingError(
          "CUENTA_HABER_REQUIRED",
          409,
          "La venta requiere cuenta_haber para registrar ingresos."
        );
      }

      const cuentaDebitoPrincipal = isContado
        ? cuentaBancoId
        : cuentaCxC?.id ?? null;

      if (!cuentaDebitoPrincipal) {
        throw new AccountingError(
          "CXC_ACCOUNT_NOT_FOUND",
          409,
          "No se encontró cuenta de clientes (110301) en la nomenclatura."
        );
      }

      lines.push({
        cuenta_id: Number(cuentaDebitoPrincipal),
        debe: total,
        haber: 0,
      });
      lines.push({ cuenta_id: cuentaIngresoId, debe: 0, haber: round2(base + extras) });

      if (iva > 0) {
        if (!cuentaIvaDebito?.id) {
          throw new AccountingError(
            "IVA_DEBITO_ACCOUNT_NOT_FOUND",
            409,
            "No se encontró cuenta IVA débito fiscal (210201)."
          );
        }
        lines.push({ cuenta_id: cuentaIvaDebito.id, debe: 0, haber: iva });
      }
    } else {
      const cuentaGastoId = Number(documento.cuenta_debe ?? 0);
      if (!cuentaGastoId) {
        throw new AccountingError(
          "CUENTA_DEBE_REQUIRED",
          409,
          "La compra requiere cuenta_debe para gasto/inventario."
        );
      }

      const cuentaCreditoPrincipal = isContado
        ? cuentaBancoId
        : cuentaCxP?.id ?? null;

      if (!cuentaCreditoPrincipal) {
        throw new AccountingError(
          "CXP_ACCOUNT_NOT_FOUND",
          409,
          "No se encontró cuenta de proveedores (210101) en la nomenclatura."
        );
      }

      lines.push({ cuenta_id: cuentaGastoId, debe: round2(base + extras), haber: 0 });

      if (iva > 0) {
        if (!cuentaIvaCredito?.id) {
          throw new AccountingError(
            "IVA_CREDITO_ACCOUNT_NOT_FOUND",
            409,
            "No se encontró cuenta IVA crédito fiscal (110401)."
          );
        }
        lines.push({ cuenta_id: cuentaIvaCredito.id, debe: iva, haber: 0 });
      }

      lines.push({
        cuenta_id: Number(cuentaCreditoPrincipal),
        debe: 0,
        haber: total,
      });
    }

    const totalDebe = round2(lines.reduce((acc, l) => acc + l.debe, 0));
    const totalHaber = round2(lines.reduce((acc, l) => acc + l.haber, 0));
    const diff = round2(totalDebe - totalHaber);

    if (diff !== 0) {
      const adjLine = lines.find((l) => l.debe > 0) ?? lines[0];
      if (!adjLine) {
        throw new AccountingError(
          "PARTIDAS_EMPTY",
          409,
          "No se pudieron generar partidas para el documento."
        );
      }

      if (diff > 0) {
        adjLine.haber = round2(adjLine.haber + diff);
      } else {
        adjLine.debe = round2(adjLine.debe + Math.abs(diff));
      }
    }

    const correlativoAgg = await tx.asientoContable.aggregate({
      where: { empresa_id: empresaId },
      _max: { correlativo: true },
    });

    const correlativo = (correlativoAgg._max.correlativo ?? 0) + 1;
    const tipoPoliza = isVenta ? 7 : 6;

    const asiento = await tx.asientoContable.create({
      data: {
        correlativo,
        tipo_poliza_id: tipoPoliza,
        descripcion: `[AUTO] ${isVenta ? "Venta" : "Compra"} ${documento.tipo_dte} ${
          documento.serie
        }-${documento.numero_dte}`,
        referencia: documento.identificador_unico || documento.uuid,
        fecha: fechaTrabajo,
        estado: 1,
        empresa_id: empresaId,
      },
      select: { id: true },
    });

    await tx.partida.createMany({
      data: lines.map((line) => ({
        uuid: randomUUID(),
        monto_debe: line.debe,
        monto_haber: line.haber,
        referencia: documento.identificador_unico || documento.uuid,
        cuenta_id: line.cuenta_id,
        empresa_id: empresaId,
        asiento_contable_id: asiento.id,
      })),
    });

    await tx.documento.update({
      where: { uuid: documento.uuid },
      data: {
        asiento_contable_id: asiento.id,
        condicion_pago: condicionPago,
      },
    });

    let movimientoId: number | null = null;

    if (isContado && documento.cuenta_bancaria_id) {
      const movimiento = await tx.movimientoCuentaBancaria.create({
        data: {
          cuenta_bancaria_id: documento.cuenta_bancaria_id,
          asiento_contable_id: asiento.id,
          documento_uuid: documento.uuid,
          fecha: fechaTrabajo,
          descripcion: `[AUTO] ${isVenta ? "Cobro" : "Pago"} por documento ${
            documento.serie
          }-${documento.numero_dte}`,
          tipo_movimiento: isVenta ? "debito" : "credito",
          monto: total,
          referencia: documento.identificador_unico || documento.uuid,
          estado: 1,
          estado_conciliacion: "PENDIENTE",
        },
        select: { id: true },
      });

      movimientoId = movimiento.id;
    }

    await tx.bitacora.create({
      data: {
        usuario_id: userId,
        tipo_accion: "POST_DOCUMENTO",
        descripcion_accion: `Documento ${documento.uuid} contabilizado automáticamente`,
        tabla_afectada: "documentos",
        registro_afectado_id: asiento.id,
        detalles_modificacion: JSON.stringify({
          documento_uuid: documento.uuid,
          empresa_id: empresaId,
          asiento_id: asiento.id,
          movimiento_id: movimientoId,
          accounting_mode: accountingMode,
          condicion_pago: condicionPago,
        }),
      },
    });

    return {
      asientoId: asiento.id,
      movimientoId,
      accountingMode,
      condicionPago,
    };
  });
}
