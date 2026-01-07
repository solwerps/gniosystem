// src/utils/services/reportes.ts
import { fetchService } from "../functions/fetchService";

/**
 * 🔹 Obtiene los documentos del módulo de reportes (compras o ventas)
 * Multi-tenant adaptado al modelo Empresa ↔ Tenant
 */
export const obtenerDocumentosReportes = async (
  empresaId: number,
  fecha: string,
  venta: boolean = false
) => {
  return await fetchService({
    url: `/api/gnio/empresas/${empresaId}/reportes?fecha=${fecha}&venta=${venta}`,
    method: "GET",
  });
};
