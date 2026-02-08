import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const parseBoolean = (value: string | null) => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "si";
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = Number(searchParams.get("id"));
    const select = parseBoolean(searchParams.get("select"));

    if (!empresaId || Number.isNaN(empresaId)) {
      return NextResponse.json(
        {
          status: 400,
          data: [],
          message: "Parámetro 'id' inválido o ausente.",
        },
        { status: 400 }
      );
    }

    const cuentas = await prisma.cuentaBancaria.findMany({
      where: { empresaId },
      orderBy: [{ banco: "asc" }, { numero: "asc" }],
      select: {
        id: true,
        empresaId: true,
        numero: true,
        banco: true,
        descripcion: true,
        moneda: true,
        saldoInicial: true,
        cuentaContableId: true,
      },
    });

    if (select) {
      const options = cuentas.map((cuenta) => ({
        value: cuenta.id,
        label: `${cuenta.numero} - ${cuenta.banco}${
          cuenta.descripcion ? ` (${cuenta.descripcion})` : ""
        }`,
      }));

      return NextResponse.json(
        {
          status: 200,
          data: options,
          message: "Cuentas bancarias obtenidas correctamente.",
        },
        { status: 200 }
      );
    }

    const data = cuentas.map((cuenta) => ({
      id: cuenta.id,
      empresaId: cuenta.empresaId,
      numero: cuenta.numero,
      banco: cuenta.banco,
      descripcion: cuenta.descripcion ?? "",
      moneda: cuenta.moneda,
      saldoInicial: Number(cuenta.saldoInicial),
      cuentaContableId: cuenta.cuentaContableId,
    }));

    return NextResponse.json(
      {
        status: 200,
        data,
        message: "Cuentas bancarias obtenidas correctamente.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/cuentasBancarias/id:", error);
    return NextResponse.json(
      {
        status: 500,
        data: [],
        message: "Error interno al obtener cuentas bancarias.",
      },
      { status: 500 }
    );
  }
}
