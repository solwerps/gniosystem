// src/utils/models/documentos.ts

export interface IDocumento {
  fecha_trabajo: string; // DateTime @db.Date
  fecha_emision: string;
  numero_autorizacion: string;
  tipo_dte: string;
  serie: string;
  numero_dte: string;
  nit_emisor: string;
  nombre_emisor: string;
  codigo_establecimiento: string;
  nombre_establecimiento: string;
  id_receptor: string;
  nombre_receptor: string;
  nit_certificador: string;
  nombre_certificador: string;
  moneda: string;
  monto_total: number;
  factura_estado: string;
  marca_anulado: string;
  fecha_anulacion: string | null;
  iva: number;
  petroleo: number;
  turismo_hospedaje: number;
  turismo_pasajes: number;
  timbre_prensa: number;
  bomberos: number;
  tasa_municipal: number;
  bebidas_alcoholicas: number;
  tabaco: number;
  cemento: number;
  bebidas_no_alcoholicas: number;
  tarifa_portuaria: number;
  tipo_operacion: "venta" | "compra";
  cuenta_debe: string | number | null; // Int? en Prisma o etiqueta formateada
  cuenta_haber: string | number | null; // Int? en Prisma o etiqueta formateada
  tipo: string;
  empresa_id: number;
  estado: number;
}

export interface IFactura {
  uuid: string;
  fecha_trabajo: string;
  fecha_emision: string;
  numero_autorizacion: string;
  tipo_dte: TipoDTE;
  serie: string;
  numero_dte: string;
  identificador_unico: string;
  nit_emisor: string;
  nombre_emisor: string;
  codigo_establecimiento: string;
  nombre_establecimiento: string;
  id_receptor: string;
  nombre_receptor: string;
  nit_certificador: string;
  nombre_certificador: string;
  moneda: string;

  // ⬇⬇⬇ AQUÍ ES DONDE CAMBIAMOS A number
  monto_total: number;
  monto_bien: number;
  monto_servicio: number;
  iva: number;
  petroleo: number;
  turismo_hospedaje: number;
  turismo_pasajes: number;
  timbre_prensa: number;
  bomberos: number;
  tasa_municipal: number;
  bebidas_alcoholicas: number;
  tabaco: number;
  cemento: number;
  bebidas_no_alcoholicas: number;
  tarifa_portuaria: number;
  // ⬆⬆⬆

  factura_estado: string;
  marca_anulado: string;
  fecha_anulacion: string | null;
  tipo_operacion: 'venta' | 'compra';
  cuenta_debe: string | number | null;
  cuenta_haber: string | number | null;
  tipo: string;
  empresa_id: number;
  estado: number;
}


export interface IGetDocumento {
  uuid: string;
  identificador_unico: string;
  fecha_trabajo: Date;
  fecha_emision: Date;
  numero_autorizacion: string;
  tipo_dte: string;
  serie: string;
  numero_dte: string;
  nit_emisor: string;
  nombre_emisor: string;
  codigo_establecimiento: string;
  establecimiento_receptor_id: null | number;
  nombre_establecimiento: string;
  id_receptor: string;
  nombre_receptor: string;
  nit_certificador: string;
  nombre_certificador: string;
  moneda: string;
  monto_total: string;
  monto_bien: string;
  monto_servicio: string;
  factura_estado: string;
  marca_anulado: string;
  fecha_anulacion: Date | null;
  iva: number;
  petroleo: number;
  turismo_hospedaje: number;
  turismo_pasajes: number;
  timbre_prensa: number;
  bomberos: number;
  tasa_municipal: number;
  bebidas_alcoholicas: number;
  tabaco: number;
  cemento: number;
  bebidas_no_alcoholicas: number;
  tarifa_portuaria: number;
  tipo_operacion: "venta" | "compra";
  cuenta_debe: string | number | null;
  cuenta_haber: string | number | null;
  tipo: TipoFactura;
  empresa_id: number;
  estado: number;
  comentario: null | string;
}

