// src/utils/schemas/partidaSchema.ts

import { z } from "zod";
import type { IAsientoContableForm, IPartidaForm } from "../models/partida";

/**
 * Validación de una partida individual dentro de un asiento contable.
 */
export const partidaSchema: z.ZodType<IPartidaForm> = z.object({
  cuenta_id: z
    .number()
    .int("La cuenta debe ser un número entero")
    .positive("La cuenta es obligatoria"),
  monto_debe: z
    .number()
    .nonnegative("El monto debe ser mayor o igual a 0"),
  monto_haber: z
    .number()
    .nonnegative("El monto debe ser mayor o igual a 0"),
});

/**
 * Validación del formulario de Asiento Contable completo.
 */
export const asientoContableSchema: z.ZodType<IAsientoContableForm> = z.object({
  empresa_id: z
    .number()
    .positive("Seleccione una empresa válida"),
  poliza_id: z
    .number()
    .positive("Seleccione un tipo de póliza válido"),
  fecha_trabajo: z.date(),
  partidas: z
    .array(partidaSchema)
    .min(1, "Debes agregar al menos una partida"),
});
