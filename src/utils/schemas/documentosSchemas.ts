// src/utils/schemas/documentosSchemas.ts
import { z } from "zod";

// 📌 Schema para creación MANUAL (Formulario FacturaForm)
export const documentoSchema = z.object({
  empresa_id: z.number(), // lo pones desde parserData

  tipo_dte: z.string().min(1, "El tipo DTE es obligatorio"),
  moneda: z.string().min(1, "La moneda es obligatoria"),
  tipo_operacion: z.string().min(1, "Selecciona un tipo de operación valido"),
  tipo: z.string().min(1, "Selecciona un tipo de operación valido"),

  // En el form usas Date, así que z.date()
  fecha_emision: z.date(),
  importacion: z.boolean(),

  numero_autorizacion: z
    .string()
    .min(1, "El número de autorización es obligatorio"),
  numero_dte: z.string().min(1, "El número DTE es obligatorio"),
  serie: z.string().min(1, "La serie es obligatoria"),

  nit_emisor: z.string().optional(),
  nombre_emisor: z.string().optional(),
  id_receptor: z.string().optional(),
  nombre_receptor: z.string().optional(),

  // En el form viene como string/number → usamos coerce
  numero_de_establecimiento: z.coerce.number().optional(),
  nombre_de_establecimiento: z.string().optional(),

  // 💡 Aquí usamos z.coerce.number() para aceptar tanto "123" como 123
  monto_total: z
    .coerce.number()
    .nonnegative("El monto total no puede ser negativo")
    .min(1, "El total debe ser mayor a 0"),
  iva: z.coerce.number().nonnegative("El IVA no puede ser negativo"),
  petroleo: z.coerce.number().nonnegative(),
  turismo_hospedaje: z.coerce.number().nonnegative(),
  turismo_pasajes: z.coerce.number().nonnegative(),
  timbre_prensa: z.coerce.number().nonnegative(),
  bomberos: z.coerce.number().nonnegative(),
  tasa_municipal: z.coerce.number().nonnegative(),
  bebidas_alcoholicas: z.coerce.number().nonnegative(),
  tabaco: z.coerce.number().nonnegative(),
  cemento: z.coerce.number().nonnegative(),
  bebidas_no_alcoholicas: z.coerce.number().nonnegative(),
  tarifa_portuaria: z.coerce.number().nonnegative(),

  cuenta_debe: z.string().min(1, "La cuenta DEBE es obligatoria"),
  cuenta_haber: z.string().min(1, "La cuenta HABER es obligatoria"),
});
