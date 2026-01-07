// src/app/api/documentos/masivo/utils.ts

import { prisma } from "@/lib/prisma";
import type { Cuenta } from "@/utils/models/nomenclaturas";
import type { IFactura } from "@/utils/models/documentos";

// -----------------------------------------------------
// Utils
// -----------------------------------------------------
export const toNumber = (value: unknown): number => {
  const n = parseFloat(String(value ?? 0));
  return Number.isNaN(n) ? 0 : n;
};

// -----------------------------------------------------
// Cuentas por empresa (GNIO / multi-tenant)
// -----------------------------------------------------
export const getCuentasByEmpresa = async (
  empresa_id: number
): Promise<Cuenta[]> => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresa_id },
      include: { afiliaciones: true }, // puede ser objeto o array
    });

    if (!empresa) {
      throw new Error(`Empresa ${empresa_id} no encontrada`);
    }

    const af: any = (empresa as any).afiliaciones;
    let nomenclaturaId: number | undefined;

    // Soportar afiliaciones como objeto o como array
    if (Array.isArray(af)) {
      nomenclaturaId = af[0]?.nomenclaturaId;
    } else {
      nomenclaturaId = af?.nomenclaturaId;
    }

    if (!nomenclaturaId) {
      console.warn(
        `⚠️ Empresa ${empresa_id} no tiene nomenclaturaId en afiliaciones`
      );
      return [];
    }

    const cuentasRaw = await prisma.nomenclaturaCuenta.findMany({
      where: { nomenclaturaId },
      select: {
        id: true,
        cuenta: true,
        descripcion: true,
        nivel: true,
        naturaleza: true,
        nomenclaturaId: true,
      },
      orderBy: { cuenta: "asc" },
    });

    return cuentasRaw as unknown as Cuenta[];
  } catch (error) {
    console.error("❌ Error en getCuentasByEmpresa:", error);
    throw new Error(
      "No se pudieron obtener las cuentas contables de la empresa."
    );
  }
};

// -----------------------------------------------------
// Códigos base “estándar” (de la nomenclatura tipo Conta Cox)
// -----------------------------------------------------
const cuentaLabels = {
  ventas_bienes: 410101,
  ventas_servicios: 410102,
  gastos: 520218,
  caja: 110101,
  combustibles: 520223,
  fpeq: 520238,
  compras_servicios: 520239,
  compras_bienes: 520240,
};

// -----------------------------------------------------
// PARTIDA DEBE
// -----------------------------------------------------
export const partidaDebeHandler = (
  factura: IFactura,
  cuentas: Cuenta[],
  tipo_operacion: "venta" | "compra"
) => {
  const esVenta = tipo_operacion === "venta";

  const total = toNumber(factura.monto_total);
  const monto_bien = toNumber(factura.monto_bien);
  const monto_servicio = toNumber(factura.monto_servicio);

  // Cuenta configurada explícitamente en el documento (NomenclaturaCuenta.id)
  const cuentaConfig = cuentas.find(
    (c: any) => Number((c as any).id) === Number((factura as any).cuenta_debe)
  );

  // Cuentas estándar de la nomenclatura
  const cuentaCaja = cuentas.find(
    (c: any) => Number(c.cuenta) === cuentaLabels.caja // 110101
  );
  const cuentaComprasBienes = cuentas.find(
    (c: any) => Number(c.cuenta) === cuentaLabels.compras_bienes
  );

  // =====================================================
  // 1) VENTAS → SIEMPRE UNA PARTIDA DEBE POR EL TOTAL
  //    Caja (110101) o la cuenta_debe configurada
  // =====================================================
  if (esVenta) {
    // Prioridad: cuenta_debe configurada -> cuenta de caja estándar -> primer cuenta disponible
    const cuentaDestino =
      (cuentaConfig as any) ??
      (cuentaCaja as any) ??
      (cuentas.length ? (cuentas[0] as any) : undefined);

    if (!cuentaDestino || !total) {
      // Si no hay cuenta válida, no generamos partida
      return [];
    }

    return [
      {
        cuenta: cuentaDestino.id,
        monto_debe: total,
        monto_haber: 0,
        identificador_unico: (factura as any).identificador_unico,
      },
    ];
  }

  // =====================================================
  // 2) COMPRAS → DEBE repartido en bienes / servicios
  //    (misma idea que Conta Cox, sin partidas en 0)
  // =====================================================
  const cuenta = cuentaConfig;
  const partidas: any[] = [];

  if (monto_servicio > 0 && cuenta) {
    partidas.push({
      cuenta: (cuenta as any).id,
      monto_debe: monto_servicio,
      monto_haber: 0,
      identificador_unico: (factura as any).identificador_unico,
    });
  }

  if (monto_bien > 0) {
    const cuentaDestino =
      monto_bien > 0 && monto_servicio > 0
        ? cuentaComprasBienes ?? cuenta
        : cuenta;

    if (cuentaDestino) {
      partidas.push({
        cuenta: (cuentaDestino as any).id,
        monto_debe: monto_bien,
        monto_haber: 0,
        identificador_unico: (factura as any).identificador_unico,
      });
    }
  }

  // Fallback: si no generó nada pero el total > 0, al menos una partida DEBE
  if (!partidas.length && total > 0) {
    const cuentaFallback =
      cuenta ??
      cuentaComprasBienes ??
      cuentaCaja ??
      (cuentas.length ? (cuentas[0] as any) : null);

    if (cuentaFallback) {
      partidas.push({
        cuenta: (cuentaFallback as any).id,
        monto_debe: total,
        monto_haber: 0,
        identificador_unico: (factura as any).identificador_unico,
      });
    }
  }

  // Filtrar posibles partidas en 0
  return partidas.filter(
    (p) => toNumber(p.monto_debe) !== 0 || toNumber(p.monto_haber) !== 0
  );
};

