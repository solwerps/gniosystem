// src/utils/services/formularios.ts
import { fetchService } from "../functions/fetchService";
import type { IResumenIsrOpcional } from "../models";

/**
 * 🔹 Crea o actualiza el formulario ISR Opcional Mensual
 */
export const crearIsrOpcional = async (
  empresaId: number,
  fechaTrabajo: string,
  resumenData: IResumenIsrOpcional
) => {
  return await fetchService({
    url: `/api/gnio/empresas/${empresaId}/formularios/isr-opcional`,
    method: "POST",
    body: JSON.stringify({
      empresaId,
      fechaTrabajo,
      resumenData,
    }),
  });
};

/**
 * 🔹 Crea o actualiza el formulario IVA General Mensual
 */
export const crearIvaMensual = async (
  empresaId: number,
  fechaTrabajo: string,
  resumenData: any
) => {
  return await fetchService({
    url: `/api/gnio/empresas/${empresaId}/formularios/iva-general`,
    method: "POST",
    body: JSON.stringify({
      empresaId,
      fechaTrabajo,
      resumenData,
    }),
  });
};

/**
 * 🔹 Obtiene el formulario IVA General Mensual por empresa y mes
 */
export const obtenerIvaMensual = async (
  empresaId: number,
  fechaTrabajo: string
) => {
  return await fetchService({
    url: `/api/gnio/empresas/${empresaId}/formularios/iva-general?fecha=${fechaTrabajo}`,
    method: "GET",
  });
};
