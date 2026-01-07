// src/utils/formularios.ts

export interface IResumenIsrOpcional {
  monto_bienes: number;
  monto_servicios: number;
  monto_descuentos: number;
  iva: number;
  monto_base: number;
  facturas_emitidas: number;
  retenciones_isr: number;
  monto_isr_porcentaje_5: number;
  monto_isr_porcentaje_7: number;
  isr: number;
  isr_retenido: number;
  isr_x_pagar: number;
}

export interface IResumenIVAMensual {
  uuid: string;
  debito_total: string;
  remanente_credito: string;
  credito_total: string;
  credito_periodo_siguiente: string;
  remanente_retenciones: string;
  retenciones_recibidas: string;
  retenciones_periodo_siguiente: string;
  impuesto_a_pagar: string;
  empresa_id: number | null;  // Prisma: empresa_id Int?
  fecha_trabajo: string;
  estado: number;
}
