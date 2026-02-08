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
    url: `/api/formularios/isrOpcional`,
    method: "POST",
    body: JSON.stringify({
      empresa_id: empresaId,
      fecha: fechaTrabajo,
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
    url: `/api/formularios/ivaMensual`,
    method: "POST",
    body: JSON.stringify({
      empresa_id: empresaId,
      fecha: fechaTrabajo,
      resumenData,
    }),
  });
};

// Alias legacy para compatibilidad con imports antiguos
export const crearIVAMensual = crearIvaMensual;

/**
 * 🔹 Obtiene el formulario IVA General Mensual por empresa y mes
 */
export const obtenerIvaMensual = async (
  empresaId: number,
  fechaTrabajo: string
) => {
  return await fetchService({
    url: `/api/formularios/ivaMensual?empresa_id=${empresaId}&fecha=${fechaTrabajo}`,
    method: "GET",
  });
};

// Alias legacy para compatibilidad con imports antiguos
export const getIVAMensual = obtenerIvaMensual;
