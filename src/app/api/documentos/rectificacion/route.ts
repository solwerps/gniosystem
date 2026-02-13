import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";
import { assertPeriodOpen } from "@/lib/accounting/periods";

function normalizarFechaMes(fechaInput: unknown): Date {
  if (!fechaInput) {
    throw new AccountingError("BAD_DATE", 400, "Formato de fecha inválido.");
  }

  let year: number | null = null;
  let month: number | null = null;

  if (fechaInput instanceof Date && !Number.isNaN(fechaInput.getTime())) {
    year = fechaInput.getUTCFullYear();
    month = fechaInput.getUTCMonth() + 1;
  }

  if (typeof fechaInput === "string" && /^\d{4}-\d{2}$/.test(fechaInput)) {
    const [y, m] = fechaInput.split("-");
    year = Number(y);
    month = Number(m);
  }

  if (typeof fechaInput === "string" && /^\d{4}-\d{2}-\d{2}/.test(fechaInput)) {
    const d = new Date(fechaInput);
    if (!Number.isNaN(d.getTime())) {
      year = d.getUTCFullYear();
      month = d.getUTCMonth() + 1;
    }
  }

  if (year === null || month === null) {
    const d = new Date(String(fechaInput));
    if (!Number.isNaN(d.getTime())) {
      year = d.getUTCFullYear();
      month = d.getUTCMonth() + 1;
    }
  }

  if (year === null || month === null || month < 1 || month > 12) {
    throw new AccountingError("BAD_DATE", 400, "Formato de fecha inválido.");
  }

  return new Date(Date.UTC(year, month - 1, 1));
}

