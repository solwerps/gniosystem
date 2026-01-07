// src/utils/schemas/nomenclaturaContableSchema.ts
import type { Nomenclatura } from '../models';
import { z, type ZodSchema } from 'zod';

export const nomenclaturaContableSchema: ZodSchema<Nomenclatura> = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
});
