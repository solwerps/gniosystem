// src/app/api/folios/route.ts
import { prisma } from "@/lib/prisma";
import {
  AccountingError,
  requireAccountingAccess,
  tenantSlugFromRequest,
  empresaIdFromRequest,
} from "@/lib/accounting/context";
import type { IFolioBody } from "@/utils";
import moment from "moment-timezone";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const nit = searchParams.get("nit") ?? "0";
    const tenantSlug = tenantSlugFromRequest(request);
    const empresaId = empresaIdFromRequest(request);

    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    if (nit && nit !== "0" && nit !== auth.empresa.nit) {
      return Response.json({
        status: 403,
        data: [],
        message: "El NIT no pertenece a la empresa autorizada.",
      });
    }

    // ✅ Validar empresa por NIT y estado = 1
    const empresa = await prisma.empresa.findFirst({
      where: {
        id: auth.empresa.id,
        nit: auth.empresa.nit,
        estado: 1,
      },
    });

    if (!empresa) {
      return Response.json({
        status: 400,
        data: { nit },
        message: "No existe una empresa con ese nit",
      });
    }

    // ✅ Obtener todos los folios de esa empresa (igual al SQL original)
    const folios = await prisma.folio.findMany({
      where: {
        empresa_id: empresa.id,
      },
      include: {
        empresa: true,
        libro_contable: true,
      },
    });

    const data = folios.map((f) => ({
      folio_id: f.id,
      libro_contable_id: f.libro_contable_id,
      nombre_libro: f.libro_contable.nombre_libro,
      folios_disponibles: f.folios_disponibles,
      contador_folios: f.contador_folios,
      fecha_habilitacion: f.fecha_habilitacion,
      empresa_id: f.empresa_id,
    }));

    return Response.json({
      status: 200,
      data,
      message: "Folios obtenidos correctamente",
    });
  } catch (error: any) {
    if (error instanceof AccountingError) {
      return Response.json(
        {
          status: error.status,
          code: error.code,
          data: [],
          message: error.message,
        },
        { status: error.status }
      );
    }

    console.log(error);
    return Response.json({
      status: 400,
      data: {},
      message: error?.message ?? "Error al obtener folios",
    });
  }
}

export async function POST(request: Request) {
  try {
    const body: IFolioBody = await request.json();
    const tenantSlug = String(body?.tenant ?? tenantSlugFromRequest(request) ?? "");
    const empresaId = Number(body?.empresa_id ?? empresaIdFromRequest(request));
    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    if (!body.empresa_id) {
      throw new Error("La empresa es requerida");
    }
    if (Number(body.empresa_id) !== auth.empresa.id) {
      return Response.json(
        {
          status: 403,
          data: { empresa_id: body.empresa_id },
          message: "La empresa indicada no coincide con la empresa autorizada",
        },
        { status: 403 }
      );
    }

    // ✅ Validar empresa activa
    const empresa = await prisma.empresa.findFirst({
      where: {
        id: auth.empresa.id,
        estado: 1,
      },
    });

    if (!empresa) {
      return Response.json({
        status: 400,
        data: { nit: body.empresa_id },
        message: "No existe una empresa con ese ID",
      });
    }

    // ✅ Validar folio
    const folio = await prisma.folio.findUnique({
      where: {
        id: body.folio_id,
      },
    });

    if (!folio) {
      return Response.json({
        status: 400,
        data: { folio_id: body.folio_id },
        message: "No existe un folio con ese ID",
      });
    }

    // Opcionalmente reforzamos que el folio pertenece a la empresa indicada
    if (folio.empresa_id !== body.empresa_id) {
      return Response.json({
        status: 400,
        data: {
          folio_id: body.folio_id,
          empresa_id: body.empresa_id,
        },
        message: "El folio no pertenece a la empresa indicada",
      });
    }

    // 🔢 Calculamos los nuevos folios disponibles
    const folios_disponibles =
      folio.folios_disponibles + body.folios_por_habilitar;

    const fechaHabilitacionStr = moment
      .tz("America/Guatemala")
      .format("YYYY-MM-DD");
    const fecha_habilitacion = new Date(fechaHabilitacionStr);

    const updated = await prisma.folio.update({
      where: {
        id: body.folio_id,
      },
      data: {
        folios_disponibles,
        fecha_habilitacion,
      },
    });

    return Response.json({
      status: 200,
      data: updated,
      message: "Folios obtenidos correctamente",
    });
  } catch (error: any) {
    if (error instanceof AccountingError) {
      return Response.json(
        {
          status: error.status,
          code: error.code,
          data: {},
          message: error.message,
        },
        { status: error.status }
      );
    }

    console.log(error);
    return Response.json({
      status: 400,
      data: {},
      message: error?.message ?? "Error al actualizar folios",
    });
  }
}

export async function PUT(request: Request) {
  try {
    const body: IFolioBody = await request.json();
    const tenantSlug = String(body?.tenant ?? tenantSlugFromRequest(request) ?? "");
    const empresaId = Number(body?.empresa_id ?? empresaIdFromRequest(request));
    const auth = await requireAccountingAccess({
      tenantSlug,
      empresaId,
    });

    if (!body.empresa_id) {
      throw new Error("La empresa es requerida");
    }
    if (Number(body.empresa_id) !== auth.empresa.id) {
      return Response.json(
        {
          status: 403,
          data: { empresa_id: body.empresa_id },
          message: "La empresa indicada no coincide con la empresa autorizada",
        },
        { status: 403 }
      );
    }

    // ✅ Validar empresa activa
    const empresa = await prisma.empresa.findFirst({
      where: {
        id: auth.empresa.id,
        estado: 1,
      },
    });

    if (!empresa) {
      return Response.json({
        status: 400,
        data: { nit: body.empresa_id },
        message: "No existe una empresa con ese ID",
      });
    }

    // ✅ Validar folio
    const folio = await prisma.folio.findUnique({
      where: {
        id: body.folio_id,
      },
    });

    if (!folio) {
      return Response.json({
        status: 400,
        data: { folio_id: body.folio_id },
        message: "No existe un folio con ese ID",
      });
    }

    if (folio.empresa_id !== body.empresa_id) {
      return Response.json({
        status: 400,
        data: {
          folio_id: body.folio_id,
          empresa_id: body.empresa_id,
        },
        message: "El folio no pertenece a la empresa indicada",
      });
    }

    const fechaHabilitacionStr = moment
      .tz("America/Guatemala")
      .format("YYYY-MM-DD");
    const fecha_habilitacion = new Date(fechaHabilitacionStr);

    const updated = await prisma.folio.update({
      where: {
        id: body.folio_id,
      },
      data: {
        contador_folios: 0,
        fecha_habilitacion,
      },
    });

    return Response.json({
      status: 200,
      data: updated,
      message: "Folios obtenidos correctamente",
    });
  } catch (error: any) {
    if (error instanceof AccountingError) {
      return Response.json(
        {
          status: error.status,
          code: error.code,
          data: {},
          message: error.message,
        },
        { status: error.status }
      );
    }

    console.log(error);
    return Response.json({
      status: 400,
      data: {},
      message: error?.message ?? "Error al reiniciar el contador de folios",
    });
  }
}
