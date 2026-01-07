// src/utils/functions/hasAuthorized.ts
import { NextURL } from 'next/dist/server/web/next-url';

/**
 * GNIO – Helper de autorización por rol y ruta.
 *
 * 🔹 Por ahora NO usamos navList ni un mapa centralizado de rutas,
 *     así que esta función actúa como stub para no romper el build.
 *
 * 🔹 Más adelante puedes implementar aquí la lógica real de autorización,
 *     por ejemplo según prefijos:
 *       - /dashboard/admin        -> solo ADMIN
 *       - /dashboard/contador/... -> CONTADOR, ADMIN
 *       - /dashboard/empresa/...  -> EMPRESA, CONTADOR, ADMIN
 */
export const hasAuthorized = (rol: number, { pathname }: NextURL): boolean => {
  // TODO: implementar reglas reales según `rol` y `pathname` cuando
  // tengas definido el modelo de permisos definitivo en GNIO.

  // De momento, dejamos todo permitido para no bloquear el flujo.
  return true;
};
