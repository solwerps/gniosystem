// src/app/api/documentos/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import moment from "moment";
import { XMLParser } from "fast-xml-parser";
import { v4 as uuid } from "uuid";

import type { Cuenta } from "@/utils/models/nomenclaturas";
import type { IFactura } from "@/utils/models/documentos";
import { divisas } from "@/utils/data/divisas";

import {
  getCuentasByEmpresa,
  partidaDebeHandler,
  partidaHaberHandler,
  partidaIvaHandler,
  partidaDescuentoHandler,
  updateCorrelativo,
} from "../documentos/masivo/utils";

const parser = new XMLParser();

/* =========================================================
 *  GET: Obtiene documentos por empresa, mes y tipo (compra/venta)
 *      - Filtra por mes de FECHA_EMISION (la que ves en la tabla)
 *      - Si NO se envía tipo/venta: devuelve compras + ventas
 *      - Agrega:
 *          cuenta_debe_nombre, cuenta_haber_nombre, tipo_operacion_nombre
 * ======================================================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const empresaIdParam = searchParams.get("empresa_id");
    const tipoParam = searchParams.get("tipo");   // "compra" | "venta" | null
    const ventaParam = searchParams.get("venta"); // legacy: "compra" | "venta" | "null"
    const fechaParam = searchParams.get("fecha"); // "YYYY-MM"

    //  empresa_id obligatorio
    const empresa_id = empresaIdParam ? Number(empresaIdParam) : NaN;
    if (!empresa_id || Number.isNaN(empresa_id)) {
      return NextResponse.json(
        { error: "Debe proporcionar empresa_id válido." },
        { status: 400 }
      );
    }

    // 🔹 Normalizamos tipo de operación
    //    - acepta ?tipo= y ?venta=
    //    - ignora "null", "undefined" y vacío
    const rawTipo = (tipoParam ?? ventaParam ?? "").toLowerCase();
    let tipo_operacion: "compra" | "venta" | undefined = undefined;
    if (rawTipo === "compra" || rawTipo === "venta") {
      tipo_operacion = rawTipo;
    }

    // 🔹 Determinar rango del mes por FECHA_EMISION
    //    Si no viene fecha, usa mes actual
    const baseMoment = fechaParam
      ? moment(`${fechaParam}-01`, "YYYY-MM-DD")
      : moment().startOf("month");

    const startDate = baseMoment.clone().startOf("month").toDate();
    const endDate = baseMoment.clone().endOf("month").toDate();

    // 🔹 Armamos el where dinámico
    const where: any = {
      empresa_id,
      estado: 1,
      fecha_trabajo: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Sólo filtramos por tipo_operacion si viene "compra" o "venta"
    if (tipo_operacion) {
      where.tipo_operacion = tipo_operacion;
    }

    // 🔹 Traemos documentos + relaciones de cuentas
    const documentos = await prisma.documento.findMany({
      where,
      include: {
        cuentaDebe: true,               // relación NomenclaturaCuenta (cuenta_debe)
        cuentaHaber: true,              // relación NomenclaturaCuenta (cuenta_haber)
        establecimiento_receptor: true,
        empresa: true,
      },
      orderBy: {
        fecha_emision: "asc",
      },
    });

    // 🔹 Catálogo de cuentas de la empresa para mapear nombres
    const cuentas: Cuenta[] = await getCuentasByEmpresa(empresa_id);

    // Mapeamos para agregar los nombres de cuenta y texto de tipo_operacion
    const documentosFormateados = documentos.map((doc: any) => {
      const cuentaDebeRel = doc.cuentaDebe as any | null;
      const cuentaHaberRel = doc.cuentaHaber as any | null;

      // Buscar descripción de cuenta_debe
      const cuentaDebeDesc =
        cuentaDebeRel?.descripcion ??
        cuentas.find(
          (c: any) => Number((c as any).id) === Number(doc.cuenta_debe)
        )?.descripcion ??
        null;

      // Buscar descripción de cuenta_haber
      const cuentaHaberDesc =
        cuentaHaberRel?.descripcion ??
        cuentas.find(
          (c: any) => Number((c as any).id) === Number(doc.cuenta_haber)
        )?.descripcion ??
        null;

      const tipoOperacionNombre =
        doc.tipo_operacion === "venta"
          ? "Venta"
          : doc.tipo_operacion === "compra"
          ? "Compra"
          : doc.tipo_operacion ?? null;

      // No tocamos cuenta_debe / cuenta_haber numéricos; solo agregamos campos nuevos
      return {
        ...doc,
        cuenta_debe_nombre: cuentaDebeDesc,
        cuenta_haber_nombre: cuentaHaberDesc,
        tipo_operacion_nombre: tipoOperacionNombre,
      };
    });

    return NextResponse.json({
      status: 200,
      data: documentosFormateados,
      message: "Documentos obtenidos correctamente",
    });
  } catch (error: any) {
    console.error("❌ Error en GET /api/documentos:", error);
    return NextResponse.json(
      { error: "Error al obtener documentos." },
      { status: 500 }
    );
  }
}

/* =========================================================
 *  POST: Inserta documento individual (GNIO = Conta Cox 1:1)
 * ======================================================= */
