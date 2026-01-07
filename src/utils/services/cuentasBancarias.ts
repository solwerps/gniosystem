// src/utils/services/cuentasBancarias.ts
import { fetchService } from "../functions/fetchService";
import type { ICuentaBancariaForm } from "../models";

/**
 * 🔹 Obtiene todas las cuentas bancarias de una empresa según su NIT.
 *    (Usado generalmente para vincular cuentas o validar duplicados)
 */
export const obtenerCuentasBancariasPorNit = async (
  nit: string,
  select: boolean = false
) => {
  return await fetchService({
    url: `/api/gnio/cuentas-bancarias?nit=${nit}&select=${select}`,
    method: "GET",
  });
};

/**
 * 🔹 Crea una nueva cuenta bancaria GNIO
 *    (enlazada a empresaId y cuentaContableId del tenant)
 */
export const crearCuentaBancaria = async (data: ICuentaBancariaForm) => {
  return await fetchService({
    url: `/api/gnio/cuentas-bancarias`,
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * 🔹 Obtiene todas las cuentas bancarias por empresaId
 *    (usado en dashboards de empresa)
 */
export const obtenerCuentasBancariasPorEmpresa = async (
  empresaId: number,
  select: boolean = false
) => {
  return await fetchService({
    url: `/api/gnio/empresas/${empresaId}/cuentas-bancarias?select=${select}`,
    method: "GET",
  });
};

/**
 * 🔹 Obtiene movimientos de una cuenta bancaria GNIO
 *    (filtrados por rango de fechas)
 */
export const obtenerMovimientosBancarios = async (
  cuentaBancariaId: number,
  fechas: Date[]
) => {
  const queryParams = new URLSearchParams({
    cuentaBancariaId: cuentaBancariaId.toString(),
    fechaInicio: fechas[0].toISOString(),
    fechaFin: fechas[1].toISOString(),
  });

  return await fetchService({
    url: `/api/gnio/cuentas-bancarias/movimientos?${queryParams.toString()}`,
    method: "GET",
  });
};
