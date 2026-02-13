// src/types/empresas.ts
export type RazonSocial = "Individual" | "Juridico";
export type Moneda = "GTQ" | "USD" | "MXN";
export type AccountingMode = "CAJA" | "DEVENGO";

export type RegimenOption = {
  id: number;
  regimenSistema: string;   // nombre específico / variación
  nombreComun?: string;     // tipo o nombre común (IVA PCQ, ISR MENSUAL, etc.)
};

export type NomenclaturaOption = { id: number; nombre: string };
export type CuentaOpt = { id: number; codigo: string; descripcion: string };

export type ObligacionRow = {
  id: string;
  impuesto: string;               // IVA | ISR | ISO | Otro
  codigoFormulario?: string;
  fechaPresentacion?: string;     // ISO yyyy-mm-dd
  nombreObligacion?: string;
};

export type FolioLibro = {
  libro: string;
  disponibles: number;
  usados: number;
  ultimaFecha: string | null;     // ISO yyyy-mm-dd
};

export type CuentaBancariaForm = {
  numero: string;
  banco: string;
  descripcion?: string;
  moneda: Moneda;
  saldoInicial: number;
  cuentaContableId?: number;
};
