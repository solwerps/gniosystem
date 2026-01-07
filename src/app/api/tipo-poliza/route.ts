// src/app/api/tipo-poliza/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type TipoPolizaApi = {
  id: number;
  nombre: string;
};

type ApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

export async function GET() {
  try {
    // Si tu modelo en Prisma se llama TipoPoliza o parecido,
    // ajústalo aquí (tipoPoliza, tipo_poliza, etc.).
    const rows = await prisma.tipoPoliza.findMany({
      where: { estado: 1 },
      orderBy: { id: "asc" },
    });

    const data: TipoPolizaApi[] = rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
    }));

    const body: ApiResponse<TipoPolizaApi[]> = {
      status: 200,
      message: "OK",
      data,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error("Error en GET /api/tipo-poliza", error);

    const body: ApiResponse<TipoPolizaApi[]> = {
      status: 500,
      message: "Error al obtener tipos de póliza",
      data: [],
    };

    return NextResponse.json(body, { status: 500 });
  }
}
