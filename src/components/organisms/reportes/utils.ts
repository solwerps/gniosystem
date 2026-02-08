// src/components/organisms/reportes/utils.ts
import { IFactura, IGetDocumento, IRetencionISR, IRetencionIVA, TipoDTE, TipoFactura } from "@/utils";

interface IDocumentoServicio extends IGetDocumento {
    tipo: 'servicio'; // Solo documentos de tipo servicio
}

const calcularOperacionBase = (documento: any): number => {
    const descuentos = parseFloat(documento.petroleo) + parseFloat(documento.turismo_hospedaje) + parseFloat(documento.turismo_pasajes) + parseFloat(documento.timbre_prensa) + parseFloat(documento.bomberos) + parseFloat(documento.tasa_municipal) + parseFloat(documento.bebidas_alcoholicas) + parseFloat(documento.tabaco) + parseFloat(documento.cemento) + parseFloat(documento.bebidas_no_alcoholicas) + parseFloat(documento.tarifa_portuaria);

    const base = (parseFloat(documento.monto_total) - descuentos) / 1.12;
    return base;
};

// Función para obtener la suma total de las operaciones base de los documentos de tipo servicio
export const calcularCrudo = (documentos: IGetDocumento[], servicio: boolean): number => {
    const sumaOperacionesBase = documentos
        .filter(documento => documento.fecha_anulacion === null) // Filtrar documentos no anulados
        .filter((documento): documento is IDocumentoServicio => documento.tipo === (servicio ? 'servicio' : 'bien')) // Filtrar documentos de tipo bien o servicio
        .reduce((total, documento) => total + calcularOperacionBase(documento), 0); // Calcular monto - (total_descuentos) / 1.12

    return parseFloat(sumaOperacionesBase.toFixed(2));
};

export const calculateBase = (documentos: IGetDocumento[]): number[] => {
    let bienes = 0;
    let servicios = 0;
    documentos
        .filter(documento => documento.fecha_anulacion === null)
        .forEach(documento => {
            bienes += parseFloat(documento.monto_bien) || 0;
            servicios += parseFloat(documento.monto_servicio) || 0;
        });

    return [parseFloat(bienes.toFixed(2)), parseFloat(servicios.toFixed(2))];
};

export const calcularTotalDescuentos = (documentos: any[]): number => {
    const totalDescuentos = documentos
        .filter(documento => documento.fecha_anulacion === null) // Filtrar documentos no anulados
        .reduce((total, documento) => {
            const descuentos = parseFloat(documento.petroleo) + parseFloat(documento.turismo_hospedaje) + parseFloat(documento.turismo_pasajes) + parseFloat(documento.timbre_prensa) + parseFloat(documento.bomberos) + parseFloat(documento.tasa_municipal) + parseFloat(documento.bebidas_alcoholicas) + parseFloat(documento.tabaco) + parseFloat(documento.cemento) + parseFloat(documento.bebidas_no_alcoholicas) + parseFloat(documento.tarifa_portuaria);

            return total + descuentos;
        }, 0);

    return totalDescuentos;
};

export const sumarIVA = (documentos: IGetDocumento[]): number => {
    const totalIVA = documentos
        .filter(documento => documento.fecha_anulacion === null) // Filtrar documentos no anulados
        .reduce((total, documento: any) => {
            const iva = parseFloat(documento.iva);
            return total + iva;
        }, 0);

    return totalIVA;
};

export const calcularBase = (documentos: IGetDocumento[]): number => {
    const servicios = calcularCrudo(documentos, true);
    const bienes = calcularCrudo(documentos, false);
    return parseFloat((servicios + bienes).toFixed(2));
}

export const sumarRetenciones = (retenciones: IRetencionISR[]): number => {
    const total_retenciones = retenciones.filter(retencion => retencion.estado_constancia == "EMITIDA" || retencion.estado_constancia == "PAGADA").reduce((total, retencion: any) => {
        const total_retencion = parseFloat(retencion.total_retencion);
        return total + total_retencion;
    }, 0);
    return parseFloat(total_retenciones.toFixed(2));
};

export const calcularISR = (monto_base: number): number => {
    const margen = 30000;
    if (monto_base > margen) {
        const impuestoFijo = parseFloat((margen * 0.05).toFixed(2)); // 1500
        const excedente = parseFloat(((monto_base - margen) * 0.07).toFixed(2));
        return impuestoFijo + excedente;
    } else {
        return parseFloat((monto_base * 0.05).toFixed(2));
    }
};