export interface IFact {
  numero_autorizacion: string;
  fecha_trabajo: string;
  fecha_emision: string;
  tipo_dte: string;
  serie: string;
  numero_dte: string;
  nit_emisor: string;
  nombre_emisor: string;
  codigo_establecimiento: string;
  establecimiento_receptor_id: null;
  nombre_establecimiento: string;
  id_receptor: string;
  nombre_receptor: string;
  nit_certificador: string;
  nombre_certificador: string;
  moneda: string;
  monto_total: number;
  monto_servicio: number;
  monto_bien: number;
  factura_estado: string;
  marca_anulado: string;
  fecha_anulacion: null | string;
  iva: number;
  petroleo: number;
  turismo_hospedaje: number;
  turismo_pasajes: number;
  timbre_prensa: number;
  bomberos: number;
  tasa_municipal: number;
  bebidas_alcoholicas: number;
  tabaco: number;
  cemento: number;
  bebidas_no_alcoholicas: number;
  tarifa_portuaria: number;
  tipo_operacion: string;
  cuenta_debe: string | number | null;
  cuenta_haber: string | number | null;
  tipo: string;
  empresa_id: number;
  estado: number;
  comentario: null | string;
}

export type TipoFactura =
  | "bien"
  | "servicio"
  | "bien_y_servicio"
  | "combustibles"
  | "pequeno_contribuyente"
  | "sin_derecho_credito_fiscal"
  | "medicamentos"
  | "vehiculos_nuevos"
  | "vehiculos_modelos_anteriores"
  | "importaciones_centro_america"
  | "importaciones_resto_mundo"
  | "adquisiciones_fyduca"
  | "compra_activos_fijos"
  | "importacion_activos_fijos";

export type TipoDTE =
  | "FACT"
  | "FCAM"
  | "FPEQ"
  | "FCAP"
  | "FESP"
  | "NABN"
  | "RDON"
  | "RECI"
  | "NDEB"
  | "NCRE";

export interface IUploadDocumento {
  "Fecha de emisión": string;
  "Número de Autorización": string;
  "Tipo de DTE (nombre)": string;
  Serie: string;
  "Número del DTE": string;
  "NIT del emisor": string;
  "Nombre completo del emisor": string;
  "Código de establecimiento": string;
  "Nombre del establecimiento": string;
  "ID del receptor": string;
  "Nombre completo del receptor": string;
  "NIT del Certificador": string;
  "Nombre completo del Certificador": string;
  Moneda: string;
  "Gran Total (Moneda Original)": string;
  Estado: string;
  "Marca de anulado": string;
  "Fecha de anulación": string;
  "IVA (monto de este impuesto)": string;
  "Petróleo (monto de este impuesto)": string;
  "Turismo Hospedaje (monto de este impuesto)": string;
  "Turismo Pasajes (monto de este impuesto)": string;
  "Timbre de Prensa (monto de este impuesto)": string;
  "Bomberos (monto de este impuesto)": string;
  "Tasa Municipal (monto de este impuesto)": string;
  "Bebidas alcohólicas (monto de este impuesto)": string;
  "Tabaco (monto de este impuesto)": string;
  "Cemento (monto de este impuesto)": string;
  "Bebidas no Alcohólicas (monto de este impuesto)": string;
  "Tarifa Portuaria (monto de este impuesto)": string;

  documento_tipo: string;
  operacion_tipo: string;
  cuenta_debe: number | null;
  cuenta_haber: number | null;

  // Estos se agregan dinámicamente al procesar el CSV
  "monto_bien"?: string;
  "monto_servicio"?: string;
  "bien_y_servicio"?: boolean;
}

