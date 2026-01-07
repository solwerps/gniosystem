// src/utils/services/nomenclatura.ts
import type { Cuenta, Nomenclatura} from "..";
import { fetchService } from "..";

/* =========================================================
 * CUENTAS (ya migradas a GNIO con Prisma)
 * ========================================================= */

export const obtenerCuentas = async (
  nomenclatura_contable_id: number,
  select: boolean = false
) => {
  // 🔹 Endpoint GNIO: /api/cuentas (Prisma + NomenclaturaCuenta)
  // Firma compatible con el viejo: usa nomenclatura_contable_id y select
  return await fetchService({
    url: `/api/cuentas?nomenclatura_contable_id=${nomenclatura_contable_id}&select=${select}`,
    method: "GET",
  });
};

export const obtenerCuentasByEmpresa = async (
  empresa_id: number,
  select: boolean = false,
  tenant?: string
) => {
  const qs = new URLSearchParams();
  qs.append("empresa_id", String(empresa_id));
  qs.append("select", String(select));
  if (tenant) qs.append("tenant", tenant);

  return await fetchService({
    url: `/api/cuentas/empresa?${qs.toString()}`,
    method: "GET",
  });
};

export const obtenerCuentasByNit = async (
  nit: number | string,
  select: boolean = false
) => {
  // 🔹 Endpoint GNIO: /api/cuentas/empresa/nit
  // Busca Empresa por NIT → Afiliaciones.nomenclaturaId → NomenclaturaCuenta
  return await fetchService({
    url: `/api/cuentas/empresa/nit?nit=${nit}&select=${select}`,
    method: "GET",
  });
};

export const crearCuentas = async (
  cuentas: Cuenta[],
  nomenclatura_contable_id: number
) => {
  // ⚠️ Este endpoint /api/cuentas/masivo es legado.
  // Si más adelante creas el equivalente GNIO para inserción masiva de cuentas,
  // solo actualizas esta URL y el front no se rompe.
  return await fetchService({
    url: `/api/cuentas/masivo`,
    method: "POST",
    body: JSON.stringify({ cuentas, nomenclatura_contable_id }),
  });
};

/* =========================================================
 * NOMENCLATURAS (adaptado a las APIs GNIO)
 * =========================================================
 *
 * Aquí GNIO usa:
 *   - GET  /api/nomenclaturas
 *   - POST /api/nomenclaturas
 *   - GET  /api/nomenclaturas/:id      (id = localId)
 *   - PUT  /api/nomenclaturas/:id
 *
 * Tus tipos:
 *   - Nomenclatura (id, nombre, descripcion, estado?)
 *   - Cuenta (id, cuenta, descripcion, nivel, naturaleza, nomenclaturaId)
 *
 * La idea: los services actúan como "adaptadores" para que
 * el resto del código pueda seguir usando las mismas firmas.
 * ========================================================= */

/**
 * Antes: /api/nomenclatura?select=true|false
 * Ahora: /api/nomenclaturas (GNIO, por tenant)
 *
 * Mantengo la firma:
 *  - select = true  → mapea a arreglo tipo { value, label }
 *  - select = false → mapea a arreglo de Nomenclatura
 */
export const obtenerNomenclaturaTipos = async (select: boolean = false) => {
  const res = await fetchService({
    url: `/api/nomenclaturas`,
    method: "GET",
  });

  // GNIO responde algo como: { ok: true, data: [ { id, nombre, descripcion, createdAt } ] }
  const nomList = Array.isArray(res?.data) ? res.data : [];

  if (select) {
    // Modo "combo": value/label como hacía el endpoint viejo
    const options = nomList.map((n: any) => ({
      value: n.id, // en GNIO: id = localId por tenant
      label: n.nombre as string,
    }));

    return {
      status: 200,
      data: options,
      message: "Tipos de Nomenclatura obtenidos correctamente",
    };
  }

  // Modo "lista completa": adaptado a tu interface Nomenclatura
  const tipos: Nomenclatura[] = nomList.map((n: any) => ({
    id: n.id,
    nombre: n.nombre,
    descripcion: n.descripcion ?? "",
    // estado ya no existe en GNIO; lo dejamos opcional
  }));

  return {
    status: 200,
    data: tipos,
    message: "Tipos de Nomenclatura obtenidos correctamente",
  };
};

