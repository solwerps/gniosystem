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
  fechaInicio?: string | Date | null,
  fechaFin?: string | Date | null
) => {
  const params = new URLSearchParams();
  params.set("empresa_id", String(empresaId));

  if (fechaInicio) {
    const inicio =
      fechaInicio instanceof Date
        ? fechaInicio.toISOString().slice(0, 10)
        : String(fechaInicio);
    params.set("date1", inicio);
  }

  if (fechaFin) {
    const fin =
      fechaFin instanceof Date
        ? fechaFin.toISOString().slice(0, 10)
        : String(fechaFin);
    params.set("date2", fin);
  }

  return fetchService({
    url: `/api/libros/balance/asientos?${params.toString()}`,
    method: "GET",
  });
};

/**
 * 🔹 Libro de Balance General (por documentos)
 */
export const obtenerDocumentosBalanceGeneral = async (
  empresaId: number,
  fechaInicio?: string | Date | null,
  fechaFin?: string | Date | null
) => {
  const params = new URLSearchParams();
  params.set("empresa_id", String(empresaId));

  if (fechaInicio) {
    const inicio =
      fechaInicio instanceof Date
        ? fechaInicio.toISOString().slice(0, 10)
        : String(fechaInicio);
    params.set("date1", inicio);
  }

  if (fechaFin) {
    const fin =
      fechaFin instanceof Date
        ? fechaFin.toISOString().slice(0, 10)
        : String(fechaFin);
    params.set("date2", fin);
  }

  return fetchService({
    url: `/api/libros/balance/documentos?${params.toString()}`,
    method: "GET",
  });
};

// Alias para compatibilidad con nombres antiguos
export const obtenerAsientosBG = obtenerAsientosBalanceGeneral;
export const obtenerDocumentosBG = obtenerDocumentosBalanceGeneral;

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
