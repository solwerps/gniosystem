// src/utils/services/partidas.ts
import { fetchService } from "../functions/fetchService";
import type { IAsientoContableForm } from "../models";

/**
 * Obtiene tipos de póliza para el tenant actual.
 *   select = true  → [{ value, label }]
 *   select = false → filas completas de tipos_polizas.
 */
export const obtenerPolizas = async (
  tenant: string,
  select: boolean = true,
  empresaId?: number
) => {
  const params = new URLSearchParams();
  params.set("tenant", tenant);
  params.set("select", String(select));
  if (empresaId) params.set("empresa_id", String(empresaId));

  return await fetchService({
    url: `/api/partidas/polizas?${params.toString()}`,
    method: "GET",
  });
};

/**
 * Lista asientos contables (partidas) para una empresa del tenant.
 * - tenant       → slug del tenant (ej. "contador")
 * - empresa_id   → ID de Empresa (GNIO)
 * - dates        → array [desde, hasta] en Date
 *                  (se envían como "YYYY-MM-DD,YYYY-MM-DD")
 * - poliza_id    → filtro por tipo de póliza
 * - correlativo  → filtro por correlativo exacto
 */
export const obtenerAsientosContables = async (
  tenant: string,
  empresa_id: number,
  dates: Date[],
  poliza_id: number,
  correlativo: string
) => {
  let url = `/api/partidas?tenant=${encodeURIComponent(tenant)}`;
  const params = new URLSearchParams();

  params.append("empresa_id", empresa_id.toString());

  // 👇 CORRECCIÓN: enviar fechas como YYYY-MM-DD
  if (dates && dates.length > 0) {
    const compactDates = dates
      .filter((d) => !!d)
      .map((d) => {
        const iso = d.toISOString(); // 2025-12-10T00:00:00.000Z
        return iso.slice(0, 10);     // 2025-12-10
      });

    if (compactDates.length > 0) {
      params.append("dates", compactDates.join(",")); // "2025-12-10,2025-12-31"
    }
  }

  if (poliza_id && poliza_id !== 0) {
    params.append("poliza_id", poliza_id.toString());
  }

  if (correlativo && correlativo.trim() !== "") {
    params.append("correlativo", correlativo.trim());
  }

  const qs = params.toString();
  if (qs) url += `&${qs}`;

  return await fetchService({
    url,
    method: "GET",
  });
};

/**
 * Crea un asiento contable + sus partidas para una empresa del tenant.
 */
export const crearAsientoContable = async (
  tenant: string,
  empresa_id: number,
  data: IAsientoContableForm
) => {
  return await fetchService({
    url: `/api/partidas/asiento_contable?tenant=${encodeURIComponent(
      tenant
    )}`,
    method: "POST",
    body: JSON.stringify({
      ...data,
      empresa_id,
      tenant,
    }),
  });
};