export const calcularMontoTipo = (tipo_fact: TipoFactura, documentos: any[], tipos_dte: TipoDTE[] = ["FACT", "NCRE" ,"FCAM", "RECI", "FESP"]) => {
    // Filtrar documentos no anulados y del tipo especificado
    const filteredDocumentos = documentos.filter(
        documento => !documento.fecha_anulacion && documento.tipo === tipo_fact && tipos_dte.includes(documento.tipo_dte)
    );

    const base_suma = filteredDocumentos.reduce((acc, documento) => {
        const { monto_total, iva } = documento;

        const descuentos_total = parseFloat(documento.petroleo) + parseFloat(documento.turismo_hospedaje) + parseFloat(documento.turismo_pasajes) + parseFloat(documento.timbre_prensa) + parseFloat(documento.bomberos) + parseFloat(documento.tasa_municipal) + parseFloat(documento.bebidas_alcoholicas) + parseFloat(documento.tabaco) + parseFloat(documento.cemento) + parseFloat(documento.bebidas_no_alcoholicas) + parseFloat(documento.tarifa_portuaria);
        const base = parseFloat(monto_total) - parseFloat(iva) - descuentos_total;
        acc += base;
        return acc;
    }, 0);


    const iva_total = filteredDocumentos.reduce((acc, documento) => {
        const { iva } = documento;
        acc += parseFloat(iva);
        return acc;
    }, 0);
    return [+base_suma.toFixed(2), +iva_total.toFixed(2)];
};

export const calculateTipoDTE = (documentos: IFactura[], tipo_fact: TipoFactura, tipos_dte_excluidos: TipoDTE[] = ['FPEQ', 'FCAP']): [number, number] => {
    const filteredDocumentos = documentos.filter(
        documento => !documento.fecha_anulacion && !tipos_dte_excluidos.includes(documento.tipo_dte) && documento.tipo === tipo_fact && parseFloat(documento.iva) != 0
    );

    const { monto_base, monto_impuesto } = filteredDocumentos.reduce(
        (acc, documento) => {
            const bien = parseFloat(documento.monto_bien) || 0;
            const servicio = parseFloat(documento.monto_servicio) || 0;
            const iva = parseFloat(documento.iva) || 0;
            const totalBase = bien + servicio;

            if (documento.tipo_dte === 'NCRE') {
                // Si es NCRE, restamos
                acc.monto_base -= totalBase;
                acc.monto_impuesto -= iva;
            } else {
                // Si no es NCRE, sumamos
                acc.monto_base += totalBase;
                acc.monto_impuesto += iva;
            }

            return acc;
        },
        { monto_base: 0, monto_impuesto: 0 }
    );

    return [parseFloat(monto_base.toFixed(2)), parseFloat(monto_impuesto.toFixed(2))];
};

export const calculateBienYServicio = (documentos: IFactura[],tipo_fact: TipoFactura,tipos_dte_excluidos: TipoDTE[] = ['FPEQ', 'FCAP']) => {
    const filteredDocumentos = documentos.filter(
        (documento) => !documento.fecha_anulacion && !tipos_dte_excluidos.includes(documento.tipo_dte) && documento.tipo === tipo_fact
    );

    const { base_bienes, base_servicios } = filteredDocumentos.reduce(
        (acc, documento) => {
            const bien = parseFloat(documento.monto_bien) || 0;
            const servicio = parseFloat(documento.monto_servicio) || 0;

            if (documento.tipo_dte === 'NCRE') {
                acc.base_bienes -= bien;
                acc.base_servicios -= servicio;
            } else {
                acc.base_bienes += bien;
                acc.base_servicios += servicio;
            }

            return acc;
        },
        { base_bienes: 0, base_servicios: 0 }
    );

    const creditos_bienes = base_bienes * 0.12;
    const creditos_servicios = base_servicios * 0.12;

    return [
        parseFloat(base_bienes.toFixed(2)),
        parseFloat(base_servicios.toFixed(2)),
        parseFloat(creditos_bienes.toFixed(2)),
        parseFloat(creditos_servicios.toFixed(2))
    ];
};

export const calculateSuma = (values: number[]): number => {
    const suma = values.reduce((acc, item) => acc + item, 0);
    return suma;
};

export const calculateExentos = (documentos: any[]) => {
    const filteredDocumentos = documentos.filter(
        documento => !documento.fecha_anulacion && documento.iva == 0
    );

    const monto_sumatoria = filteredDocumentos.reduce((acc, documento) => {
        const { monto_bien, monto_servicio } = documento;
        acc += parseFloat(monto_bien) + parseFloat(monto_servicio);
        return acc;
    }, 0);

    return +monto_sumatoria.toFixed(2);
};


export const calculatePeqContribuyente = (documentos: any[]) => {
    const filteredDocumentos = documentos.filter(
        documento => !documento.fecha_anulacion && ['FPEQ', 'FCAP'].includes(documento.tipo_dte)
    );

    const monto_sumatoria = filteredDocumentos.reduce((acc, documento) => {
        const { monto_total } = documento;
        acc += parseFloat(monto_total);
        return acc;
    }, 0);

    return +monto_sumatoria.toFixed(2);
};

