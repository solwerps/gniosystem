// src/utils/model/nomenclaturas.ts

export interface Cuenta {
  id: number;
  cuenta: string;
  descripcion: string;
  nivel: number;
  naturaleza: string;
  nomenclaturaId: number;
}

export interface Nomenclatura {
  id?: number;
  nombre: string;
  descripcion: string;
  estado?: number;
}

export interface SelectOption {
  value: number;
  label: string;
}

// Alineado al enum Naturaleza de Prisma
export type CuentaTipo =
  | "ACTIVO"
  | "PASIVO"
  | "CAPITAL"
  | "INGRESOS"
  | "COSTOS"
  | "GASTOS"
  | "OTROS_INGRESOS"
  | "OTROS_GASTOS"
  | "REVISAR";
