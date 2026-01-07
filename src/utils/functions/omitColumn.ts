// src/utils/functions/omitColumn.ts
import type { IDocumento } from "@/utils/models";

export const omitColumn = (documentos: any[], columna: keyof IDocumento): boolean => {
  return documentos.every(
    (doc) => doc[columna] === '0.00' || doc[columna] === null
  );
};
