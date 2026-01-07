// src/utils/schemas/cuentaBancariaSchema.ts
import { z, ZodSchema } from 'zod';

export const cuentaBancariaSchema: ZodSchema<any> = z.object({
    numero: z
        .string()
        .min(1, 'El número de cuenta es requerido')
        .max(50, 'El número de cuenta no puede exceder los 50 caracteres'),
    banco: z
        .string()
        .min(1, 'El nombre del banco es requerido')
        .max(100, 'El nombre del banco no puede exceder los 100 caracteres'),
    descripcion: z
        .string()
        .max(255, 'La descripción no puede exceder los 255 caracteres')
        .optional(),
    moneda: z
        .string()
        .min(1, 'La moneda es requerida')
        .max(10, 'El código de moneda no puede exceder los 10 caracteres'),
    saldoInicial: z
        .string()
        .regex(
            /^\d+(\.\d{1,2})?$/,
            'El saldo inicial debe ser un número válido con hasta 2 decimales'
        )
        .default('0.00'),
    cuentaContableId: z.string().optional()
});