/* =========================================================
 *  POST: Inserta documento individual (GNIO = Conta Cox 1:1)
 * ======================================================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Siempre esperamos al menos { documento }
    const documentoBody = body.documento as IFactura | undefined;
    if (!documentoBody) {
      return NextResponse.json(
        { error: "El documento es requerido." },
        { status: 400 }
      );
    }

    // 🔹 Resolver empresa_id (prioridad: body.empresa_id → documento.empresa_id → documento.empresaId)
    const empresaIdSource =
      body.empresa_id ??
      (documentoBody as any).empresa_id ??
      (documentoBody as any).empresaId;

    const empresa_id = Number(empresaIdSource);
    if (!empresa_id || Number.isNaN(empresa_id)) {
      return NextResponse.json(
        { error: "La empresa es requerida para crear el documento." },
        { status: 400 }
      );
    }

    // 🔹 Resolver tipo_operacion (prioridad: body.tipo_operacion → documento.tipo_operacion)
    const tipoOperacionSource =
      body.tipo_operacion ?? (documentoBody as any).tipo_operacion;

    if (tipoOperacionSource !== "venta" && tipoOperacionSource !== "compra") {
      return NextResponse.json(
        { error: "El tipo de operación del documento es inválido." },
        { status: 400 }
      );
    }

    const tipo_operacion = tipoOperacionSource as "venta" | "compra";

    // 🔹 Normalizar fechas (acepta Date o string)
    const fechaTrabajoSrc =
      (documentoBody as any).fecha_trabajo ?? body.fecha_trabajo ?? new Date();
    const fechaEmisionSrc = documentoBody.fecha_emision ?? new Date();
    const fechaAnulacionSrc = (documentoBody as any).fecha_anulacion ?? null;

    const fecha_trabajo = moment(fechaTrabajoSrc).format("YYYY-MM-DD");
    const fecha_emision = moment(fechaEmisionSrc).format("YYYY-MM-DD");
    const fecha_anulacion = fechaAnulacionSrc
      ? moment(fechaAnulacionSrc).format("YYYY-MM-DD")
      : null;

    // 🔹 Ejecutamos todo en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Obtener nomenclatura de la empresa
      const cuentas: Cuenta[] = await getCuentasByEmpresa(empresa_id);

      // 2️⃣ Crear identificador único
      const identificador_unico = `${documentoBody.serie}-${documentoBody.numero_dte}-${documentoBody.numero_autorizacion}-${empresa_id}-${tipo_operacion}`;

      // Factura base que se usará en partidas y ajuste BanGuat
      const facturaBase = {
        ...(documentoBody as any),
        identificador_unico,
      } as IFactura;

      // 3️⃣ Armar registro del documento (igual que antes, solo usando facturaBase)
      const docData = {
        uuid: uuid(),
        identificador_unico,
        fecha_trabajo: new Date(fecha_trabajo),
        fecha_emision: new Date(fecha_emision),
        numero_autorizacion: facturaBase.numero_autorizacion,
        tipo_dte: facturaBase.tipo_dte,
        serie: facturaBase.serie,
        numero_dte: facturaBase.numero_dte,
        nit_emisor: facturaBase.nit_emisor,
        nombre_emisor: facturaBase.nombre_emisor,
        codigo_establecimiento: (facturaBase as any).codigo_establecimiento ?? "",
        nombre_establecimiento: (facturaBase as any).nombre_establecimiento ?? "",
        id_receptor: facturaBase.id_receptor,
        nombre_receptor: facturaBase.nombre_receptor,
        nit_certificador: (facturaBase as any).nit_certificador ?? "",
        nombre_certificador: (facturaBase as any).nombre_certificador ?? "",
        moneda: facturaBase.moneda ?? "GTQ",
        monto_total: facturaBase.monto_total ?? 0,
        monto_bien: (facturaBase as any).monto_bien ?? 0,
        monto_servicio: (facturaBase as any).monto_servicio ?? 0,
        factura_estado: (facturaBase as any).factura_estado ?? "VIGENTE",
        marca_anulado: (facturaBase as any).marca_anulado ?? "",
        fecha_anulacion: fecha_anulacion ? new Date(fecha_anulacion) : null,
        iva: facturaBase.iva ?? 0,
        petroleo: facturaBase.petroleo ?? 0,
        turismo_hospedaje: facturaBase.turismo_hospedaje ?? 0,
        turismo_pasajes: facturaBase.turismo_pasajes ?? 0,
        timbre_prensa: facturaBase.timbre_prensa ?? 0,
        bomberos: facturaBase.bomberos ?? 0,
        tasa_municipal: facturaBase.tasa_municipal ?? 0,
        bebidas_alcoholicas: facturaBase.bebidas_alcoholicas ?? 0,
        tabaco: facturaBase.tabaco ?? 0,
        cemento: facturaBase.cemento ?? 0,
        bebidas_no_alcoholicas: facturaBase.bebidas_no_alcoholicas ?? 0,
        tarifa_portuaria: facturaBase.tarifa_portuaria ?? 0,
        tipo_operacion,
        cuenta_debe: facturaBase.cuenta_debe,
        cuenta_haber: facturaBase.cuenta_haber,
        tipo: facturaBase.tipo,
        empresa_id,
        estado: 1,
      };

      // 4️⃣ Insertar documento
      await tx.documento.create({ data: docData });

      // 5️⃣ Crear asiento contable
      const correlativo = await getLastCorrelativo(tx, empresa_id);
      // Polizas según catálogo GNIO (ver TipoPoliza)
      const tipo_poliza_id = tipo_operacion === "venta" ? 7 : 6; // Ventas=7, Compras=6

      const asiento = await tx.asientoContable.create({
        data: {
          correlativo: correlativo + 1,
          tipo_poliza_id,
          descripcion: `${facturaBase.tipo_dte} de ${
            tipo_operacion === "venta" ? "Venta" : "Compra"
          } (${facturaBase.tipo})`,
          fecha: new Date(fecha_trabajo),
          empresa_id,
          estado: fecha_anulacion ? 0 : 1,
          referencia: identificador_unico,
        },
      });

      await updateCorrelativo(1, empresa_id);

      // 6️⃣ Crear partidas contables (misma lógica que masivo)
      const partidas_debe = partidaDebeHandler(
        facturaBase,
        cuentas,
        tipo_operacion
      );
      const partidas_haber = partidaHaberHandler(
        facturaBase,
        cuentas,
        tipo_operacion
      );
      const partida_iva = partidaIvaHandler(
        facturaBase,
        cuentas,
        tipo_operacion
      );
      const partida_desc = partidaDescuentoHandler(
        facturaBase,
        cuentas,
        tipo_operacion
      );

      const partidas = [
        ...partidas_debe,
        ...partidas_haber,
        ...(partida_iva.validacion ? [partida_iva] : []),
        ...(partida_desc.validacion ? [partida_desc] : []),
      ];

      await tx.partida.createMany({
        data: partidas.map((p) => ({
          uuid: uuid(),
          cuenta_id: Number(p.cuenta),
          monto_debe: parseFloat(String(p.monto_debe ?? 0)),
          monto_haber: parseFloat(String(p.monto_haber ?? 0)),
          empresa_id,
          asiento_contable_id: asiento.id,
          referencia: identificador_unico,
        })),
      });

      // 7️⃣ Movimientos bancarios
      await handleBankMovements(tx, partidas, empresa_id, fecha_trabajo);

      // 8️⃣ Ajuste por tipo de cambio BanGuat (solo si ≠ GTQ)
      if (facturaBase.moneda && facturaBase.moneda !== "GTQ") {
        await updateDocumentoTipoCambio(tx, facturaBase, empresa_id);
      }

      return { status: 200, message: "Documento creado correctamente." };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ Error en POST /api/documentos:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno creando documento." },
      { status: 500 }
    );
  }
}


/* =========================================================
 *  Helpers internos
 * ======================================================= */

