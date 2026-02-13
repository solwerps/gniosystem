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
  venta: string | null = null,
  tenant?: string
) => {
  const qs = new URLSearchParams({
    empresa_id: String(empresa_id),
    fecha,
    venta: venta ?? "",
  });
  if (tenant) qs.append("tenant", tenant);

  return await fetchService({
    url: `/api/documentos?${qs.toString()}`,
    method: "GET",
  });
};

/**
 * Obtener un documento por su UUID
 */
export const obtenerDocumentoByuuid = async (
  uuid: string,
  empresa_id: number,
  tenant?: string
) => {
  const qs = new URLSearchParams({
    uuid,
    empresa_id: String(empresa_id),
  });
  if (tenant) qs.append("tenant", tenant);

  return await fetchService({
    url: `/api/documentos/uuid?${qs.toString()}`,
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
  date: Date,
  tenant?: string,
  condicion_pago?: "CONTADO" | "CREDITO",
  cuenta_bancaria_id?: number | null
) => {
  return await fetchService({
    url: `/api/documentos/masivo`,
    method: "POST",
    body: JSON.stringify({
      documentos,
      empresa_id,
      operacion_tipo,
      date,
      tenant,
      condicion_pago,
      cuenta_bancaria_id,
    }),
  });
};

/**
 * Carga MASIVA sólo desde XML
 */
export const crearFacturasXML = async (
  facturas: any[],
  empresa_id: number,
  operacion_tipo: string,
  date: Date,
  tenant?: string,
  condicion_pago?: "CONTADO" | "CREDITO",
  cuenta_bancaria_id?: number | null
) => {
  return await fetchService({
    url: `/api/documentos/masivo/xml`,
    method: "POST",
    body: JSON.stringify({
      documentos: facturas,
      empresa_id,
      operacion_tipo,
      date,
      tenant,
      condicion_pago,
      cuenta_bancaria_id,
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
    body: JSON.stringify({
      documento,
      empresa_id: documento?.empresa_id,
      tenant: documento?.tenant,
    }),
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
  deleted: boolean,
  tenant?: string
) => {
  return await fetchService({
    url: `/api/documentos/rectificacion`,
    method: "PUT",
    body: JSON.stringify({
      facturas,
      empresa_id,
      tenant,
      fecha_trabajo: fecha_trabajo.toISOString().split("T")[0], // "YYYY-MM-DD"
      cuenta_debe,
      cuenta_haber,
      cuenta_debe2,
      cuenta_haber2,
      deleted,
    }),
  });
};
