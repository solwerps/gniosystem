// src/utils/services/libros.ts
import { fetchService } from "../functions/fetchService";

/**
 * 🔹 Libro de Compras
 */
// src/utils/services/libros.ts
export const obtenerDocumentosLibrosCompras = async (
  empresaId: number,
  fecha: string | Date,
  venta: boolean = false,
  orden: "ascendente" | "descendente" = "ascendente"
) => {
  const params = new URLSearchParams();

  params.set("empresa_id", String(empresaId));

  // Normalizamos fecha a string, igual que hacía Conta Cox
  const fechaParam =
    fecha instanceof Date ? fecha.toISOString() : String(fecha);
  params.set("fecha", fechaParam);

  params.set("venta", venta ? "true" : "false");
  params.set("orden", orden);

  return fetchService({
    url: `/api/libros/compras?${params.toString()}`,
    method: "GET",
  });
};


/**
 * 🔹 Libro de Ventas
 */
export const obtenerLibroVentas = async (
  empresaId: number,
  fecha: string | Date,
  venta: boolean = true,
  orden: "ascendente" | "descendente" = "ascendente"
) => {
  const params = new URLSearchParams();

  params.set("empresa_id", String(empresaId));

  const fechaParam =
    fecha instanceof Date ? fecha.toISOString() : String(fecha);
  params.set("fecha", fechaParam);

  params.set("venta", venta ? "true" : "false");
  params.set("orden", orden);

  return fetchService({
    url: `/api/libros/ventas?${params.toString()}`,
    method: "GET",
  });
};

/**
 * 🔹 Libro Diario (por documentos)
 */
export const obtenerLibroDiario = async (
  empresaId: number,
  fecha: Date,
  orden: string = "ascendente"
) => {
  return await fetchService({
    url: `/api/libros/diario?empresa_id=${empresaId}&fecha=${fecha.toISOString()}&orden=${orden}`,
    method: "GET",
  });
};

/**
 * 🔹 Libro Diario (por partidas)
 */
export const obtenerPartidasLibroDiario = async (
  empresaId: number,
  fecha: Date
) => {
  return await fetchService({
    url: `/api/gnio/empresas/${empresaId}/libros/diario/partidas?fecha=${fecha.toISOString()}`,
    method: "GET",
  });
};

/**
 * 🔹 Libro Diario (por asientos contables)
 */
export const obtenerAsientosLDiario = async (
  empresaId: number,
  fecha: string | Date,
  orden: "ascendente" | "descendente" = "ascendente"
) => {
  const params = new URLSearchParams();

  params.set("empresa_id", String(empresaId));

  const fechaParam =
    fecha instanceof Date ? fecha.toISOString() : String(fecha);
  params.set("fecha", fechaParam);

  params.set("orden", orden);

  return fetchService({
    url: `/api/libros/diario/asientos?${params.toString()}`,
    method: "GET",
  });
};
/**
 * 🔹 Libro de Balance General (por asientos)
 */
export const obtenerAsientosBalanceGeneral = async (
  empresaId: number,
  fechaInicio: Date | null,
  fechaFin: Date | null
) => {
  let url = `/api/gnio/empresas/${empresaId}/libros/balance/asientos`;
  if (fechaInicio && fechaFin) {
    url += `?fechaInicio=${fechaInicio.toISOString()}&fechaFin=${fechaFin.toISOString()}`;
  }
  return await fetchService({
    url,
    method: "GET",
  });
};

/**
 * 🔹 Libro de Balance General (por documentos)
 */
export const obtenerDocumentosBalanceGeneral = async (
  empresaId: number,
  fechaInicio: Date | null,
  fechaFin: Date | null
) => {
  let url = `/api/gnio/empresas/${empresaId}/libros/balance/documentos`;
  if (fechaInicio && fechaFin) {
    url += `?fechaInicio=${fechaInicio.toISOString()}&fechaFin=${fechaFin.toISOString()}`;
  }
  return await fetchService({
    url,
    method: "GET",
  });
};

/**
 * 🔹 Libro Mayor (por cuentas contables)
 */
export const obtenerPartidasLibroMayor = async (
  empresaId: number,
  fecha: string | Date,
  orden: "ascendente" | "descendente" = "ascendente"
) => {
  const params = new URLSearchParams();

  params.set("empresa_id", String(empresaId));

  const fechaParam =
    fecha instanceof Date ? fecha.toISOString() : String(fecha);
  params.set("fecha", fechaParam);

  params.set("orden", orden);

  return fetchService({
    url: `/api/libros/mayor?${params.toString()}`,
    method: "GET",
  });
};
