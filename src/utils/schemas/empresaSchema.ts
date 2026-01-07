// src/utils/schemas/empresaSchema.ts
import { z, type ZodSchema } from 'zod';

export const empresaSchema: ZodSchema<any> = z.object({
  nombre_empresa: z.string().min(1, 'El nombre de la empresa es requerido'),
  nit: z.string().min(1, 'El NIT de la empresa es requerido'),
  direccion: z.string().min(1, 'La Dirección de la empresa es requerida'),
  sector: z.string().min(1, 'El Sector de la empresa es requerido'),
  actividad_economica: z
    .string()
    .min(1, 'La Actividad económica de la empresa es requerida'),
  correo: z
    .string()
    .email('El Correo principal debe ser un correo electrónico válido')
    .min(1, 'El Correo principal es requerido'),
  fecha_constitucion: z.date(),
  fecha_inscripcion: z.date(),
  tipo_personeria: z.string().min(1, 'El tipo de personería es requerido'),
  nomenclatura_id: z.number().positive('Seleccione una opción válida'),
  regimen_id: z.number().positive('Seleccione una opción válida'),
});

export const establecimientoSchema: ZodSchema<any> = z.object({
  nombre: z.string().min(1, 'El nombre del establecimiento es requerido'),
  numero_de_establecimiento: z
    .number()
    .positive('Número de establecimiento inválido'),
  direccion_comercial: z
    .string()
    .min(1, 'La dirección del establecimiento es requerida'),
  fecha_de_inicio_de_operaciones: z.date(),
  tipo_de_establecimiento: z
    .string()
    .min(1, 'El tipo del establecimiento es requerido'),
  clasificacion_por_establecimiento: z
    .string()
    .min(1, 'La clasificación del establecimiento es requerida'),
  actividad_economica: z
    .string()
    .min(1, 'La actividad económica del establecimiento es requerida'),
});

export const contadorSchema: ZodSchema<any> = z.object({
  nombre: z.string().min(1, 'El nombre del contador es requerido'),
  nit: z.string().min(1, 'El NIT del contador es requerido'),
  fecha_de_nombramiento: z.date(),
  tipo_de_prestacion_del_servicio: z
    .string()
    .min(1, 'El tipo de prestación es requerido'),
});

export const representanteSchema: ZodSchema<any> = z.object({
  nombre: z.string().min(1, 'El nombre del representante es requerido'),
  nit: z.string().min(1, 'El NIT del representante es requerido'),
  fecha_de_nombramiento: z.date(),
  tipo_de_representante: z
    .string()
    .min(1, 'El tipo de representante es requerido'),
});