const getLastCorrelativo = async (tx: any, empresa_id: number): Promise<number> => {
  const last = await tx.asientoContable.findFirst({
    where: { empresa_id },
    orderBy: { correlativo: "desc" },
    select: { correlativo: true },
  });
  return last?.correlativo ?? 0;
};

/* =========================================================
 *  Movimientos Bancarios
 * ======================================================= */
const handleBankMovements = async (
  tx: any,
  partidas: any[],
  empresa_id: number,
  fecha: string
) => {
  const cuentasBancarias = await tx.cuentaBancaria.findMany({
    where: { empresaId: empresa_id },
    select: { id: true, cuentaContableId: true, saldoInicial: true },
  });

  const cuentasMap = new Map<number, { id: number; saldo: number }>();
  cuentasBancarias.forEach((c: { cuentaContableId: number; id: any; saldoInicial: any }) =>
    c.cuentaContableId &&
    cuentasMap.set(c.cuentaContableId, { id: c.id, saldo: parseFloat(String(c.saldoInicial)) })
  );

  const movimientos: any[] = [];
  const saldosActualizados = new Map<number, number>();

  for (const partida of partidas) {
    if (!partida.cuenta) continue;
    const cb = cuentasMap.get(Number(partida.cuenta));
    if (!cb) continue;

    let saldoActual = saldosActualizados.get(cb.id) ?? cb.saldo;
    const debe = parseFloat(String(partida.monto_debe ?? 0));
    const haber = parseFloat(String(partida.monto_haber ?? 0));

    if (debe > 0) {
      saldoActual += debe;
      movimientos.push({
        cuenta_bancaria_id: cb.id,
        fecha: new Date(fecha),
        descripcion: `Movimiento generado por partida ${partida.identificador_unico}`,
        tipo_movimiento: "debito",
        monto: debe,
        referencia: partida.identificador_unico,
      });
    }

    if (haber > 0) {
      saldoActual -= haber;
      movimientos.push({
        cuenta_bancaria_id: cb.id,
        fecha: new Date(fecha),
        descripcion: `Movimiento generado por partida ${partida.identificador_unico}`,
        tipo_movimiento: "credito",
        monto: haber,
        referencia: partida.identificador_unico,
      });
    }

    saldosActualizados.set(cb.id, parseFloat(saldoActual.toFixed(2)));
  }

  if (movimientos.length > 0) {
    await tx.movimientoCuentaBancaria.createMany({ data: movimientos });
    await Promise.all(
      Array.from(saldosActualizados.entries()).map(([id, saldo]) =>
        tx.cuentaBancaria.update({ where: { id }, data: { saldoInicial: saldo } })
      )
    );
  }
};

