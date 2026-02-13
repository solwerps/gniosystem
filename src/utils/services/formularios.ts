// src/utils/services/formularios.ts
import { fetchService } from "../functions/fetchService";
import type { IResumenIsrOpcional } from "../models";

/**
 * 🔹 Crea o actualiza el formulario ISR Opcional Mensual
 */
export const crearIsrOpcional = async (
  empresaId: number,
  fechaTrabajo: string,
  resumenData: IResumenIsrOpcional,
  tenant?: string
) => {
  return await fetchService({
    url: `/api/formularios/isrOpcional`,
    method: "POST",
    body: JSON.stringify({
      empresa_id: empresaId,
      fecha: fechaTrabajo,
      resumenData,
      tenant,
    }),
  });
};

/**
 * 🔹 Crea o actualiza el formulario IVA General Mensual
 */
export const crearIvaMensual = async (
  empresaId: number,
  fechaTrabajo: string,
  resumenData: any,
  tenant?: string
) => {
  return await fetchService({
    url: `/api/formularios/ivaMensual`,
    method: "POST",
    body: JSON.stringify({
      empresa_id: empresaId,
      fecha: fechaTrabajo,
      resumenData,
      tenant,
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
  fechaTrabajo: string,
  tenant?: string
) => {
  const params = new URLSearchParams();
  params.set("empresa_id", String(empresaId));
  params.set("fecha", fechaTrabajo);
  if (tenant) params.set("tenant", tenant);

  return await fetchService({
    url: `/api/formularios/ivaMensual?${params.toString()}`,
    method: "GET",
  });
};

// Alias legacy para compatibilidad con imports antiguos
export const getIVAMensual = obtenerIvaMensual;
