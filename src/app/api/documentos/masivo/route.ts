// src/app/api/documentos/masivo/route.ts
import moment from "moment";
import { XMLParser } from "fast-xml-parser";
import { v4 as uuid } from "uuid";

import { prisma } from "@/lib/prisma";
import type { Cuenta } from "@/utils/models/nomenclaturas";
import type {
  IDocUpload,
  IFactura,
  TipoDTE,
} from "@/utils/models/documentos";
import { divisas } from "@/utils/data/divisas";

import {
  getCuentasByEmpresa,
  partidaDebeHandler,
  partidaDescuentoHandler,
  partidaHaberHandler,
  partidaIvaHandler,
  updateCorrelativo,
  toNumber,
} from "./utils";

const parser = new XMLParser();

/** 🔢 Sanitiza cualquier cosa a string decimal "0.00" */
const decimalOrZero = (value: any): string => {
  if (value === null || value === undefined) return "0.00";

  if (typeof value === "number") {
    if (Number.isNaN(value)) return "0.00";
    return value.toFixed(2);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "0.00";
    const normalized = trimmed.replace(",", ".");
    const n = parseFloat(normalized);
    if (Number.isNaN(n)) return "0.00";
    return n.toFixed(2);
  }

  const n = Number(value);
  if (Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
};

type Asiento = {
  identificador_unico: string;
  tipo_operacion: "venta" | "compra";
  tipo_dte: TipoDTE;
  tipo: string;
  fecha: string; // YYYY-MM-DD
  empresa_id: number;
  estado?: string | null; // fecha_anulacion si está anulada
};

type PartidaGenerada = {
  cuenta: number | null | undefined; // NomenclaturaCuenta.id
  monto_debe: string | number;
  monto_haber: string | number;
  identificador_unico: string;
  validacion?: boolean;
};

export async function POST(request: Request) {
  try {
    const body: {
      documentos: IDocUpload[];
      operacion_tipo: "venta" | "compra";
      empresa_id: number;
      date: string;
    } = await request.json();

    if (!body.documentos || body.documentos.length === 0) {
      throw new Error("No se proporcionaron documentos.");
    }
    if (!body.operacion_tipo) {
      throw new Error(
        "El tipo de operación para los documentos es requerido."
      );
    }
    if (!body.empresa_id) {
      throw new Error("La empresa es requerida.");
    }
    if (!body.date) {
      throw new Error("La fecha de trabajo es requerida.");
    }

    const formatDate = (date: string | undefined | null) => {
      if (!date) return null;
      const parsedDate = moment(date, moment.ISO_8601, true);
      if (!parsedDate.isValid()) return null;
      return parsedDate.format("YYYY-MM-DD");
    };

    const formattedDate = new Date(body.date)
      .toISOString()
      .split("T")[0]; // YYYY-MM-DD

    // =========================================================
    // 🛑 VALIDACIÓN 1: MES DE FECHA DE EMISIÓN VS "Selecciona la fecha"
    // =========================================================
    const selectedMoment = moment(formattedDate, "YYYY-MM-DD");
    const selectedMonth = selectedMoment.month(); // 0-11
    const selectedYear = selectedMoment.year();

    const badMonthDocs: string[] = [];

    for (const rawDoc of body.documentos as any[]) {
      const rawFechaEmision = rawDoc.fecha_emision;
      const normalized = formatDate(rawFechaEmision);

      if (!normalized) {
        // No se pudo interpretar la fecha_emision → la consideramos inválida para el control
        const serie =
          rawDoc.serie ??
          rawDoc["Serie"] ??
          "";
        const numero =
          rawDoc.numero_dte ??
          rawDoc["Número del DTE"] ??
          "";
        badMonthDocs.push(`${serie}-${numero}`);
        continue;
      }

      const em = moment(normalized, "YYYY-MM-DD");
      if (!em.isValid() || em.month() !== selectedMonth || em.year() !== selectedYear) {
        const serie =
          rawDoc.serie ??
          rawDoc["Serie"] ??
          "";
        const numero =
          rawDoc.numero_dte ??
          rawDoc["Número del DTE"] ??
          "";
        badMonthDocs.push(`${serie}-${numero}`);
      }
    }

    if (badMonthDocs.length > 0) {
      return Response.json({
        status: 400,
        data: { facturas: badMonthDocs },
        message:
          'LAS FACTURAS NO SON DEL MES SELECCIONADO EN EL CAMPO "Selecciona la fecha". CORREGIR EL MES.',
      });
    }

    // 1️⃣ Obtener catálogo de cuentas de la empresa (NomenclaturaCuenta)
    const cuentas: Cuenta[] = await getCuentasByEmpresa(body.empresa_id);

    const partidas: PartidaGenerada[] = [];
    const asientos: Asiento[] = [];
    const facturasConMonedaDistinta: any[] = [];
    const documentosData: any[] = [];

    // 2️⃣ Preparar documentos, asientos y partidas
    for (const rawDoc of body.documentos as any[]) {
      const documento = { ...rawDoc };

      const identificador_unico = `${documento.serie}-${documento.numero_dte}-${documento.numero_autorizacion}-${body.empresa_id}-${body.operacion_tipo}`;

      documento.fecha_trabajo = formattedDate;
      documento.identificador_unico = identificador_unico;

      // Partidas contables (DEBE / HABER / IVA / descuentos)
      const partidasGeneradas = generatePartidas(
        documento as IFactura,
        body.operacion_tipo,
        cuentas
      );
      partidas.push(...partidasGeneradas);

      // Asiento contable asociado al documento
      asientos.push({
        identificador_unico,
        tipo_operacion: body.operacion_tipo,
        tipo_dte: documento.tipo_dte as TipoDTE,
        fecha: formattedDate,
        empresa_id: body.empresa_id,
        estado: documento.fecha_anulacion,
        tipo: documento.tipo,
      });

      // Facturas en moneda distinta a GTQ para tratamiento posterior
      if (documento.moneda && documento.moneda !== "GTQ") {
        facturasConMonedaDistinta.push(documento);
      }

const fechaEmisionStr =
  formatDate(documento.fecha_emision) || formattedDate;
const fechaAnulacionStr = formatDate(documento.fecha_anulacion);

// 👇 calculamos un estado SIEMPRE válido
const estadoSAT =
  typeof documento.estado === "string"
    ? documento.estado.trim()
    : "";

// Si viene estado desde el archivo, se respeta.
// Si no, usamos la lógica: tiene fecha_anulacion => "ANULADA", si no "VIGENTE".
const facturaEstado =
  estadoSAT !== ""
    ? estadoSAT
    : fechaAnulacionStr
    ? "ANULADA"
    : "VIGENTE";

documentosData.push({
  uuid: uuid(),
  identificador_unico,
  fecha_emision: new Date(fechaEmisionStr),
  numero_autorizacion: documento.numero_autorizacion,
  tipo_dte: documento.tipo_dte,
  serie: documento.serie,
  numero_dte: documento.numero_dte,
  nit_emisor: documento.nit_emisor,
  nombre_emisor: documento.nombre_emisor,
  codigo_establecimiento: documento.codigo_establecimiento ?? "",
  establecimiento_receptor_id: null,
  nombre_establecimiento: documento.nombre_establecimiento ?? "",
  id_receptor: documento.id_receptor ?? "",
  nombre_receptor: documento.nombre_receptor ?? "",
  nit_certificador: documento.nit_certificador ?? "",
  nombre_certificador: documento.nombre_certificador ?? "",
  moneda: documento.moneda ?? "GTQ",

  monto_total: decimalOrZero(documento.monto_total),
  monto_bien: decimalOrZero(documento.monto_bien),
  monto_servicio: decimalOrZero(documento.monto_servicio),

  // ✅ ahora SIEMPRE tiene un valor string válido
  factura_estado: facturaEstado,
  marca_anulado: documento.marca_anulado ?? "",
  fecha_anulacion: fechaAnulacionStr
    ? new Date(fechaAnulacionStr)
    : null,

  iva: decimalOrZero(documento.iva),
  petroleo: decimalOrZero(documento.petroleo),
  turismo_hospedaje: decimalOrZero(documento.turismo_hospedaje),
  turismo_pasajes: decimalOrZero(documento.turismo_pasajes),
  timbre_prensa: decimalOrZero(documento.timbre_prensa),
  bomberos: decimalOrZero(documento.bomberos),
  tasa_municipal: decimalOrZero(documento.tasa_municipal),
  bebidas_alcoholicas: decimalOrZero(documento.bebidas_alcoholicas),
  tabaco: decimalOrZero(documento.tabaco),
  cemento: decimalOrZero(documento.cemento),
  bebidas_no_alcoholicas: decimalOrZero(documento.bebidas_no_alcoholicas),
  tarifa_portuaria: decimalOrZero(documento.tarifa_portuaria),

  tipo_operacion: body.operacion_tipo,
  cuenta_debe: documento.cuenta_debe ?? null,
  cuenta_haber: documento.cuenta_haber ?? null,
  tipo: documento.tipo,
  empresa_id: body.empresa_id,
  fecha_trabajo: new Date(formattedDate),
});

        
    }

    // =========================================================
    // 🛑 VALIDACIÓN 2: FACTURAS YA CARGADAS (SERIE + NÚMERO DTE)
    //    No se pueden repetir en ningún mes para la misma empresa
    // =========================================================
    if (documentosData.length > 0) {
      const paresSerieNumero = documentosData.map((d) => ({
        serie: d.serie as string,
        numero_dte: d.numero_dte as string,
      }));

      const documentosExistentes = await prisma.documento.findMany({
        where: {
          empresa_id: body.empresa_id,
          OR: paresSerieNumero.map((p) => ({
            serie: p.serie,
            numero_dte: p.numero_dte,
          })),
        },
        select: {
          serie: true,
          numero_dte: true,
          fecha_trabajo: true,
        },
      });

      if (documentosExistentes.length > 0) {
        if (documentosExistentes.length === 1) {
          const doc = documentosExistentes[0];
          const mesTexto = moment(doc.fecha_trabajo).format("MM/YYYY");

          return Response.json({
            status: 400,
            data: {},
            message: `Factura ya cargada en el mes ${mesTexto}.`,
          });
        } else {
          const seriesUnicas = Array.from(
            new Set(documentosExistentes.map((d) => d.serie))
          );

          return Response.json({
            status: 400,
            data: {
              series: seriesUnicas,
            },
            message: `Analizar las facturas: ${seriesUnicas.join(", ")}`,
          });
        }
      }
    }

    // 3️⃣ Insertar documentos en GNIO
    await prisma.documento.createMany({
      data: documentosData,
      skipDuplicates: true, // seguridad extra, por si acaso
    });

    // 4️⃣ Asientos contables + partidas
    const lastCorrelativo = await getLastCorrelativo(body.empresa_id);
    await insertAsientosYPartidas(
      asientos,
      partidas,
      body.empresa_id,
      lastCorrelativo
    );

    // 5️⃣ Movimientos bancarios y actualización de saldos
    await handleBankMovements(partidas, body.empresa_id, formattedDate);

    // 6️⃣ Ajuste por tipo de cambio (BanGuat) para facturas en moneda distinta
    if (facturasConMonedaDistinta.length > 0) {
      await updateDocumentos(facturasConMonedaDistinta, body.empresa_id);
    }

    return Response.json({
      status: 200,
      data: {},
      message: "Documentos creados correctamente",
    });
  } catch (error: any) {
    console.error(error);

    // Prisma unique constraint (equivalente a ER_DUP_ENTRY)
    if (error?.code === "P2002") {
      return Response.json({
        status: 400,
        data: {},
        message:
          "Error: Ya existe uno o varios documentos con esa información en la base de datos. Verifique y vuelva a intentarlo.",
      });
    }

    // Foreign key tipo_poliza_id
    if (error?.code === "P2003") {
      return Response.json({
        status: 400,
        data: {},
        message:
          "Error: No existe el tipo de póliza asociado (tipo_poliza_id). Asegúrate de tener creados los tipos de póliza en la tabla tipos_polizas.",
      });
    }

    return Response.json({
      status: 400,
      data: {},
      message:
        error?.message || "Ocurrió un error al crear los documentos en GNIO.",
    });
  }
}

/* =========================================================
 *  Helpers internos (GNIO)
 * ======================================================= */

const generatePartidas = (
  documento: IFactura,
  operacion_tipo: "venta" | "compra",
  cuentas: Cuenta[]
): PartidaGenerada[] => {
  const partidas: PartidaGenerada[] = [];

  const partidas_debe = partidaDebeHandler(documento, cuentas, operacion_tipo);
  const partidas_haber = partidaHaberHandler(documento, cuentas, operacion_tipo);
  const partida_iva = partidaIvaHandler(documento, cuentas, operacion_tipo);
  const partida_descuento = partidaDescuentoHandler(
    documento,
    cuentas,
    operacion_tipo
  );

  partidas.push(...(partidas_debe as any[]), ...(partidas_haber as any[]));

  if (partida_iva.validacion) partidas.push(partida_iva as any);
  if (partida_descuento.validacion) partidas.push(partida_descuento as any);

  // 🔴 FILTRO GLOBAL: no guardar partidas con DEBE = HABER = 0
  return partidas.filter(
    (p) => toNumber(p.monto_debe) !== 0 || toNumber(p.monto_haber) !== 0
  );
};

const getLastCorrelativo = async (empresa_id: number): Promise<number> => {
  const last = await prisma.asientoContable.findFirst({
    where: { empresa_id },
    orderBy: { correlativo: "desc" },
    select: { correlativo: true },
  });

  if (last?.correlativo) return last.correlativo;
  return 0;
};

const insertAsientosYPartidas = async (
  asientos: Asiento[],
  partidas: PartidaGenerada[],
  empresa_id: number,
  lastCorrelativo: number
) => {
  if (!asientos.length || !partidas.length) {
    throw new Error("Los asientos y las partidas no deben estar vacíos.");
  }

  // 👇 Estos IDs deben existir en la tabla tipos_polizas (insertados con el SQL)
  const getTipoPolizaId = (tipo_operacion: "venta" | "compra"): number =>
    tipo_operacion === "venta" ? 7 : 6; // GNIO: Poliza de Ventas (id=7), Poliza de Compras (id=6)

  const getDescripcion = (asiento: Asiento): string => {
    const { tipo_operacion, tipo_dte, estado, tipo } = asiento;
    const operacion = tipo_operacion === "venta" ? "Venta" : "Compra";
    return estado
      ? `Factura anulada - ${tipo_dte} de ${operacion}`
      : `${tipo_dte} de ${operacion} (${tipo})`;
  };

  // 1️⃣ Crear mapa de correlativos por identificador_unico
  const correlativosMap = new Map<
    string,
    { correlativo: number; asiento: Asiento }
  >();

  asientos.forEach((asiento, index) => {
    const correlativo = lastCorrelativo + index + 1;
    correlativosMap.set(asiento.identificador_unico, { correlativo, asiento });
  });

  // 2️⃣ Insertar asientos_contables
  const asientosData = asientos.map((asiento) => {
    const info = correlativosMap.get(asiento.identificador_unico)!;
    return {
      correlativo: info.correlativo,
      tipo_poliza_id: getTipoPolizaId(asiento.tipo_operacion),
      descripcion: getDescripcion(asiento),
      fecha: new Date(asiento.fecha),
      empresa_id: asiento.empresa_id,
      estado: asiento.estado ? 0 : 1,
      referencia: asiento.identificador_unico,
    };
  });

  await prisma.asientoContable.createMany({
    data: asientosData,
  });

  // 3️⃣ Registrar correlativo en Gestiones (simulación Conta Cox)
  await updateCorrelativo(asientos.length, empresa_id);

  // 4️⃣ Leer los asientos insertados para obtener sus IDs
  const minCorrelativo = lastCorrelativo + 1;
  const maxCorrelativo = lastCorrelativo + asientos.length;

  const insertedAsientos = await prisma.asientoContable.findMany({
    where: {
      empresa_id,
      correlativo: {
        gte: minCorrelativo,
        lte: maxCorrelativo,
      },
    },
    orderBy: { correlativo: "asc" },
    select: { id: true, referencia: true },
  });

  const asientosMapWithId = new Map<string, number>();
  insertedAsientos.forEach((a) => {
    if (a.referencia) {
      asientosMapWithId.set(a.referencia, a.id);
    }
  });

  // 5️⃣ Insertar partidas
  const partidasData = partidas.map((partida) => {
    const asientoId = asientosMapWithId.get(partida.identificador_unico);
    if (!asientoId) {
      throw new Error(
        `No se encontró un asiento para la referencia ${partida.identificador_unico}`
      );
    }
    if (!partida.cuenta) {
      throw new Error(
        `Partida sin cuenta contable para referencia ${partida.identificador_unico}`
      );
    }

    const montoDebe = parseFloat(String(partida.monto_debe ?? 0));
    const montoHaber = parseFloat(String(partida.monto_haber ?? 0));

    return {
      uuid: uuid(),
      cuenta_id: Number(partida.cuenta),
      monto_debe: montoDebe,
      monto_haber: montoHaber,
      empresa_id,
      asiento_contable_id: asientoId,
      referencia: partida.identificador_unico,
    };
  });

  await prisma.partida.createMany({
    data: partidasData,
  });
};

/* =========================================================
 *  Ajustes por tipo de cambio (BanGuat)
 * ======================================================= */

const updateDocumentos = async (
  facturasConMonedaDistinta: IFactura[],
  empresa_id: number
): Promise<void> => {
  const updateFactura = async (factura: any) => {
    try {
      // fecha para BanGuat: AAAA-DD-MM
      const fecha = moment(factura.fecha_emision).format("YYYY-DD-MM");
      const divisa = divisas.find((d) => d.key === factura.moneda);
      const codigoMoneda = divisa?.moneda;
      if (!codigoMoneda) return;

      const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <TipoCambioRangoMoneda xmlns="http://www.banguat.gob.gt/variables/ws/">
              <fechainit>${fecha}</fechainit>
              <fechafin>${fecha}</fechafin>
              <moneda>${codigoMoneda}</moneda>
            </TipoCambioRangoMoneda>
          </soap:Body>
        </soap:Envelope>`;

      const response = await fetch(
        "https://banguat.gob.gt/variables/ws/TipoCambio.asmx",
        {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
          },
          body: soapRequest,
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        console.error("Error en respuesta BanGuat:", response.statusText);
        return;
      }

      const jsonResponse = parser.parse(responseText);
      const exchangeRateData =
        jsonResponse["soap:Envelope"]["soap:Body"][
          "TipoCambioRangoMonedaResponse"
        ]["TipoCambioRangoMonedaResult"]["Vars"]["Var"];

      const { fecha: fechaTC, venta } = exchangeRateData;
      const ventaFactor = parseFloat(venta);

      const fieldsToUpdate = [
        "monto_total",
        "monto_servicio",
        "monto_bien",
        "iva",
        "petroleo",
        "turismo_hospedaje",
        "turismo_pasajes",
        "timbre_prensa",
        "bomberos",
        "tasa_municipal",
        "bebidas_alcoholicas",
        "tabaco",
        "cemento",
        "bebidas_no_alcoholicas",
        "tarifa_portuaria",
      ];

      const updatedFields: Record<string, number> = {};
      for (const field of fieldsToUpdate) {
        const value = factura[field];
        if (value != null && value !== 0 && value !== "0") {
          updatedFields[field] =
            parseFloat(String(value)) * parseFloat(String(ventaFactor));
        }
      }

      const comentario = `Documento alterado para coincidir con la moneda nacional según el tipo de cambio del Banco de Guatemala en la fecha "${fechaTC}" por su valor de venta Q.${venta}`;

      // 1️⃣ Actualizar documento
      await prisma.documento.update({
        where: { identificador_unico: factura.identificador_unico },
        data: {
          ...(updatedFields as any),
          comentario,
        },
      });

      // 2️⃣ Actualizar partidas asociadas
      await updatePartidas(
        factura.identificador_unico,
        empresa_id,
        String(ventaFactor)
      );

      // 3️⃣ Actualizar también los movimientos bancarios
      await updateMovimientosBancarios(
        factura.identificador_unico,
        String(ventaFactor)
      );
    } catch (error) {
      console.error(error);
      throw new Error(
        `Error actualizando factura con identificador_unico ${factura.identificador_unico}`
      );
    }
  };

  await Promise.all(facturasConMonedaDistinta.map(updateFactura));
};

const updatePartidas = async (
  identificador_unico: string,
  empresa_id: number,
  valor_venta: string
): Promise<void> => {
  const partidas = await prisma.partida.findMany({
    where: {
      referencia: identificador_unico,
      empresa_id,
    },
  });

  if (!partidas || partidas.length === 0) {
    throw new Error(
      `No se encontraron partidas para la factura con identificador_unico ${identificador_unico}`
    );
  }

  const factor = parseFloat(valor_venta);

  await Promise.all(
    partidas.map((p) => {
      const montoDebeOriginal = parseFloat(String(p.monto_debe));
      const montoHaberOriginal = parseFloat(String(p.monto_haber));

      const updatedMontoDebe = parseFloat(
        (montoDebeOriginal * factor).toFixed(2)
      );
      const updatedMontoHaber = parseFloat(
        (montoHaberOriginal * factor).toFixed(2)
      );

      return prisma.partida.update({
        where: { uuid: p.uuid },
        data: {
          monto_debe: updatedMontoDebe,
          monto_haber: updatedMontoHaber,
        },
      });
    })
  );
};

/* =========================================================
 *  Movimientos bancarios (GNIO)
 * ======================================================= */

const handleBankMovements = async (
  partidas: PartidaGenerada[],
  empresa_id: number,
  fecha: string
) => {
  if (partidas.length === 0) return;

  // 1️⃣ Obtener cuentas bancarias de la empresa
  const cuentasBancarias = await prisma.cuentaBancaria.findMany({
    where: { empresaId: empresa_id },
    select: {
      id: true,
      cuentaContableId: true,
      saldoInicial: true,
    },
  });

  if (!cuentasBancarias.length) return;

  // Map: cuentaContableId -> cuenta bancaria + saldo actual
  const cuentasBancariasMap = new Map<number, { id: number; saldo: number }>();

  cuentasBancarias.forEach((cb) => {
    if (cb.cuentaContableId == null) return;
    cuentasBancariasMap.set(cb.cuentaContableId, {
      id: cb.id,
      saldo: parseFloat(String(cb.saldoInicial)),
    });
  });

  const movimientosBancarios: {
    cuenta_bancaria_id: number;
    fecha: Date;
    descripcion: string;
    tipo_movimiento: "debito" | "credito";
    monto: number;
    referencia: string;
  }[] = [];

  const saldosActualizados = new Map<number, number>();

  for (const partida of partidas) {
    if (!partida.cuenta) continue;

    const cuentaBancaria = cuentasBancariasMap.get(Number(partida.cuenta));
    if (!cuentaBancaria) continue;

    let saldoActual =
      saldosActualizados.get(cuentaBancaria.id) ?? cuentaBancaria.saldo;

    const montoDebe = parseFloat(String(partida.monto_debe ?? 0));
    const montoHaber = parseFloat(String(partida.monto_haber ?? 0));

    if (montoDebe > 0) {
      saldoActual += montoDebe;
      movimientosBancarios.push({
        cuenta_bancaria_id: cuentaBancaria.id,
        fecha: new Date(fecha),
        descripcion: `Movimiento generado por partida: ${partida.identificador_unico}`,
        tipo_movimiento: "debito",
        monto: parseFloat(montoDebe.toFixed(2)),
        referencia: partida.identificador_unico,
      });
    }

    if (montoHaber > 0) {
      saldoActual -= montoHaber;
      movimientosBancarios.push({
        cuenta_bancaria_id: cuentaBancaria.id,
        fecha: new Date(fecha),
        descripcion: `Movimiento generado por partida: ${partida.identificador_unico}`,
        tipo_movimiento: "credito",
        monto: parseFloat(montoHaber.toFixed(2)),
        referencia: partida.identificador_unico,
      });
    }

    saldosActualizados.set(
      cuentaBancaria.id,
      parseFloat(saldoActual.toFixed(2))
    );
  }

  if (!movimientosBancarios.length) return;

  // 2️⃣ Insertar movimientos bancarios
  await prisma.movimientoCuentaBancaria.createMany({
    data: movimientosBancarios,
  });

  // 3️⃣ Actualizar saldos (usamos saldoInicial como saldo "actual")
  await Promise.all(
    Array.from(saldosActualizados.entries()).map(([id, saldo]) =>
      prisma.cuentaBancaria.update({
        where: { id },
        data: { saldoInicial: saldo },
      })
    )
  );
};

// ⚠️ Ajuste de movimientos bancarios cuando se reexpresa el documento por tipo de cambio
const updateMovimientosBancarios = async (
  identificador_unico: string,
  valor_venta: string
): Promise<void> => {
  const movimiento = await prisma.movimientoCuentaBancaria.findFirst({
    where: { referencia: identificador_unico },
    orderBy: { id: "asc" },
  });

  if (!movimiento) return;

  const cuenta_bancaria = await prisma.cuentaBancaria.findUnique({
    where: { id: movimiento.cuenta_bancaria_id },
    select: { id: true, saldoInicial: true },
  });

  if (!cuenta_bancaria) return;

  const montoAnterior = parseFloat(String(movimiento.monto));
  const factor = parseFloat(valor_venta);
  const nuevoMonto = parseFloat((montoAnterior * factor).toFixed(2));

  const ajusteSaldo =
    movimiento.tipo_movimiento === "credito"
      ? nuevoMonto - montoAnterior
      : montoAnterior - nuevoMonto;

  const saldoActual = parseFloat(String(cuenta_bancaria.saldoInicial));
  const nuevoSaldo = parseFloat((saldoActual + ajusteSaldo).toFixed(2));

  await prisma.movimientoCuentaBancaria.update({
    where: { id: movimiento.id },
    data: { monto: nuevoMonto },
  });

  await prisma.cuentaBancaria.update({
    where: { id: cuenta_bancaria.id },
    data: { saldoInicial: nuevoSaldo },
  });
};