/* =========================================================
 *  Ajuste BanGuat (tipo de cambio)
 * ======================================================= */
const updateDocumentoTipoCambio = async (tx: any, factura: IFactura, empresa_id: number) => {
  try {
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

    const response = await fetch("https://banguat.gob.gt/variables/ws/TipoCambio.asmx", {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      body: soapRequest,
    });

    const text = await response.text();
    if (!response.ok) throw new Error("Error BanGuat");

    const json = parser.parse(text);
    const rateData =
      json["soap:Envelope"]["soap:Body"]["TipoCambioRangoMonedaResponse"][
        "TipoCambioRangoMonedaResult"
      ]["Vars"]["Var"];

    const venta = parseFloat(rateData.venta);
    const fechaTC = rateData.fecha;

    const campos = [
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

    const updates: any = {};
    campos.forEach((c) => {
      const v = (factura as any)[c];
      if (v && v !== 0) updates[c] = parseFloat(String(v)) * venta;
    });

    const comentario = `Documento ajustado al tipo de cambio BanGuat (${fechaTC}) Q.${venta}`;

    await tx.documento.update({
      where: { identificador_unico: factura.identificador_unico },
      data: { ...updates, comentario },
    });

    // Actualizar partidas
    const partidas = await tx.partida.findMany({
      where: { referencia: factura.identificador_unico, empresa_id },
    });

    await Promise.all(
      partidas.map((p: { uuid: any; monto_debe: any; monto_haber: any }) =>
        tx.partida.update({
          where: { uuid: p.uuid },
          data: {
            monto_debe: parseFloat(String(p.monto_debe)) * venta,
            monto_haber: parseFloat(String(p.monto_haber)) * venta,
          },
        })
      )
    );

    // Ajustar movimientos bancarios
    const mov = await tx.movimientoCuentaBancaria.findFirst({
      where: { referencia: factura.identificador_unico },
    });

    if (mov) {
      const cuenta = await tx.cuentaBancaria.findUnique({
        where: { id: mov.cuenta_bancaria_id },
      });
      if (!cuenta) return;

      const nuevoMonto = parseFloat(String(mov.monto)) * venta;
      const ajusteSaldo =
        mov.tipo_movimiento === "credito"
          ? nuevoMonto - mov.monto
          : mov.monto - nuevoMonto;
      const nuevoSaldo = cuenta.saldoInicial + ajusteSaldo;

      await tx.movimientoCuentaBancaria.update({
        where: { id: mov.id },
        data: { monto: nuevoMonto },
      });
      await tx.cuentaBancaria.update({
        where: { id: cuenta.id },
        data: { saldoInicial: nuevoSaldo },
      });
    }
  } catch (error) {
    console.error("Error ajuste BanGuat:", error);
  }
};
