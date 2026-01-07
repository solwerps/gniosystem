// src/utils/services/documentos.ts

import type {
  IDocUpload,
  IFactura,
  IUploadDocumento,
} from "@/utils/models/documentos";
import { fetchService } from "@/utils/functions/fetchService";

/**
 * Obtener documentos de una empresa, filtrados por mes y tipo de operación.
 * - empresa_id: id de la empresa
 * - fecha: "YYYY-MM"
 * - venta: "compra" | "venta" | null  (se sigue llamando 'venta' en el query para compatibilidad)
 */
export const obtenerDocumentos = async (
  empresa_id: number,
  fecha: string,
  venta: string | null = null
) => {
  return await fetchService({
    url: `/api/documentos?empresa_id=${empresa_id}&fecha=${fecha}&venta=${venta}`,
    method: "GET",
  });
};

/**
 * Obtener un documento por su UUID
 */
export const obtenerDocumentoByuuid = async (uuid: string) => {
  return await fetchService({
    url: `/api/documentos/uuid?uuid=${encodeURIComponent(uuid)}`,
    method: "GET",
  });
};

/**
 * Carga MASIVA (CSV + XML combinados)
 */
export const crearDocumentos = async (
  documentos: IDocUpload[],
  empresa_id: number,
  operacion_tipo: string,
  date: Date
) => {
  return await fetchService({
    url: `/api/documentos/masivo`,
    method: "POST",
    body: JSON.stringify({ documentos, empresa_id, operacion_tipo, date }),
  });
};

/**
 * Carga MASIVA sólo desde XML
 */
export const crearFacturasXML = async (
  facturas: any[],
  empresa_id: number,
  operacion_tipo: string,
  date: Date
) => {
  return await fetchService({
    url: `/api/documentos/masivo/xml`,
    method: "POST",
    body: JSON.stringify({
      documentos: facturas,
      empresa_id,
      operacion_tipo,
      date,
    }),
  });
};

/**
 * Crear UNA factura manual
 */
export const crearFactura = async (documento: IUploadDocumento | any) => {
  return await fetchService({
    url: `/api/documentos`,
    method: "POST",
    body: JSON.stringify({ documento }),
  });
};

/**
 * Rectificación de facturas (GNIO)
 * Se conecta a: PUT /api/documentos/rectificacion
 */
export const rectificarFacturas = async (
  facturas: IFactura[],
  empresa_id: number,
  fecha_trabajo: Date,
  cuenta_debe: string | null,
  cuenta_haber: string | null,
  cuenta_debe2: string | null,
  cuenta_haber2: string | null,
  deleted: boolean
) => {
  return await fetchService({
    url: `/api/documentos/rectificacion`,
    method: "PUT",
    body: JSON.stringify({
      facturas,
      empresa_id,
      fecha_trabajo: fecha_trabajo.toISOString().split("T")[0], // "YYYY-MM-DD"
      cuenta_debe,
      cuenta_haber,
      cuenta_debe2,
      cuenta_haber2,
      deleted,
    }),
  });
};
