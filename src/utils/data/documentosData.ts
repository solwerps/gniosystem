// src/utils/data/documentosData.ts

/**
 * 🔹 Catálogo de tipos de documentos de compra/venta.
 * Se usa en selects, validaciones y generación de libros contables.
 * En Prisma: Documento.tipo (String) y Documento.tipo_operacion (String)
 */

export interface TipoDocumento {
  value: string;
  label: string;
}

export const tiposDocumento: TipoDocumento[] = [
  { value: "bien", label: "Bien" },
  { value: "servicio", label: "Servicio" },
  { value: "bien_y_servicio", label: "Bien y Servicio" },
  { value: "pequeno_contribuyente", label: "Pequeño Contribuyente" },
  { value: "combustibles", label: "Combustibles" },
  { value: "sin_derecho_credito_fiscal", label: "No generan compensación del crédito fiscal" },
  { value: "medicamentos", label: "Medicamentos" },
  { value: "vehiculos_nuevos", label: "Vehículos Nuevos" },
  { value: "vehiculos_modelos_anteriores", label: "Vehículos modelos anteriores" },
  { value: "importaciones_centro_america", label: "Importaciones de Centro América" },
  { value: "importaciones_resto_mundo", label: "Importaciones del resto del mundo" },
  { value: "adquisiciones_fyduca", label: "Adquisiciones con FYDUCA" },
  { value: "compra_activos_fijos", label: "Compras Activos Fijos" },
  { value: "importacion_activos_fijos", label: "Importaciones Activos Fijos" },
];

export const tiposDocumentoVenta: TipoDocumento[] = [
  { value: "bien", label: "Ventas" },
  { value: "servicio", label: "Servicios Prestados" },
  { value: "bien_y_servicio", label: "Bien y Servicio" },
  { value: "pequeno_contribuyente", label: "Pequeño Contribuyente" },
  { value: "sin_derecho_credito_fiscal", label: "No generan compensación del crédito fiscal" },
  { value: "medicamentos", label: "Medicamentos" },
  { value: "vehiculos_modelos_anteriores", label: "Vehículos modelos anteriores" },
  { value: "vehiculos_nuevos", label: "Vehículos Nuevos" },
  { value: "exportaciones", label: "Exportaciones" },
];

export const tiposDocumentoCompra: TipoDocumento[] = [
  { value: "bien", label: "Compras" },
  { value: "servicio", label: "Servicios Recibidos" },
  { value: "bien_y_servicio", label: "Bien y Servicio" },
  { value: "pequeno_contribuyente", label: "Pequeño Contribuyente" },
  { value: "combustibles", label: "Combustibles" },
  { value: "sin_derecho_credito_fiscal", label: "No generan compensación del crédito fiscal" },
  { value: "medicamentos", label: "Medicamentos" },
  { value: "vehiculos_nuevos", label: "Vehículos Nuevos" },
  { value: "vehiculos_modelos_anteriores", label: "Vehículos modelos anteriores" },
  { value: "importaciones_centro_america", label: "Importaciones de Centro América" },
  { value: "importaciones_resto_mundo", label: "Importaciones del resto del mundo" },
  { value: "adquisiciones_fyduca", label: "Adquisiciones con FYDUCA" },
  { value: "compra_activos_fijos", label: "Compras Activos Fijos" },
  { value: "importacion_activos_fijos", label: "Importaciones Activos Fijos" },
];
