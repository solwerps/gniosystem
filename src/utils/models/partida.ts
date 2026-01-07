// src/utils/models/partida.ts

/**
 * Partida tal como viene del backend GNIO:
 * - Tabla `partidas`
 * - Join con NomenclaturaCuenta (cuenta contable)
 */
export interface IPartida {
  uuid: string;
  monto_debe: number;              // Normalizado a número
  monto_haber: number;             // Normalizado a número
  cuenta_id: number;               // FK a NomenclaturaCuenta.id
  empresa_id: number | null;       // Puede ser null en algunos casos
  asiento_contable_id: number;     // FK a AsientoContable.id
  descripcion: string | null;      // NomenclaturaCuenta.descripcion (JOIN)
  cuenta: string | null;           // NomenclaturaCuenta.cuenta (código)
  referencia?: string | null;      // Referencia opcional de la partida
}

/**
 * Payload que envía el front para crear un asiento contable.
 * Se alinea con la API POST /api/partidas/asiento_contable.
 */
export interface IPartidaForm {
  cuenta_id: number;           // Int en Prisma -> number
  monto_debe: number;
  monto_haber: number;
  referencia?: string;
}

/**
 * Payload completo del asiento contable enviado al backend.
 */
export interface IAsientoContableForm {
  empresa_id: number;
  poliza_id: number;
  descripcion?: string;
  fecha_trabajo: Date;
  partidas: IPartidaForm[];
}

/**
 * Estructura de respuesta de GET /api/partidas
 */
export interface IGetAsientoContable {
  asiento_id: number;
  fecha: string;               // ISO de la BD
  empresa_id: number;
  descripcion: string | null;
  correlativo: number;
  referencia?: string | null;
  poliza_nombre: string | null;
  partidas: IPartida[];
  estado?: number;
}

/**
 * Modelo “en memoria” para manipular partidas en el front
 * (por ejemplo, en tablas editables de asientos).
 */
export interface PartidaAsiento {
  uuid: string;
  cuenta: string;              // Código contable, ej. "1101-01"
  cuenta_id: number;           // Id de NomenclaturaCuenta
  empresa_id: number | null;
  descripcion: string | null;
  monto_debe: number;
  monto_haber: number;
  referencia: string | null;
  principal?: 0 | 1;
  asiento_contable_id: number;
}
