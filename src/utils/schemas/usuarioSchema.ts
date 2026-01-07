// src/utils/schemas/usuarioSchema.ts
import { z, type ZodSchema } from 'zod';
import type { IUsuarioForm } from '../models';

export const usuarioSchema: ZodSchema<IUsuarioForm> = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  user: z.string().min(1, 'El usuario es obligatorio'),
  password: z.string().min(1, 'El usuario es obligatorio'),
  correo: z
    .string()
    .email('El Correo debe ser un correo electrónico válido')
    .min(1, 'El Correo es requerido'),
  rol_id: z.number().positive('Seleccione una opción valida'),
});