const toNullableInt = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!n || Number.isNaN(n)) {
    throw new AccountingError("BAD_ACCOUNT", 400, "Cuenta inválida.");
  }
  return Math.trunc(n);
};

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({} as any));

    const tenantSlug = String(body?.tenant ?? tenantSlugFromRequest(request) ?? "");
    const empresaId = Number(body?.empresa_id ?? empresaIdFromRequest(request));

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    const facturas = Array.isArray(body?.facturas) ? body.facturas : [];
    if (!facturas.length) {
      throw new AccountingError("FACTURAS_REQUIRED", 400, "Debe enviar facturas.");
    }

    const identificadores = Array.from(
      new Set(
        facturas
          .map((f: any) => String(f?.identificador_unico ?? "").trim())
          .filter(Boolean)
      )
    );

    const uuids = Array.from(
      new Set(
        facturas
          .map((f: any) => String(f?.uuid ?? "").trim())
          .filter(Boolean)
      )
    );

    if (!identificadores.length && !uuids.length) {
      throw new AccountingError(
        "DOCUMENT_KEYS_REQUIRED",
        400,
        "Cada factura debe incluir identificador_unico o uuid."
      );
    }

    const fechaNueva = body?.fecha_trabajo
      ? normalizarFechaMes(body.fecha_trabajo)
      : null;
    const deleted =
      typeof body?.deleted === "boolean" ? Boolean(body.deleted) : undefined;

    const cuentaDebe = toNullableInt(body?.cuenta_debe);
    const cuentaHaber = toNullableInt(body?.cuenta_haber);
    const cuentaDebe2 = toNullableInt(body?.cuenta_debe2);
    const cuentaHaber2 = toNullableInt(body?.cuenta_haber2);

    if (
      !fechaNueva &&
      deleted === undefined &&
      cuentaDebe === null &&
      cuentaHaber === null &&
      cuentaDebe2 === null &&
      cuentaHaber2 === null
    ) {
      throw new AccountingError(
        "NO_CHANGES",
        400,
        "No se enviaron cambios para rectificar."
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const where: any = {
        empresa_id: auth.empresa.id,
      };

      const or: any[] = [];
      if (identificadores.length) {
        or.push({ identificador_unico: { in: identificadores } });
      }
      if (uuids.length) {
        or.push({ uuid: { in: uuids } });
      }
      if (!or.length) {
        throw new AccountingError(
          "DOCUMENT_KEYS_REQUIRED",
          400,
          "No se recibieron claves de documentos válidas."
        );
      }
      where.OR = or;

      const docs = await tx.documento.findMany({
        where,
        select: {
          uuid: true,
          identificador_unico: true,
          fecha_trabajo: true,
        },
      });

      if (!docs.length) {
        throw new AccountingError(
          "DOCUMENTS_NOT_FOUND",
          404,
          "No se encontraron documentos para rectificar en la empresa."
        );
      }

      if (identificadores.length) {
        const found = new Set(docs.map((d) => d.identificador_unico));
        const missing = identificadores.filter((x) => !found.has(x));
        if (missing.length) {
          throw new AccountingError(
            "DOCUMENTS_NOT_FOUND",
            404,
            `No se encontraron ${missing.length} documentos por identificador_unico.`
          );
        }
      }

      if (uuids.length) {
        const found = new Set(docs.map((d) => d.uuid));
        const missing = uuids.filter((x) => !found.has(x));
        if (missing.length) {
          throw new AccountingError(
            "DOCUMENTS_NOT_FOUND",
            404,
            `No se encontraron ${missing.length} documentos por uuid.`
          );
        }
      }

      for (const doc of docs) {
        await assertPeriodOpen(tx as any, auth.empresa.id, doc.fecha_trabajo);
      }

      if (fechaNueva) {
        await assertPeriodOpen(tx as any, auth.empresa.id, fechaNueva);
      }

      const targetIdentificadores = docs.map((d) => d.identificador_unico);
      const targetUuids = docs.map((d) => d.uuid);

      const dataDoc: any = {};
      if (fechaNueva) {
        dataDoc.fecha_trabajo = fechaNueva;
      }
      if (deleted !== undefined) {
        dataDoc.estado = deleted ? 0 : 1;
        dataDoc.comentario = deleted
          ? "Doc eliminado desde rectificación"
          : null;
      }
      if (cuentaDebe !== null) {
        dataDoc.cuenta_debe = cuentaDebe;
      }
      if (cuentaHaber !== null) {
        dataDoc.cuenta_haber = cuentaHaber;
      }

      if (Object.keys(dataDoc).length) {
        await tx.documento.updateMany({
          where: {
            empresa_id: auth.empresa.id,
            identificador_unico: { in: targetIdentificadores },
          },
          data: dataDoc,
        });
      }

      let partidasUpdated = 0;
      const partidas = await tx.partida.findMany({
        where: {
          empresa_id: auth.empresa.id,
          referencia: { in: targetIdentificadores },
        },
      });

      for (const partida of partidas) {
        let nuevaCuentaId = partida.cuenta_id;
        const debe = Number(partida.monto_debe);
        const haber = Number(partida.monto_haber);

        if (debe > 0) {
          if (cuentaDebe2 !== null) {
            nuevaCuentaId = cuentaDebe2;
          } else if (cuentaDebe !== null) {
            nuevaCuentaId = cuentaDebe;
          }
        }

        if (haber > 0) {
          if (cuentaHaber2 !== null) {
            nuevaCuentaId = cuentaHaber2;
          } else if (cuentaHaber !== null) {
            nuevaCuentaId = cuentaHaber;
          }
        }

        if (nuevaCuentaId !== partida.cuenta_id) {
          await tx.partida.update({
            where: { uuid: partida.uuid },
            data: { cuenta_id: nuevaCuentaId },
          });
          partidasUpdated += 1;
        }
      }

      let asientosUpdated = 0;
      const asientos = await tx.asientoContable.findMany({
        where: {
          empresa_id: auth.empresa.id,
          referencia: { in: targetIdentificadores },
        },
      });

      for (const asiento of asientos) {
        const dataAsiento: any = {};
        if (fechaNueva) {
          dataAsiento.fecha = fechaNueva;
        }
        if (deleted !== undefined) {
          dataAsiento.estado = deleted ? 0 : 1;
        }
        if (Object.keys(dataAsiento).length) {
          await tx.asientoContable.update({
            where: { id: asiento.id },
            data: dataAsiento,
          });
          asientosUpdated += 1;
        }
      }

      let movimientosUpdated = 0;
      const movs = await tx.movimientoCuentaBancaria.findMany({
        where: {
          OR: [
            { referencia: { in: targetIdentificadores } },
            { documento_uuid: { in: targetUuids } },
          ],
        },
      });

      for (const mov of movs) {
        const dataMov: any = {};
        if (fechaNueva) {
          dataMov.fecha = fechaNueva;
        }
        if (deleted !== undefined) {
          dataMov.estado = deleted ? 0 : 1;
        }
        if (Object.keys(dataMov).length) {
          await tx.movimientoCuentaBancaria.update({
            where: { id: mov.id },
            data: dataMov,
          });
          movimientosUpdated += 1;
        }
      }

      await tx.bitacora.create({
        data: {
          usuario_id: auth.session.user.id,
          tipo_accion: "RECTIFICACION_DOCUMENTOS",
          descripcion_accion: `${targetIdentificadores.length} documentos rectificados`,
          tabla_afectada: "documentos",
          registro_afectado_id: auth.empresa.id,
          detalles_modificacion: JSON.stringify({
            empresa_id: auth.empresa.id,
            documentos: targetIdentificadores,
            fecha_trabajo: fechaNueva?.toISOString() ?? null,
            deleted,
            cuenta_debe: cuentaDebe,
            cuenta_haber: cuentaHaber,
            cuenta_debe2: cuentaDebe2,
            cuenta_haber2: cuentaHaber2,
            partidas_updated: partidasUpdated,
            asientos_updated: asientosUpdated,
            movimientos_updated: movimientosUpdated,
          }),
        },
      });

      return {
        docs: targetIdentificadores.length,
        partidasUpdated,
        asientosUpdated,
        movimientosUpdated,
      };
    });

    return NextResponse.json(
      {
        status: 200,
        message: "Rectificación realizada correctamente.",
        data: result,
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

    console.error("PUT /api/documentos/rectificacion", error);
    return NextResponse.json(
      {
        status: 500,
        message: error?.message || "Error al rectificar documentos.",
      },
      { status: 500 }
    );
  }
}
