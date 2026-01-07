// src/utils/services/polizas.ts
import type { SelectOption } from "@/utils";

type ApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

type TipoPolizaApi = {
  id: number;
  nombre: string;
};

export async function obtenerTipoPoliza(): Promise<ApiResponse<SelectOption[]>> {
  const res = await fetch("/api/tipo-poliza", { cache: "no-store" });

  if (!res.ok) {
    return {
      status: res.status,
      message: "Error al obtener tipos de póliza",
      data: [],
    };
  }

  const json = (await res.json()) as ApiResponse<TipoPolizaApi[]>;

  // Ojo: aquí asumimos que SelectOption.value es number
  const options: SelectOption[] =
    json.data?.map((p) => ({
      value: p.id,        // number, compatible con tu SelectOption
      label: p.nombre,
    })) ?? [];

  return {
    status: 200,
    message: "OK",
    data: options,
  };
}
