// src/utils/schemas/cuentaContableSchema.ts
import { z, ZodSchema } from 'zod';

export const cuentaContableSchema: ZodSchema<any> = z.object({
    cuenta: z.string().min(1, 'El número de cuenta es obligatorio.'),
    descripcion: z.string().min(1, 'La descripción es obligatoria.'),
});
