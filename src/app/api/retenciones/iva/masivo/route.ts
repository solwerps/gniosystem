import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { IUploadRetencionIVA } from "@/utils";
import { Decimal } from "@prisma/client/runtime/library";

// ===============================
// POST – MASIVO DE RETENCIONES IVA
// ===============================
export async function POST(req: Request) {
  try {
    const body: {
      retenciones: IUploadRetencionIVA[];
      empresa_id: number;
      date: string | Date;
    } = await req.json();

    const { retenciones, empresa_id, date } = body;

    // ===============================
    // VALIDACIONES
    // ===============================
    if (!empresa_id) {
      return NextResponse.json({
        status: 400,
        message: "empresa_id es requerido",
      });
    }

    if (!retenciones || retenciones.length === 0) {
      return NextResponse.json({
        status: 400,
        message: "No se enviaron retenciones",
      });
    }

    if (!date) {
      return NextResponse.json({
        status: 400,
        message: "Debe enviar una fecha de trabajo",
      });
    }

    const fechaTrabajo = new Date(date);

    // ===============================
    // OBTENER CUENTAS CONTABLES GNIO
    // ===============================
    const cuentas = await prisma.nomenclaturaCuenta.findMany({
      where: {
        nomenclatura: {
          empresasAfiliadas: {
            some: {
              empresa: {
                id: empresa_id, // ✔ RELACIÓN CORRECTA GNIO
              },
            },
          },
        },
      },
    });

    const cuentaDebe = cuentas.find((c) => c.cuenta === "110402");
    const cuentaHaber = cuentas.find((c) => c.cuenta === "210201");

    if (!cuentaDebe || !cuentaHaber) {
      return NextResponse.json({
        status: 400,
        message:
          "No existen cuentas 110402 o 210201 en la nomenclatura de esta empresa",
      });
    }

    // ===============================
    // TRANSACCIÓN PRINCIPAL
    // ===============================
    await prisma.$transaction(async (tx) => {
      // ======================================================
      // 1) INSERTAR RETENCIONES IVA MASIVAMENTE
      // ======================================================
      await tx.retencionIva.createMany({
        data: retenciones.map((r) => ({
          uuid: crypto.randomUUID(),
          empresa_id,
          fecha_trabajo: fechaTrabajo,
          fecha_emision: parseFecha(r["FECHA EMISION"]),
          nit_retenedor: r["NIT RETENEDOR"],
          nombre_retenedor: r["NOMBRE RETENEDOR"],
          estado_constancia: r["ESTADO CONSTANCIA"],
          constancia: r["CONSTANCIA"],
          total_factura: new Decimal(parseFloat(r["TOTAL FACTURA"])),
          importe_neto: new Decimal(parseFloat(r["IMPORTE NETO"])),
          afecto_retencion: new Decimal(parseFloat(r["AFECTO RETENCIÓN"])),
          total_retencion: new Decimal(parseFloat(r["TOTAL RETENCIÓN"])),
        })),
      });

      // ======================================================
      // 2) OBTENER CORRELATIVO GNIO
      // ======================================================
      const ultimoAsiento = await tx.asientoContable.findFirst({
        where: { empresa_id },
        orderBy: { correlativo: "desc" },
        select: { correlativo: true },
      });

      const correlativoBase = ultimoAsiento?.correlativo ?? 0;

      // ======================================================
      // 3) CREAR ASIENTOS Y PARTIDAS
      // ======================================================
      const asientosInsert: any[] = [];
      let partidasInsert: any[] = [];

      retenciones.forEach((ret, i) => {
        const correlativo = correlativoBase + (i + 1);
        const fechaEmision = parseFecha(ret["FECHA EMISION"]);
        const referencia = ret["CONSTANCIA"];
        const monto = parseFloat(ret["TOTAL RETENCIÓN"]);

        asientosInsert.push({
          correlativo,
          tipo_poliza_id: 10,
          descripcion: "Asiento por Retenciones IVA",
          fecha: fechaEmision,
          empresa_id,
          estado: 1,
          referencia,
        });

        partidasInsert.push(
          {
            uuid: crypto.randomUUID(),
            cuenta_id: cuentaDebe.id,
            monto_debe: new Decimal(monto),
            monto_haber: new Decimal(0),
            empresa_id,
            referencia,
          },
          {
            uuid: crypto.randomUUID(),
            cuenta_id: cuentaHaber.id,
            monto_debe: new Decimal(0),
            monto_haber: new Decimal(monto),
            empresa_id,
            referencia,
          }
        );
      });

      // ======================================================
      // 4) INSERTAR ASIENTOS
      // ======================================================
      await tx.asientoContable.createMany({ data: asientosInsert });

      // ======================================================
      // 5) OBTENER IDs REALES
      // ======================================================
      const asientosDB = await tx.asientoContable.findMany({
        where: {
          empresa_id,
          correlativo: {
            gte: correlativoBase + 1,
            lte: correlativoBase + retenciones.length,
          },
        },
        orderBy: { correlativo: "asc" },
      });

      const mapAsientos = new Map<string, number>();
      asientosDB.forEach((a) => {
        if (a.referencia) mapAsientos.set(a.referencia, a.id);
      });

      // ======================================================
      // 6) ASIGNAR LOS IDs A LAS PARTIDAS
      // ======================================================
      partidasInsert = partidasInsert.map((p) => ({
        ...p,
        asiento_contable_id: mapAsientos.get(p.referencia) ?? 0,
      }));

      // ======================================================
      // 7) INSERTAR PARTIDAS
      // ======================================================
      await tx.partida.createMany({ data: partidasInsert });
    });

    return NextResponse.json({
      status: 200,
      message: "Retenciones IVA creadas correctamente",
    });
  } catch (error: any) {
    console.error("ERROR RETENCIONES IVA:", error);
    return NextResponse.json({
      status: 400,
      message: error.message || "Error al crear retenciones IVA",
    });
  }
}

// ======================================================
// HELPERS
// ======================================================
function parseFecha(fecha: string) {
  const [d, m, y] = fecha.split("/");
  return new Date(`${y}-${m}-${d}`);
}
