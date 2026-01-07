// src/utils/services/usuarios.ts
import { fetchService } from "../functions/fetchService";

/**
 * 🔹 Obtiene todos los usuarios registrados en el entorno GNIO
 * Incluye su rol y tenant asignado
 */
export const obtenerUsuarios = async () => {
  return await fetchService({
    url: `/api/gnio/usuarios`,
    method: "GET",
  });
};