// -----------------------------------------------------
// PARTIDA HABER
// -----------------------------------------------------
export const partidaHaberHandler = (
  factura: IFactura,
  cuentas: Cuenta[],
  tipo_operacion: "venta" | "compra"
) => {
  const venta = tipo_operacion === "venta";

  const cuenta = cuentas.find(
    (c: any) => Number((c as any).id) === Number((factura as any).cuenta_haber)
  );

  const cuenta_bienes = cuentas.find(
    (c: any) =>
      Number(c.cuenta) ===
      (venta ? cuentaLabels.ventas_bienes : cuentaLabels.caja)
  );

  const monto_bien = toNumber(factura.monto_bien);
  const monto_servicio = toNumber(factura.monto_servicio);
  const total = toNumber(factura.monto_total);

  const partidas: any[] = [];

  if (monto_servicio > 0 && cuenta) {
    partidas.push({
      cuenta: (cuenta as any).id,
      monto_debe: 0,
      monto_haber: venta ? monto_servicio : total,
      identificador_unico: (factura as any).identificador_unico,
    });
  }

  if (monto_bien > 0) {
    const cuentaDestino =
      monto_bien > 0 && monto_servicio > 0 ? cuenta_bienes : cuenta;

    if (cuentaDestino) {
      partidas.push({
        cuenta: (cuentaDestino as any).id,
        monto_debe: 0,
        monto_haber: venta ? monto_bien : total,
        identificador_unico: (factura as any).identificador_unico,
      });
    }
  }

  // Fallback para ventas: si no hay cuenta configurada/estándar pero hay total, usamos cualquier cuenta_haber o la primera cuenta
  if (!partidas.length && venta && total > 0) {
    const fallback =
      (cuenta as any) ??
      (cuenta_bienes as any) ??
      (cuentas.length ? (cuentas[0] as any) : null);
    if (fallback) {
      partidas.push({
        cuenta: fallback.id,
        monto_debe: 0,
        monto_haber: total,
        identificador_unico: (factura as any).identificador_unico,
      });
    }
  }

  const suma_partidas = partidas.reduce(
    (suma, p) => suma + toNumber(p.monto_haber),
    0
  );

  if (suma_partidas > total && partidas.length > 0) {
    return [partidas[0]];
  }

  return partidas;
};

// -----------------------------------------------------
// PARTIDA IVA
// -----------------------------------------------------
export const partidaIvaHandler = (
  factura: IFactura,
  cuentas: Cuenta[],
  tipo_operacion: "venta" | "compra"
) => {
  const ivaNumber = toNumber(factura.iva);
  if (!ivaNumber) {
    return {
      cuenta: null,
      monto_debe: 0,
      monto_haber: 0,
      identificador_unico: (factura as any).identificador_unico,
      validacion: false,
    };
  }

  const venta = tipo_operacion === "venta";
  const codigoCuenta = venta ? 210201 : 110401; // estándar Conta Cox
  // Intentar por código estándar; si no existe, usar la cuenta_haber/debe configurada como fallback
  let cuenta = cuentas.find((c: any) => Number(c.cuenta) === codigoCuenta);
  if (!cuenta) {
    cuenta = cuentas.find(
      (c: any) => Number((c as any).id) === Number((factura as any).cuenta_haber)
    );
  }

  const monto_debe = venta ? 0 : ivaNumber;
  const monto_haber = venta ? ivaNumber : 0;

  const hayCuenta = !!cuenta;

  return {
    cuenta: hayCuenta ? (cuenta as any).id : null,
    monto_debe,
    monto_haber,
    identificador_unico: (factura as any).identificador_unico,
    // solo se intenta insertar si hay monto Y cuenta
    validacion: hayCuenta && ivaNumber !== 0,
  };
};