export const calculateDocsSinDerechoCreditoFiscal = (documentos: any[]) => {
    const filteredDocsByType = documentos.filter(
        documento => !documento.fecha_anulacion && ['RECI', 'RDON'].includes(documento.tipo_dte) // Filtra los documentos que no esten anulados y sean de los tipos ['RECI']
    );

    const monto_sumatoria = filteredDocsByType.reduce((acc, documento) => {
        const { monto_total } = documento;
        acc += parseFloat(monto_total);
        return acc;
    }, 0);

    return +monto_sumatoria.toFixed(2);
};

export const calculateNotaCreditoMonto = (documentos: any[]) => {
    const filteredDocumentos = documentos.filter(
        documento => !documento.fecha_anulacion && documento.tipo_dte === "NCRE"
    );

    const sumas = filteredDocumentos.reduce(
        (acc, documento) => {
            const { monto_total, monto_bien, monto_servicio, iva } = documento;
            acc.monto_total += parseFloat(monto_total);
            acc.monto_base += parseFloat(monto_bien) + parseFloat(monto_servicio);
            acc.iva += parseFloat(iva);
            return acc;
        },
        { monto_total: 0, monto_base: 0, iva: 0 }
    );

    return [
        +sumas.monto_total.toFixed(2),
        +sumas.monto_base.toFixed(2),
        +sumas.iva.toFixed(2)
    ];
};

export const calculateRetencionesTotal = (retenciones: IRetencionIVA[]) => {
    const filteredRetenciones = retenciones.filter(
        retencion => retencion.estado_constancia == "EMITIDA" || retencion.estado_constancia == "PAGADA"
    );

    const totalRetenciones = filteredRetenciones.reduce((acc, retencion) => {
        const { total_retencion } = retencion;
        acc += parseFloat(total_retencion.toString());
        return acc;
    }, 0);

    return +totalRetenciones.toFixed(2);
}

export const calculateSaldoRetenciones = (
    creditos_mayor_que_debitos: number,
    debitos_mayor_que_creditos: number,
    retenciones_periodo_anterior: number,
    retenciones_periodo_declarar: number
) => {
    let saldo_retenciones = 0;
    let impuesto_a_pagar = 0;

    const z = retenciones_periodo_anterior + retenciones_periodo_declarar;

    if (debitos_mayor_que_creditos > 0) {
        if (z === 0) {
            // Caso: d > 0, z = 0
            impuesto_a_pagar = debitos_mayor_que_creditos;
            saldo_retenciones = 0;
        } else if (z > 0) {
            // Caso: d > 0, z > 0
            const x = z - debitos_mayor_que_creditos;
            if (x >= 0) {
                saldo_retenciones = x;
                impuesto_a_pagar = 0;
            } else {
                saldo_retenciones = 0;
                impuesto_a_pagar = Math.abs(x);
            }
        }
    } else if (creditos_mayor_que_debitos > 0) {
        if (z > 0) {
            // Caso: c > 0, z > 0
            saldo_retenciones = z;
            impuesto_a_pagar = 0;
        }
    } else if (z > 0) {
        // Caso: z > 0, d = 0, c = 0
        saldo_retenciones = z;
        impuesto_a_pagar = 0;
    }

    return { saldo_retenciones, impuesto_a_pagar };
};
  

// export const calculateFactBien = (documentos: any[], tipos_dte_excluidos: TipoDTE[] = ['FPEQ', 'FCAP']): [number, number]  => {
//     // fact_bien - monto_total_fact_... - descuentos - iva = monto_base
//     // iva = iva
//     const filteredDocumentos = documentos.filter(
//         documento => !documento.fecha_anulacion && !tipos_dte_excluidos.includes(documento.tipo_dte) && documento.tipo !== "servicio"
//     );

//     const filteredDocumentos2 = documentos.filter(
//         documento => !documento.fecha_anulacion && !tipos_dte_excluidos.includes(documento.tipo_dte) && documento.tipo == "bien"
//     );
//     const filteredDocumentos3 = documentos.filter(
//         documento => !documento.fecha_anulacion && !tipos_dte_excluidos.includes(documento.tipo_dte) && documento.tipo == "servicio"
//     );

//     const filteredDocumentos4 = documentos.filter(
//         documento => !documento.fecha_anulacion && !tipos_dte_excluidos.includes(documento.tipo_dte) && documento.tipo !== "servicio" && documento.tipo !== "bien" && documento.tipo !== "bien_y_servicio"
//     );

//     const monto_base_bien = 0;
//     const monto_base_both = 0;
//     const monto_demas = 0;

//     const monto_base = 0; 
//     const monto_impuesto = 0;
//     return [parseFloat(monto_base.toFixed(2)), parseFloat(monto_impuesto.toFixed(2))];
// };
