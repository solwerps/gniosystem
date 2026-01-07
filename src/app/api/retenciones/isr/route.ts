// src/app/api/retenciones/isr/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const empresaIdParam = searchParams.get("empresa_id");
    const fechaParam = searchParams.get("fecha");

    // ==========================
    // VALIDAR empresa_id
    // ==========================
    const empresa_id = empresaIdParam ? Number(empresaIdParam) : null;

    if (!empresa_id || isNaN(empresa_id)) {
      return NextResponse.json({
        status: 400,
        message: "empresa_id es requerido y debe ser numérico",
      });
    }

    // ==========================
    // MANEJO DE FECHA (YYYY-MM)
    // ==========================
    let fecha = fechaParam;

    if (!fecha || fecha === "null") {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      fecha = `${y}-${m}`;
    }

    const [year, month] = fecha.split("-");

    // Primer día del mes
    const startDate = new Date(`${year}-${month}-01T00:00:00`);

    // Primer día del mes siguiente
    let nextY = Number(year);
    let nextM = Number(month);

    if (nextM === 12) {
      nextM = 1;
      nextY++;
    } else {
      nextM++;
    }

    const endDate = new Date(`${nextY}-${String(nextM).padStart(2, "0")}-01T00:00:00`);

    // ==========================
    // CONSULTA GNIO CON PRISMA
    // ==========================
    const retenciones = await prisma.retencionIsr.findMany({
      where: {
        empresa_id,
        fecha_trabajo: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        fecha_trabajo: "asc",
      },
    });

    return NextResponse.json({
      status: 200,
      data: retenciones,
      message: "Retenciones ISR obtenidas correctamente",
    });
  } catch (error: any) {
    console.error("ERROR GET RETENCIONES ISR:", error);

    return NextResponse.json({
      status: 400,
      message: error.message || "Ocurrió un error al obtener retenciones ISR",
    });
  }
}
