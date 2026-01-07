// src/utils/services/empresas.ts
import { fetchService } from "../functions/fetchService";
import type { IEmpresa, IEmpresaForm } from "../models";

export const obtenerEmpresas = async (tenant?: string) => {
  const query = tenant ? `?tenant=${tenant}` : "";
  return await fetchService({
    url: `/api/empresas${query}`,
    method: "GET",
  });
};

/**
 * 🔹 Obtiene una empresa por ID (ruta nueva /api/empresas/:id)
 */
export const obtenerEmpresa = async (empresaId: number, tenant?: string) => {
  const query = tenant ? `?tenant=${tenant}` : "";
  return await fetchService({
    url: `/api/empresas/${empresaId}${query}`,
    method: "GET",
  });
};

/**
 * 🔹 Obtiene una empresa por NIT (único dentro del tenant)
 */
export const obtenerEmpresaPorNit = async (nit: string) => {
  return await fetchService({
    url: `/api/gnio/empresas/nit/${nit}`,
    method: "GET",
  });
};

/**
 * 🔹 Obtiene los establecimientos de una empresa por NIT
 */
export const obtenerEstablecimientosPorNit = async (nit: string) => {
  return await fetchService({
    url: `/api/gnio/empresas/${nit}/establecimientos`,
    method: "GET",
  });
};

/**
 * 🔹 Obtiene los regímenes fiscales disponibles (IVA / ISR)
 */
export const obtenerRegimenes = async (select: boolean = false) => {
  return await fetchService({
    url: `/api/gnio/regimenes?select=${select}`,
    method: "GET",
  });
};

/**
 * 🔹 Crea una nueva empresa dentro del tenant GNIO
 */
export const crearEmpresa = async (data: IEmpresaForm) => {
  return await fetchService({
    url: `/api/gnio/empresas`,
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * 🔹 Actualiza la información de una empresa existente
 */
export const actualizarEmpresa = async (data: IEmpresaForm) => {
  return await fetchService({
    url: `/api/gnio/empresas`,
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * 🔹 Carga masiva de empresas (importación)
 */
export const crearEmpresasMasivo = async (empresas: IEmpresaForm[]) => {
  return await fetchService({
    url: `/api/gnio/empresas/masivo`,
    method: "POST",
    body: JSON.stringify({ empresas }),
  });
};

/**
 * 🔹 Crea un establecimiento vinculado a una empresa
 */
export const crearEstablecimiento = async (data: any) => {
  return await fetchService({
    url: `/api/gnio/establecimientos`,
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * 🔹 Actualiza un establecimiento existente
 */
export const actualizarEstablecimiento = async (data: any) => {
  return await fetchService({
    url: `/api/gnio/establecimientos`,
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * 🔹 Elimina un establecimiento
 */
export const eliminarEstablecimiento = async (establecimientoId: number) => {
  return await fetchService({
    url: `/api/gnio/establecimientos`,
    method: "DELETE",
    body: JSON.stringify({ establecimientoId }),
  });
};

/**
 * 🔹 Actualiza la configuración de cuentas contables predeterminadas
 *    (para vincular cuentas de debe/haber con nomenclatura del tenant)
 */
export const actualizarConfiguracionCuentasContables = async (
  cuentaDebe: string | null,
  cuentaHaber: string | null,
  nit: string
) => {
  return await fetchService({
    url: `/api/gnio/empresas/configuracion-cuentas`,
    method: "PUT",
    body: JSON.stringify({
      cuentaDebe,
      cuentaHaber,
      nit,
    }),
  });
};
