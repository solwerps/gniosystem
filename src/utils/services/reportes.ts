// src/utils/services/reportes.ts
import { fetchService } from "../functions/fetchService";

/**
 * Obtiene documentos para reportes (ventas o compras) por mes.
 */
export const obtenerDocumentosReportes = async (
  empresaId: number,
  fecha: string,
  venta: boolean = false,
  tenant?: string
) => {
  const params = new URLSearchParams();
  params.set("empresa_id", String(empresaId));
  params.set("fecha", fecha);
  params.set("venta", venta ? "true" : "false");
  if (tenant) params.set("tenant", tenant);

  return await fetchService({
    url: `/api/reportes?${params.toString()}`,
    method: "GET",
  });
};
