// src/utils/functions/validateData.ts
'use server';

import prisma from '@/lib/prisma';

/**
 * Verifica si un valor es único en una tabla (modelo Prisma).
 *
 * @param table      Nombre del modelo Prisma, por ejemplo: 'usuario', 'empresa', 'cuenta'
 *                   (debe coincidir con prisma.<modelo>, ej: prisma.empresa → 'empresa')
 * @param field      Campo a validar, por ejemplo: 'nit', 'email', 'nombre'
 * @param value      Valor que se quiere comprobar
 * @param extraWhere Filtros adicionales opcionales, ej: { empresa_id: 1 }
 *
 * @returns true si el valor NO existe (es único), false si ya existe o hay error.
 */
export const isValueUnique = async (
  table: string,
  field: string,
  value: string | number,
  extraWhere: Record<string, any> = {}
): Promise<boolean> => {
  try {
    const model = (prisma as any)[table];

    // Si el modelo no existe en Prisma, devolvemos false (mejor no validar a ciegas)
    if (!model || typeof model.findFirst !== 'function') {
      console.error(`Modelo Prisma "${table}" no encontrado en isValueUnique.`);
      return false;
    }

    const where = {
      [field]: value,
      ...extraWhere,
    };

    const existing = await model.findFirst({ where });

    // Si existe → NO es único
    return !existing;
  } catch (error) {
    console.error('Error en isValueUnique:', error);
    // En caso de error, devolvemos false por seguridad
    return false;
  }
};
