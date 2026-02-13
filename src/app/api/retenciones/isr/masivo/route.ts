// src/app/api/retenciones/isr/masivo/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";
import { assertPeriodOpen } from "@/lib/accounting/periods";
import type { IUploadRetencionISR } from "@/utils";
import { Decimal } from "@prisma/client/runtime/library";

// ===============================
// POST – MASIVO DE RETENCIONES ISR
// ===============================
export async function POST(req: Request) {
  try {
    const body: {
      retenciones: IUploadRetencionISR[];
      empresa_id: number;
      date: string | Date;
    } = await req.json();

    const tenantSlug = String(body?.tenant ?? tenantSlugFromRequest(req) ?? "");
    const empresaId = Number(body?.empresa_id ?? empresaIdFromRequest(req));

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    const { retenciones, date } = body;
    const empresa_id = auth.empresa.id;

    // ===============================
    // VALIDACIONES
    // ===============================
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
    // VALIDAR NIT RETENIDO vs EMPRESA
    // ===============================
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresa_id },
      select: { nit: true, nombre: true },
    });

    if (!empresa) {
      return NextResponse.json({
        status: 400,
        message: "No se encontró la empresa para cargar las retenciones.",
      });
    }

    const empresaNit = normalizeNit(empresa.nit);

    if (!empresaNit) {
      return NextResponse.json({
        status: 400,
        message: "La empresa no tiene NIT configurado.",
      });
    }

    const missingNitRetenido = retenciones.find((r) => !getNitRetenido(r));
    if (missingNitRetenido) {
      return NextResponse.json({
        status: 400,
        message:
          "El archivo debe incluir el campo NIT RETENIDO en todas las filas.",
      });
    }

    const nitNoCoincide = retenciones.find((r) => {
      const nitRetenido = getNitRetenido(r);
      return normalizeNit(nitRetenido) !== empresaNit;
    });

    if (nitNoCoincide) {
      return NextResponse.json({
        status: 400,
        message:
          "El NIT RETENIDO no coincide con el NIT de la empresa. Revise el archivo.",
      });
    }

    // ===============================
    // VALIDAR CONSTANCIA DUPLICADA
    // ===============================
    const constancias = retenciones
      .map((r) => normalizeConstancia(r["CONSTANCIA"]))
      .filter(Boolean);

    const duplicadasEnArchivo = findDuplicates(constancias);
    if (duplicadasEnArchivo.length > 0) {
      return NextResponse.json({
        status: 400,
        message: `Constancia duplicada en el archivo: ${duplicadasEnArchivo
          .slice(0, 5)
          .join(", ")}`,
      });
    }

    if (constancias.length > 0) {
      const existentes = await prisma.retencionIsr.findMany({
        where: {
          empresa_id,
          constancia: { in: constancias },
        },
        select: { constancia: true },
      });

      if (existentes.length > 0) {
        const duplicadas = existentes
          .map((r) => r.constancia)
          .filter(Boolean);

        return NextResponse.json({
          status: 400,
          message: `La constancia ya está registrada: ${duplicadas
            .slice(0, 5)
            .join(", ")}`,
        });
      }
    }

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

    const cuentaDebe = cuentas.find((c) => c.cuenta === "110404");
    const cuentaHaber = cuentas.find((c) => c.cuenta === "210204");

    if (!cuentaDebe || !cuentaHaber) {
      return NextResponse.json({
        status: 400,
        message:
          "No existen cuentas 110404 o 210204 en la nomenclatura de esta empresa",
      });
    }

    // ===============================
    // TRANSACCIÓN PRINCIPAL
    // ===============================
    await prisma.$transaction(async (tx) => {
      await assertPeriodOpen(tx, empresa_id, fechaTrabajo);

      // ======================================================
      // 1) INSERTAR RETENCIONES MASIVAMENTE
      // ======================================================
      await tx.retencionIsr.createMany({
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
          renta_imponible: new Decimal(parseFloat(r["RENTA IMPONIBLE"])),
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

      const correlativoBase = ultimoAsiento?.correlativo ?? 0; // ✔ prefer-const ok

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
          tipo_poliza_id: 11,
          descripcion: "Asiento por Retenciones ISR",
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
      message: "Retenciones ISR creadas correctamente",
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

    console.error("ERROR RETENCIONES ISR:", error);
    return NextResponse.json({
      status: 400,
      message: error.message || "Error al crear retenciones ISR",
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

function normalizeNit(value: string) {
  return String(value ?? "")
    .trim()
    .replace(/[-\s]/g, "")
    .toUpperCase();
}

function getNitRetenido(row: IUploadRetencionISR) {
  const raw =
    (row as any)["NIT RETENIDO"] ??
    (row as any)["NIT RETENIDO:"] ??
    "";
  return String(raw ?? "").trim();
}

function normalizeConstancia(value: string) {
  return String(value ?? "").trim();
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    const key = value.trim();
    if (!key) return;
    if (seen.has(key)) {
      duplicates.add(key);
    } else {
      seen.add(key);
    }
  });

  return Array.from(duplicates);
}