export const tipo_impuesto = [
  { abeviacion: "IDP", key: "petroleo", documento: "Impuesto Distribución de Petróleo" },
  { abeviacion: "ITH", key: "turismo_hospedaje", documento: "Impuesto Turismo Hospedaje" },
  { abeviacion: "ITP", key: "turismo_pasajes", documento: "Impuesto Turismo Pasaje" },
  { abeviacion: "TDP", key: "timbre_prensa", documento: "Impuesto de Timbre de Prensa" },
  { abeviacion: "IFB", key: "bomberos", documento: "Impuesto a Favor del Cuerpo Voluntario de Bomberos" },
  { abeviacion: "MUN", key: "tasa_municipal", documento: "Tasa Municipal" },
  { abeviacion: "TAB", key: "tabaco", documento: "Impuesto de Tabaco y sus derivados" },
  { abeviacion: "CEM", key: "cemento", documento: "Impuesto de Distribución de Cemento" },
  { abeviacion: "IDB", key: "bebidas_alcoholicas", documento: "Impuesto Distribución de Bebidas Alcohólicas" },
  { abeviacion: "IBN", key: "bebidas_no_alcoholicas", documento: "Impuesto Bebidas no Alcohólicas" },
  { abeviacion: "TAP", key: "tarifa_portuaria", documento: "Tarifa Portuaria" },
];

export interface DocData {
  empresa_id: number;
  tipo_dte: string;
  moneda: string;
  tipo_operacion: string;
  tipo: string;

  fecha_emision: Date;
  fecha_anulacion: Date | null;
  fecha_trabajo: Date;
  importacion: boolean;

  numero_autorizacion: string;
  numero_dte: string;
  serie: string;
  nit_emisor: string;
  nombre_emisor: string;
  id_receptor: string;
  nombre_receptor: string;
  numero_de_establecimiento?: string;
  nombre_de_establecimiento?: string;

  // 💰 Totales
  monto_total: number;
  monto_servicio?: number; // opcional
  monto_bien?: number;     // opcional

  // 💸 Impuestos
  iva: number;
  petroleo: number;
  turismo_hospedaje: number;
  turismo_pasajes: number;
  timbre_prensa: number;
  bomberos: number;
  tasa_municipal: number;
  bebidas_alcoholicas: number;
  tabaco: number;
  cemento: number;
  bebidas_no_alcoholicas: number;
  tarifa_portuaria: number;

  // 🧾 Contabilidad
  cuenta_debe: number | null;
  cuenta_haber: number | null;
}

/**
 * 🔹 Documento que se arma en el front (UploadDocumentos)
 *    y se envía al endpoint /api/documentos/masivo
 */
export interface IDocUpload {
  // Datos básicos del documento
  serie: string;
  numero_dte: string;
  numero_autorizacion: string;
  tipo_dte: string;
  nit_emisor: string;
  nombre_emisor: string;

  // Receptor / establecimiento / certificador
  codigo_establecimiento?: string;
  nombre_establecimiento?: string;
  id_receptor?: string;
  nombre_receptor?: string;
  nit_certificador?: string;
  nombre_certificador?: string;

  // Fechas y estado
  fecha_emision?: string;
  estado?: string;
  marca_anulado?: string;
  fecha_anulacion?: string | null;

  // Moneda y tipo auxiliar
  moneda?: string;
  tipo?: string;

  // Montos principales
  monto_total?: number | string;
  monto_bien?: number | string;
  monto_servicio?: number | string;

  // Impuestos (pueden venir como string toFixed o número)
  iva?: number | string;
  petroleo?: number | string;
  turismo_hospedaje?: number | string;
  turismo_pasajes?: number | string;
  timbre_prensa?: number | string;
  bomberos?: number | string;
  tasa_municipal?: number | string;
  bebidas_alcoholicas?: number | string;
  bebidas_no_alcoholicas?: number | string;
  tabaco?: number | string;
  cemento?: number | string;
  tarifa_portuaria?: number | string;

  // Contabilidad
  cuenta_debe?: number | null;
  cuenta_haber?: number | null;

  // 🔹 Campos añadidos para compatibilidad GNIO
  identificador_unico?: string;
  fecha_trabajo?: string;
}