/**
 * Antes: /api/nomenclatura/id?nomenclatura_id=...
 * Ahora: /api/nomenclaturas/:id   (id = localId por tenant)
 *
 * Mantengo la firma y devuelvo { status, data, message }
 */
export const obtenerNomenclaturaById = async (nomenclatura_id: number) => {
  const res = await fetchService({
    url: `/api/nomenclaturas/${nomenclatura_id}`,
    method: "GET",
  });

  if (!res?.ok) {
    return {
      status: 400,
      data: null,
      message: res?.error || "No se pudo obtener la nomenclatura",
    };
  }

  return {
    status: 200,
    data: res.data,
    message: "Nomenclatura obtenida correctamente",
  };
};

/**
 * Antes: POST /api/nomenclatura  { nombre, descripcion, cuentas }
 * Ahora: POST /api/nomenclaturas { nombre, descripcion, versionGNIO?, cuentas: [...] }
 *
 * Usamos tus Cuenta[] "simples" y las mapeamos a lo que espera GNIO
 * (poniendo valores por defecto razonables).
 */
export const crearNomenclatura = async (
  nombre: string,
  descripcion: string,
  cuentas: Cuenta[]
) => {
  // Mapeo mínimo de tus Cuenta al formato que espera GNIO
  const cuentasPayload = (cuentas || []).map((c, index) => ({
    orden: index + 1,
    cuenta: c.cuenta,
    descripcion: c.descripcion,
    // Defaults razonables para GNIO; puedes ajustarlos después si quieres
    debeHaber: "DEBE",
    principalDetalle: "P",
    nivel: c.nivel ?? 1,
    tipo: "BALANCE_GENERAL",
    naturaleza: c.naturaleza || "REVISAR",
    lockCuenta: false,
    lockDescripcion: false,
    lockDebeHaber: false,
    lockPrincipalDetalle: false,
    lockNivel: false,
    lockTipo: false,
    lockNaturaleza: false,
    lockAdd: true,
    lockDelete: true,
    isPlantilla: false,
  }));

  const res = await fetchService({
    url: `/api/nomenclaturas`,
    method: "POST",
    body: JSON.stringify({
      nombre,
      descripcion,
      versionGNIO: null,
      cuentas: cuentasPayload,
    }),
  });

  if (!res?.ok) {
    return {
      status: 400,
      data: null,
      message: res?.error || "No se pudo crear la nomenclatura",
    };
  }

  return {
    status: 201,
    data: res,
    message: "Nomenclatura y sus cuentas creadas correctamente",
  };
};

/**
 * Antes: PUT /api/nomenclatura  { nombre, descripcion, cuentas, nomenclatura_id }
 * Ahora: PUT /api/nomenclaturas/:id  { nombre?, descripcion?, cuentas? }
 *
 * El `nomenclatura_id` aquí corresponde al localId de GNIO (id por tenant).
 */
export const actualizarNomenclatura = async (
  nombre: string,
  descripcion: string,
  cuentas: Cuenta[],
  nomenclatura_id: number
) => {
  const cuentasPayload = (cuentas || []).map((c, index) => ({
    orden: index + 1,
    cuenta: c.cuenta,
    descripcion: c.descripcion,
    debeHaber: "DEBE",
    principalDetalle: "P",
    nivel: c.nivel ?? 1,
    tipo: "BALANCE_GENERAL",
    naturaleza: c.naturaleza || "REVISAR",
    lockCuenta: false,
    lockDescripcion: false,
    lockDebeHaber: false,
    lockPrincipalDetalle: false,
    lockNivel: false,
    lockTipo: false,
    lockNaturaleza: false,
    lockAdd: true,
    lockDelete: true,
    isPlantilla: false,
  }));

  const res = await fetchService({
    url: `/api/nomenclaturas/${nomenclatura_id}`,
    method: "PUT",
    body: JSON.stringify({
      nombre,
      descripcion,
      cuentas: cuentasPayload,
    }),
  });

  if (!res?.ok) {
    return {
      status: 400,
      data: null,
      message: res?.error || "Hubo un error al actualizar la nomenclatura y sus cuentas",
    };
  }

  return {
    status: 200,
    data: res,
    message: "Nomenclatura y sus cuentas actualizadas correctamente",
  };
};
