// src/app/api/documentos/rectificacion/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ============================================================
   FUNCIÓN — NORMALIZAR MES (OPCIONAL)
   ============================================================ */
function normalizarFechaMes(fechaInput: any): Date {
  if (!fechaInput) {
    throw new Error("Formato de fecha inválido recibido.");
  }

  let year: number | null = null;
  let month: number | null = null;

  // Caso: viene Date válido
  if (fechaInput instanceof Date && !isNaN(fechaInput.getTime())) {
    year = fechaInput.getUTCFullYear();
    month = fechaInput.getUTCMonth() + 1;
  }

  // Caso: "YYYY-MM"
  if (typeof fechaInput === "string" && /^\d{4}-\d{2}$/.test(fechaInput)) {
    const [y, m] = fechaInput.split("-");
    year = Number(y);
    month = Number(m);
  }

  // Caso: "YYYY-MM-DD"
  if (typeof fechaInput === "string" && /^\d{4}-\d{2}-\d{2}/.test(fechaInput)) {
    const d = new Date(fechaInput);
    if (!isNaN(d.getTime())) {
      year = d.getUTCFullYear();
      month = d.getUTCMonth() + 1;
    }
  }

  // Caso: cualquier otra fecha
  if (year === null || month === null) {
    const d = new Date(fechaInput);
    if (!isNaN(d.getTime())) {
      year = d.getUTCFullYear();
      month = d.getUTCMonth() + 1;
    }
  }

  if (year === null || month === null) {
    throw new Error("Formato de fecha inválido recibido.");
  }

  // Generamos fecha UTC (primer día del mes)
  return new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
}

/* ============================================================
   PUT: RECTIFICACIÓN ESTILO CONTA COX
   - Solo toca fecha_trabajo (NO fecha_emision)
   - Actualiza cuentas y estados
   ============================================================ */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      facturas,
      empresa_id,
      fecha_trabajo,
      cuenta_debe,
      cuenta_haber,
      cuenta_debe2,
      cuenta_haber2,
      deleted,
    } = body;

    if (!empresa_id) throw new Error("empresa_id faltante.");
    if (!Array.isArray(facturas) || facturas.length === 0) {
      throw new Error("Debe enviar facturas.");
    }

    const empresaId = Number(empresa_id);
    if (!empresaId || Number.isNaN(empresaId)) {
      throw new Error("empresa_id inválido.");
    }

    // Fecha NUEVA (opcional) → SOLO para fecha_trabajo / asientos / movimientos
    let fechaNueva: Date | null = null;
    if (fecha_trabajo) {
      fechaNueva = normalizarFechaMes(fecha_trabajo);
    }

    // Identificadores únicos de las facturas
    const ids: string[] = facturas
      .map((f: any) => f.identificador_unico)
      .filter(Boolean);

    if (!ids.length) {
      throw new Error("Facturas sin identificador_unico.");
    }

    /* ============================================================
       DOCUMENTOS
       ============================================================ */
    const dataDoc: any = {};

    // 👉 SOLO fecha_trabajo (NO tocamos fecha_emision)
    if (fechaNueva) {
      dataDoc.fecha_trabajo = fechaNueva;
    }

    if (typeof deleted === "boolean") {
      dataDoc.estado = deleted ? 0 : 1;
      if (deleted) {
        // Si quieres replicar el comentario de Conta Cox
        dataDoc.comentario = "Doc eliminado desde rectificación";
      }
    }

    if (cuenta_debe) dataDoc.cuenta_debe = Number(cuenta_debe);
    if (cuenta_haber) dataDoc.cuenta_haber = Number(cuenta_haber);
    if (cuenta_debe2) dataDoc.cuenta_debe2 = Number(cuenta_debe2);
    if (cuenta_haber2) dataDoc.cuenta_haber2 = Number(cuenta_haber2);

    if (Object.keys(dataDoc).length === 0) {
      throw new Error("No se proporcionaron campos a actualizar en documentos.");
    }

    await prisma.documento.updateMany({
      where: {
        empresa_id: empresaId,
        identificador_unico: { in: ids },
      },
      data: dataDoc,
    });

    /* ============================================================
       PARTIDAS
       ============================================================ */
    const partidas = await prisma.partida.findMany({
      where: { empresa_id: empresaId, referencia: { in: ids } },
    });

    for (const p of partidas) {
      let nuevaCuentaId = p.cuenta_id;

      const debe = Number(p.monto_debe);
      const haber = Number(p.monto_haber);

      // Lógica similar a GNIO original: reasignar según debe/haber
      if (debe > 0) {
        // prioridad: cuenta_debe2 > cuenta_debe
        if (cuenta_debe2) nuevaCuentaId = Number(cuenta_debe2);
        else if (cuenta_debe) nuevaCuentaId = Number(cuenta_debe);
      }

      if (haber > 0) {
        // prioridad: cuenta_haber2 > cuenta_haber
        if (cuenta_haber2) nuevaCuentaId = Number(cuenta_haber2);
        else if (cuenta_haber) nuevaCuentaId = Number(cuenta_haber);
      }

      if (nuevaCuentaId !== p.cuenta_id) {
        await prisma.partida.update({
          where: { uuid: p.uuid },
          data: { cuenta_id: nuevaCuentaId },
        });
      }
    }

    /* ============================================================
       ASIENTOS CONTABLES
       - Igual que Conta Cox:
         * si hay fecha → actualiza fecha
         * si deleted → pone estado = 0
       ============================================================ */
    const asientos = await prisma.asientoContable.findMany({
      where: { empresa_id: empresaId, referencia: { in: ids } },
    });

    for (const a of asientos) {
      const dataAsiento: any = {};

      if (fechaNueva) {
        dataAsiento.fecha = fechaNueva;
      }

      if (typeof deleted === "boolean") {
        dataAsiento.estado = deleted ? 0 : 1;
      }

      if (Object.keys(dataAsiento).length > 0) {
        await prisma.asientoContable.update({
          where: { id: a.id },
          data: dataAsiento,
        });
      }
    }

    /* ============================================================
       MOVIMIENTOS BANCARIOS
       - Misma idea que asientos:
         * fecha solo si mandas fecha
         * estado solo si deleted
       ============================================================ */
    const movs = await prisma.movimientoCuentaBancaria.findMany({
      where: { referencia: { in: ids } },
    });

    for (const m of movs) {
      const dataMov: any = {};

      if (fechaNueva) {
        dataMov.fecha = fechaNueva;
      }

      if (typeof deleted === "boolean") {
        dataMov.estado = deleted ? 0 : 1;
      }

      if (Object.keys(dataMov).length > 0) {
        await prisma.movimientoCuentaBancaria.update({
          where: { id: m.id },
          data: dataMov,
        });
      }
    }

    return NextResponse.json(
      {
        status: 200,
        message: "Rectificación realizada correctamente (estilo Conta Cox).",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ ERROR RECTIFICACIÓN GNIO:", err);
    return NextResponse.json(
      { status: 400, message: err.message || "Error al rectificar documentos." },
      { status: 400 }
    );
  }
}
