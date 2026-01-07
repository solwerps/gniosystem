// src/utils/models/retenciones.ts

// ==============================
// Retenciones IVA
// ==============================

// Representa una fila ya procesada de la tabla `retenciones_iva`
// Prisma: model RetencionIva { ... } mapeado a @@map("retenciones_iva")
export interface IRetencionIVA {
  uuid: string;
  empresa_id: number;      // FK a Empresa.id
  fecha_trabajo: string;   // Date en DB, aquí como string ISO 'YYYY-MM-DD'
  nit_retenedor: string;
  nombre_retenedor: string;
  estado_constancia: string;
  constancia: string;
  fecha_emision: string;   // Date en DB, string en front
  total_factura: number;   // Decimal(10,2) en DB → number en front
  importe_neto: number;    // Decimal(10,2)
  afecto_retencion: number;// Decimal(10,2)
  total_retencion: number; // Decimal(10,2)
}

// Representa una fila tal como viene del archivo (Excel/CSV) de la SAT
// Se usan exactamente los encabezados de las columnas.
export interface IUploadRetencionIVA {
  'NIT RETENEDOR': string;
  'NOMBRE RETENEDOR': string;
  'ESTADO CONSTANCIA': string;
  'CONSTANCIA': string;
  'FECHA EMISION': string;
  'TOTAL FACTURA': string;
  'IMPORTE NETO': string;
  'AFECTO RETENCIÓN': string;
  'TOTAL RETENCIÓN': string;
}

// ==============================
// Retenciones ISR
// ==============================

// Representa una fila ya procesada de la tabla `retenciones_isr`
// Prisma: model RetencionIsr { ... } mapeado a @@map("retenciones_isr")
export interface IRetencionISR {
  uuid: string;
  empresa_id: number;      // FK a Empresa.id
  fecha_trabajo: string;   // Date en DB, aquí como string ISO 'YYYY-MM-DD'
  nit_retenedor: string;
  nombre_retenedor: string;
  estado_constancia: string;
  constancia: string;
  fecha_emision: string;   // Date en DB, string en front
  total_factura: number;   // Decimal(10,2)
  renta_imponible: number; // Decimal(10,2)
  total_retencion: number; // Decimal(10,2)
}

// Igual que en IVA: formato crudo del archivo de la SAT para ISR
export interface IUploadRetencionISR {
  'NIT RETENEDOR': string;
  'NOMBRE RETENEDOR': string;
  'ESTADO CONSTANCIA': string;
  'CONSTANCIA': string;
  'FECHA EMISION': string;
  'TOTAL FACTURA': string;
  'RENTA IMPONIBLE': string;
  'TOTAL RETENCIÓN': string;
}