// -----------------------------------------------------
// PARTIDA DESCUENTOS / IMPUESTOS ESPECIALES
// -----------------------------------------------------
export const partidaDescuentoHandler = (
  factura: IFactura,
  cuentas: Cuenta[],
  tipo_operacion: "venta" | "compra"
) => {
  const venta = tipo_operacion === "venta";

  const petroleo = toNumber(factura.petroleo);
  const turismo_hospedaje = toNumber(factura.turismo_hospedaje);
  const turismo_pasajes = toNumber(factura.turismo_pasajes);
  const timbre_prensa = toNumber(factura.timbre_prensa);
  const bomberos = toNumber(factura.bomberos);
  const tasa_municipal = toNumber(factura.tasa_municipal);
  const bebidas_alcoholicas = toNumber(factura.bebidas_alcoholicas);
  const tabaco = toNumber(factura.tabaco);
  const cemento = toNumber(factura.cemento);
  const bebidas_no_alcoholicas = toNumber(factura.bebidas_no_alcoholicas);
  const tarifa_portuaria = toNumber(factura.tarifa_portuaria);

  const descuentos =
    petroleo +
    turismo_hospedaje +
    turismo_pasajes +
    timbre_prensa +
    bomberos +
    tasa_municipal +
    bebidas_alcoholicas +
    tabaco +
    cemento +
    bebidas_no_alcoholicas +
    tarifa_portuaria;

  if (!descuentos) {
    return {
      cuenta: null,
      identificador_unico: (factura as any).identificador_unico,
      monto_debe: 0,
      monto_haber: 0,
      validacion: false,
    };
  }

  const monto_debe = venta ? 0 : descuentos;
  const monto_haber = venta ? descuentos : 0;

  let cuenta_cuenta = 520224;

  if (petroleo > 0) {
    cuenta_cuenta = 520236;
  } else if (turismo_hospedaje > 0) {
    cuenta_cuenta = 520116;
  } else if (turismo_pasajes > 0) {
    cuenta_cuenta = 520112;
  } else if (timbre_prensa > 0) {
    cuenta_cuenta = 510211;
  } else if (bomberos > 0) {
    cuenta_cuenta = 520122;
  } else if (cemento > 0) {
    cuenta_cuenta = 510210;
  } else if (bebidas_no_alcoholicas > 0) {
    cuenta_cuenta = 510209;
  } else if (bebidas_alcoholicas > 0) {
    cuenta_cuenta = 510208;
  } else if (tabaco > 0) {
    cuenta_cuenta = 510207;
  } else if (tarifa_portuaria > 0) {
    cuenta_cuenta = 510206;
  }

  const cuenta =
    cuentas.find((c: any) => Number(c.cuenta) === cuenta_cuenta) ??
    cuentas.find(
      (c: any) => Number((c as any).id) === Number((factura as any).cuenta_haber)
    ) ??
    (cuentas.length ? (cuentas[0] as any) : null);
  const hayCuenta = !!cuenta;

  return {
    cuenta: hayCuenta ? (cuenta as any).id : null,
    identificador_unico: (factura as any).identificador_unico,
    monto_debe,
    monto_haber,
    // solo se inserta si hay monto Y cuenta
    validacion: hayCuenta && descuentos > 0,
  };
};

// -----------------------------------------------------
// UPDATE CORRELATIVO (GNIO)
// -----------------------------------------------------
export const updateCorrelativo = async (
  asientos_insertados: number,
  empresa_id: number
): Promise<void> => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresa_id },
      include: { gestiones: true },
    });

    if (!empresa?.gestiones) {
      console.warn(
        `⚠️ Empresa ${empresa_id} sin gestiones vinculadas. No se actualizó correlativo.`
      );
      return;
    }

    const gestiones: any = empresa.gestiones;
    const correlativos_previos = (gestiones.correlativos as any[]) ?? [];

    const nuevo_registro = {
      asientos_insertados,
      fecha: new Date().toISOString(),
    };

    await prisma.gestiones.update({
      where: { id: gestiones.id },
      data: {
        correlativos: [...correlativos_previos, nuevo_registro],
      },
    });
  } catch (error) {
    console.error("❌ Error actualizando correlativo:", error);
    throw new Error("Error actualizando correlativo en GNIO.");
  }
};
