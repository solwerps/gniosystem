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
  select: boolean = false,
  tenant?: string
) => {
  const qs = new URLSearchParams({
    id: String(empresaId),
    select: String(select),
  });
  if (tenant) {
    qs.append("tenant", tenant);
  }

  return await fetchService({
    url: `/api/cuentasBancarias/id?${qs.toString()}`,
    method: "GET",
  });
};

/**
 * 🔹 Alias estilo Conta Cox para obtener cuentas por empresaId.
 */
export const obtenerCuentasBancariasByEmpresaId = async (
  id: number,
  select: boolean = false,
  tenant?: string
) => {
  const qs = new URLSearchParams({
    id: String(id),
    select: String(select),
  });
  if (tenant) {
    qs.append("tenant", tenant);
  }

  return await fetchService({
    url: `/api/cuentasBancarias/id?${qs.toString()}`,
    method: "GET",
  });
};

/**
 * 🔹 Obtiene movimientos de una cuenta bancaria GNIO
 *    (filtrados por rango de fechas)
 */
export const obtenerMovimientosBancarios = async (
  cuentaBancariaId: number,
  fechas: Date[],
  empresaId: number,
  tenant?: string
) => {
  const queryParams = new URLSearchParams({
    cuenta_bancaria_id: cuentaBancariaId.toString(),
    fecha_inicio: fechas[0].toISOString(),
    fecha_fin: (fechas[1] ?? fechas[0]).toISOString(),
    empresa_id: String(empresaId),
  });
  if (tenant) {
    queryParams.append("tenant", tenant);
  }

  return await fetchService({
    url: `/api/cuentasBancarias/movimientos?${queryParams.toString()}`,
    method: "GET",
  });
};
