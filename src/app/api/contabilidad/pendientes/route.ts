import { NextResponse } from "next/server";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";
import prisma from "@/lib/prisma";

const toNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

const round2 = (n: number) => Number(n.toFixed(2));

type PendienteRow = {
  documento_uuid: string;
  serie: string;
  numero_dte: string;
  fecha_emision: Date;
  tercero: string;
  total: number;
  aplicado: number;
  pendiente: number;
};

export async function GET(req: Request) {
  try {
    const tenantSlug = tenantSlugFromRequest(req);
    const empresaId = empresaIdFromRequest(req);

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    const [docsCxc, docsCxp] = await Promise.all([
      prisma.documento.findMany({
        where: {
          empresa_id: auth.empresa.id,
          estado: 1,
          tipo_operacion: "venta",
          condicion_pago: "CREDITO",
          asiento_contable_id: { not: null },
        },
        select: {
          uuid: true,
          serie: true,
          numero_dte: true,
          fecha_emision: true,
          nombre_receptor: true,
          monto_total: true,
        },
      }),
      prisma.documento.findMany({
        where: {
          empresa_id: auth.empresa.id,
          estado: 1,
          tipo_operacion: "compra",
          condicion_pago: "CREDITO",
          asiento_contable_id: { not: null },
        },
        select: {
          uuid: true,
          serie: true,
          numero_dte: true,
          fecha_emision: true,
          nombre_emisor: true,
          monto_total: true,
        },
      }),
    ]);

    const uuids = [...docsCxc.map((d) => d.uuid), ...docsCxp.map((d) => d.uuid)];

    const aplicaciones = uuids.length
      ? await prisma.aplicacionPagoDocumento.findMany({
          where: {
            documento_uuid: { in: uuids },
          },
          select: {
            documento_uuid: true,
            monto_aplicado: true,
            pago_id: true,
            cobro_id: true,
          },
        })
      : [];

    const aplicCxc = new Map<string, number>();
    const aplicCxp = new Map<string, number>();

    for (const ap of aplicaciones) {
      const amount = toNumber(ap.monto_aplicado);
      if (ap.cobro_id) {
        aplicCxc.set(ap.documento_uuid, round2((aplicCxc.get(ap.documento_uuid) ?? 0) + amount));
      }
      if (ap.pago_id) {
        aplicCxp.set(ap.documento_uuid, round2((aplicCxp.get(ap.documento_uuid) ?? 0) + amount));
      }
    }

    const cxc: PendienteRow[] = docsCxc
      .map((doc) => {
        const total = round2(toNumber(doc.monto_total));
        const aplicado = round2(aplicCxc.get(doc.uuid) ?? 0);
        const pendiente = round2(total - aplicado);
        return {
          documento_uuid: doc.uuid,
          serie: doc.serie,
          numero_dte: doc.numero_dte,
          fecha_emision: doc.fecha_emision,
          tercero: doc.nombre_receptor,
          total,
          aplicado,
          pendiente,
        };
      })
      .filter((row) => row.pendiente > 0);

    const cxp: PendienteRow[] = docsCxp
      .map((doc) => {
        const total = round2(toNumber(doc.monto_total));
        const aplicado = round2(aplicCxp.get(doc.uuid) ?? 0);
        const pendiente = round2(total - aplicado);
        return {
          documento_uuid: doc.uuid,
          serie: doc.serie,
          numero_dte: doc.numero_dte,
          fecha_emision: doc.fecha_emision,
          tercero: doc.nombre_emisor,
          total,
          aplicado,
          pendiente,
        };
      })
      .filter((row) => row.pendiente > 0);

    return NextResponse.json(
      {
        status: 200,
        message: "Pendientes CxC/CxP obtenidos correctamente.",
        data: {
          cxc,
          cxp,
          totales: {
            cxc: round2(cxc.reduce((acc, row) => acc + row.pendiente, 0)),
            cxp: round2(cxp.reduce((acc, row) => acc + row.pendiente, 0)),
          },
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

    console.error("GET /api/contabilidad/pendientes", error);
    return NextResponse.json(
      {
        status: 500,
        message: "Error interno al obtener pendientes.",
      },
      { status: 500 }
    );
  }
}
