// src/utils/services/reportes.ts
import { fetchService } from "../functions/fetchService";

/**
 * Obtiene documentos para reportes (ventas o compras) por mes.
 */
export const obtenerDocumentosReportes = async (
  empresaId: number,
  fecha: string,
  venta: boolean = false
) => {
  return await fetchService({
    url: `/api/reportes?empresa_id=${empresaId}&fecha=${fecha}&venta=${venta}`,
    method: "GET",
  });
};
