// src/components/organisms/reportes/IVAMensual.tsx
"use client";
import { Button, PDFIcon, Text } from "@/components/atoms";
import { Table } from "@/components/molecules";
import {
    IFactura,
    IResumenIVAMensual,
    IRetencionIVA,
    crearIVAMensual,
    getIVAMensual,
    obtenerRetencionesIVA,
    obtenerDocumentosReportes,
    parseDate,
    parseMonto,
} from "@/utils";
import clsx from "clsx";
import React, { useEffect, useState } from "react";
import type { TableColumn } from "react-data-table-component";
import {
    calculateBienYServicio,
    calculateDocsSinDerechoCreditoFiscal,
    calculateExentos,
    calculateNotaCreditoMonto,
    calculatePeqContribuyente,
    calculateRetencionesTotal,
    calculateSaldoRetenciones,
    calculateTipoDTE
} from "./utils";
import { toast } from "react-toastify";

export const IVAMensual = ({
    date,
    empresa,
    tenantSlug,
    clearFunction,
}: {
    date: string;
    empresa: number;
    tenantSlug: string;
    clearFunction: () => void;
}) => {
    // Documentos
    const [documentosVentas, setDocumentosVentas] = useState<IFactura[]>([]);
    const [documentosCompras, setDocumentosCompras] = useState<IFactura[]>([]);
    const [retenciones, setRetenciones] = useState<IRetencionIVA[]>([]);
    const [formularioPasado, setFormularioPasado] = useState<IResumenIVAMensual>({
        uuid: "",
        debito_total: "",
        remanente_credito: "",
        credito_total: "",
        credito_periodo_siguiente: "",
        remanente_retenciones: "",
        retenciones_recibidas: "",
        retenciones_periodo_siguiente: "",
        impuesto_a_pagar: "",
        empresa_id: 0,
        fecha_trabajo: "",
        estado: 0,
    });

    // loaders
    const [loading, setLoading] = useState(true);
    const [loadingSubmit, setLoadingSubmit] = useState(false);

    // States Data
    const [debitos, setDebitos] = useState([
        {
            key: 'Ventas y Servicios Exentos',
            base: 0,
            debitos: 0
        },
        {
            key: 'Ventas de medicamentos',
            base: 0,
            debitos: 0
        },
        {
            key: 'Ventas no afectas a contribuyentes...',
            base: 0,
            debitos: 0
        },
        {
            key: 'Ventas de vehiculos de años antiguos',
            base: 0,
            debitos: 0
        },
        {
            key: 'Ventas de vehiculos nuevos',
            base: 0,
            debitos: 0
        },
        {
            key: 'Ventas gravadas',
            base: 0,
            debitos: 0
        },
        {
            key: 'Servicios gravados',
            base: 0,
            debitos: 0
        },
        {
            key: 'Sumatoria',
            base: 0,
            debitos: 0
        }
    ]);

    const [creditos, setCreditos] = useState([
        {
            key: 'Compras de Medicamentos',
            base: 0,
            creditos: 0
        },
        {
            key: 'Compras y servicios adquiridos de pequeños contribuyentes',
            base: 0,
            creditos: 0
        },
        {
            key: 'Compras que no generan crédito Fiscal',
            base: 0,
            creditos: 0
        },
        {
            key: 'Compras de vehiculos de años antiguos',
            base: 0,
            creditos: 0
        },
        {
            key: 'Compras de vehiculos nuevos',
            base: 0,
            creditos: 0
        },
        {
            key: 'Compras de combustibles',
            base: 0,
            creditos: 0
        },
        {
            key: 'Otras Compras',
            base: 0,
            creditos: 0
        },
        {
            key: 'Servicios Adquiridos',
            base: 0,
            creditos: 0
        },
        {
            key: 'Importaciones de Centro América',
            base: 0,
            creditos: 0
        },
        {
            key: 'Adquisiciones con FYDUCA',
            base: 0,
            creditos: 0
        },
        {
            key: 'Importaciones del resto del mundo',
            base: 0,
            creditos: 0
        },
        {
            key: 'IVA conforme constancias de exención recibidas',
            base: 0,
            creditos: 0,
            input: true
        },
        {
            key: 'Remanente de crédito fiscal del período anterior',
            base: 0,
            creditos: 0,
            input: true
        },
        {
            key: 'Sumatoria',
            base: 0,
            creditos: 0
        }
    ]);

    const [impuestos, setImpuestos] = useState([
        {
            key: "Créditos mayor que Débitos",
            monto: 0,
        },
        {
            key: "Débitos mayor que Créditos",
            monto: 0,
        },
        {
            key: "Saldo del Impuesto",
            monto: 0,
        },
        {
            key: "Retenciones IVA del período anterior",
            monto: 0,
            input: true
        },
        {
            key: "Retenciones IVA del período a declarar",
            monto: 0,
        },
        {
            key: "Saldo de retenciones para el período siguiente",
            monto: 0,
        },
        {
            key: "Impuesto a Pagar",
            monto: 0,
        }
    ]);
    const [operacionesCantidad, setOperacionesCantidad] = useState([
        {
            key: 'Facturas',
            emitidas: 0,
            recibidas: 0
        },
        {
            key: 'FYDUCA',
            emitidas: 0,
            recibidas: 0
        },
        {
            key: 'Constancias de exención',
            emitidas: 0,
            recibidas: 0
        },
        {
            key: 'Constancias de Retención de IVA',
            emitidas: 0,
            recibidas: 0
        },
        {
            key: 'Facturas Especiales',
            emitidas: 0,
            recibidas: 0
        },
        {
            key: 'Notas de crédito',
            emitidas: 0,
            recibidas: 0
        },
        {
            key: 'Notas de débito',
            emitidas: 0,
            recibidas: 0
        }
    ]);
    const [operacionesMonto, setOperacionesMonto] = useState([
        {
            key: 'Valor de las notas de crédito del período',
            emitidas: 0,
            recibidas: 0
        },
        {
            key: 'Valor de las notas de débito del período',
            emitidas: 0,
            recibidas: 0
        }
    ]);

    useEffect(() => {
        const getData = async () => {
            try {
                if (date && empresa) {
                    setLoading(true);

                    setCreditos(prevCreditos => prevCreditos.map(credito => {
                        if (credito.key === 'Remanente de crédito fiscal del período anterior') {
                            return {
                                key: 'Remanente de crédito fiscal del período anterior',
                                base: 0,
                                creditos: 0,
                                input: true
                            };
                        }
                        return credito;
                    }));

                    setImpuestos(prevImpuestos => prevImpuestos.map(impuesto => {
                        if (impuesto.key === 'Retenciones IVA del período anterior') {
                            return {
                                key: "Retenciones IVA del período anterior",
                                monto: 0,
                                input: true
                            };
                        }
                        return impuesto;
                    }));

                    const [
                        {
                            status: statusDocumentosVentas,
                            message: messageDocumentosVentas,
                            data: dataDocumentosVentas
                        },
                        {
                            status: statusDocumentosCompras,
                            message: messageDocumentosCompras,
                            data: dataDocumentosCompras
                        },
                        {
                            status: statusRetenciones,
                            message: messageRetenciones,
                            data: dataRetenciones
                        },
                        {
                            status: statusIVAMensual,
                            message: messageIVAMensual,
                            data: dataIVAMensual
                        }
                    ] = await Promise.all([
                        obtenerDocumentosReportes(empresa, date, true, tenantSlug),
                        obtenerDocumentosReportes(empresa, date, false, tenantSlug),
                        obtenerRetencionesIVA(empresa, date, tenantSlug),
                        getIVAMensual(empresa, date, tenantSlug)
                    ]);
                    if (
                        statusDocumentosVentas === 200 &&
                        statusDocumentosCompras === 200 &&
                        statusRetenciones === 200
                    ) {
                        setDocumentosVentas(dataDocumentosVentas);
                        setDocumentosCompras(dataDocumentosCompras);
                        setRetenciones(dataRetenciones);
                        if (statusIVAMensual === 200 && dataIVAMensual) {
                            setFormularioPasado(dataIVAMensual);
                        }
                    } else {
                        setDocumentosVentas([]);
                        setDocumentosCompras([]);
                        setRetenciones([]);
                        throw new Error(
                            `Error al obtener datos. Documentos: ${messageDocumentosVentas}, Retenciones IVA: ${messageRetenciones}, IVAMensual: ${messageIVAMensual}`
                        );
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        getData();
    }, [date, empresa, tenantSlug]);

    useEffect(() => {
        if (!loading) {
            fillCampos();
        }
    }, [loading]);

    const fillCampos = () => {
        const data_mes_anterior = formularioPasado;
        const compras = documentosCompras;
        const ventas = documentosVentas;
        const retencionesData = retenciones;

        const credito_anterior_index = creditos.findIndex((item) => item.key == "Remanente de crédito fiscal del período anterior");
        const retenciones_anterior_index = impuestos.findIndex((item) => item.key == "Retenciones IVA del período anterior");
        const credito_anterior = creditos[credito_anterior_index].creditos ?? 0;
        const retenciones_anterior = impuestos[retenciones_anterior_index].monto ?? 0;

        let remanente_credito_periodo_anterior = parseFloat(data_mes_anterior?.credito_periodo_siguiente ?? "0");
        let remanente_retenciones_periodo_anterior = parseFloat(data_mes_anterior?.retenciones_periodo_siguiente ?? "0");

        if (credito_anterior && credito_anterior > 0) {
            remanente_credito_periodo_anterior =+ credito_anterior;
        }
        if (retenciones_anterior && retenciones_anterior > 0) {
            remanente_retenciones_periodo_anterior =+ retenciones_anterior;
        }

        // Ventas - Débito Fiscal por Operaciones Locales
        let exentos_monto = calculateExentos(ventas);
        let [ventas_medicamentos_base, ventas_medicamentos_debitos] = calculateTipoDTE(ventas, "medicamentos");
        let ventas_peq_contribuyente_monto = calculatePeqContribuyente(ventas);
        let [ventas_vehiculos_base, ventas_vehiculos_debitos] = calculateTipoDTE(ventas, "vehiculos_modelos_anteriores");
        let [ventas_vehiculos_recientes_base, ventas_vehiculos_recientes_debitos] = calculateTipoDTE(ventas, "vehiculos_nuevos");
        let [ventas_gravadas_base, ventas_gravadass_debitos] = calculateTipoDTE(ventas, "bien");
        let [ventas_servicios_base, ventas_servicios_debitos] = calculateTipoDTE(ventas, "servicio");
        let [ventas_base_bienes, ventas_base_servicios, ventas_creditos_bienes, ventas_creditos_servicios] = calculateBienYServicio(ventas, "bien_y_servicio");
        ventas_gravadas_base += ventas_base_bienes;
        ventas_servicios_base += ventas_base_servicios;
        ventas_gravadass_debitos += ventas_creditos_bienes;
        ventas_servicios_debitos += ventas_creditos_servicios;
        let ventas_base_total = 
            exentos_monto + 
            ventas_medicamentos_base + 
            ventas_peq_contribuyente_monto + 
            ventas_vehiculos_base + 
            ventas_vehiculos_recientes_base + 
            ventas_gravadas_base + 
            ventas_servicios_base;
    
        let ventas_debito_total = 
            ventas_medicamentos_debitos + 
            ventas_vehiculos_debitos + 
            ventas_vehiculos_recientes_debitos + 
            ventas_gravadass_debitos + 
            ventas_servicios_debitos;

        // Compras - Crédito Fiscal por operaciones locales
        let [compras_medicamentos_base, compras_medicamentos_creditos] = calculateTipoDTE(compras, "medicamentos");
        let compras_peq_contribuyente_monto = calculatePeqContribuyente(compras);
        let compras_docs_sin_derecho_credito = calculateDocsSinDerechoCreditoFiscal(compras);
        let [compras_vehiculos_base, compras_vehiculos_creditos] = calculateTipoDTE(compras, "vehiculos_modelos_anteriores");
        let [compras_vehiculos_recientes_base, compras_vehiculos_recientes_creditos] = calculateTipoDTE(compras, "vehiculos_nuevos");
        let [compras_combustible_base, compras_combustible_creditos] = calculateTipoDTE(compras, "combustibles");
        let [compras_bienes_base, compras_bienes_creditos] = calculateTipoDTE(compras, "bien");
        let [compras_servicios_base, compras_servicios_creditos] = calculateTipoDTE(compras, "servicio");
        let [compras_base_bienes, compras_base_servicios, compras_creditos_bienes, compras_creditos_servicios] = calculateBienYServicio(compras, "bien_y_servicio");
        compras_bienes_base += compras_base_bienes;
        compras_servicios_base += compras_base_servicios;
        compras_bienes_creditos += compras_creditos_bienes;
        compras_servicios_creditos += compras_creditos_servicios;

        let [compras_importaciones_ca_base, compras_importaciones_ca_creditos] = calculateTipoDTE(compras, "importaciones_centro_america");
        let [compras_fyduca_base, compras_fyduca_creditos] = calculateTipoDTE(compras, "adquisiciones_fyduca");
        let [compras_importaciones_restantes_total, compras_importaciones_restantes_creditos] = calculateTipoDTE(compras, "importaciones_resto_mundo");
        let compras_base_total = 
            compras_medicamentos_base +
            compras_peq_contribuyente_monto +
            compras_docs_sin_derecho_credito +
            compras_vehiculos_base +
            compras_vehiculos_recientes_base +
            compras_combustible_base +
            compras_bienes_base +
            compras_servicios_base +
            compras_importaciones_ca_base +
            compras_fyduca_base +
            compras_importaciones_restantes_total;
    
        let compras_credito_total = 
            compras_medicamentos_creditos +
            compras_vehiculos_creditos +
            compras_vehiculos_recientes_creditos +
            compras_combustible_creditos +
            compras_bienes_creditos +
            compras_servicios_creditos +
            compras_importaciones_ca_creditos +
            compras_fyduca_creditos +
            compras_importaciones_restantes_creditos +
            remanente_credito_periodo_anterior;

        // Notas de crédito
        let [ncre_emit_total] = calculateNotaCreditoMonto(ventas);
        let [ncre_recib_total] = calculateNotaCreditoMonto(compras);

        // Retenciones IVA
        let creditos_mayor_que_debitos = compras_credito_total - ventas_debito_total;
        creditos_mayor_que_debitos = creditos_mayor_que_debitos > 0 ? creditos_mayor_que_debitos : 0;
        let debitos_mayor_que_creditos = ventas_debito_total - compras_credito_total;
        debitos_mayor_que_creditos = debitos_mayor_que_creditos > 0 ? debitos_mayor_que_creditos : 0;
        let saldo_del_impuesto = creditos_mayor_que_debitos > 0 ? creditos_mayor_que_debitos : debitos_mayor_que_creditos;

        let retenciones_iva_periodo_anterior = remanente_retenciones_periodo_anterior;
        let retenciones_iva_periodo_adeclarar = calculateRetencionesTotal(retencionesData);
        let { saldo_retenciones, impuesto_a_pagar } =
            calculateSaldoRetenciones(
                creditos_mayor_que_debitos,
                debitos_mayor_que_creditos,
                retenciones_iva_periodo_anterior,
                retenciones_iva_periodo_adeclarar
            );

        setDebitos([
            {
                key: 'Ventas y Servicios Exentos',
                base: exentos_monto,
                debitos: 0
            },
            {
                key: 'Ventas de medicamentos',
                base: ventas_medicamentos_base,
                debitos: ventas_medicamentos_debitos
            },
            {
                key: 'Ventas no afectas a contribuyentes...',
                base: ventas_peq_contribuyente_monto,
                debitos: 0,
            },
            {
                key: 'Ventas de vehiculos de años antiguos',
                base: ventas_vehiculos_base,
                debitos: ventas_vehiculos_debitos
            },
            {
                key: 'Ventas de vehiculos nuevos',
                base: ventas_vehiculos_recientes_base,
                debitos: ventas_vehiculos_recientes_debitos
            },
            {
                key: 'Ventas gravadas',
                base: ventas_gravadas_base,
                debitos: ventas_gravadass_debitos
            },
            {
                key: 'Servicios gravados',
                base: ventas_servicios_base,
                debitos: ventas_servicios_debitos
            },
            {
                key: 'Sumatoria',
                base: ventas_base_total,
                debitos: ventas_debito_total
            }
        ]);
        const creditosMontos = [
            {
                key: 'Compras de Medicamentos',
                base: compras_medicamentos_base,
                creditos: compras_medicamentos_creditos,
            },
            {
                key: 'Compras y servicios adquiridos de pequeños contribuyentes',
                base: compras_peq_contribuyente_monto,
                creditos: 0,
            },
            {
                key: 'Compras que no generan crédito Fiscal',
                base: compras_docs_sin_derecho_credito,
                creditos: 0
            },
            {
                key: 'Compras de vehiculos de años antiguos',
                base: compras_vehiculos_base,
                creditos: compras_vehiculos_creditos
            },
            {
                key: 'Compras de vehiculos nuevos',
                base: compras_vehiculos_recientes_base,
                creditos: compras_vehiculos_recientes_creditos
            },
            {
                key: 'Compras de combustibles',
                base: compras_combustible_base,
                creditos: compras_combustible_creditos
            },
            {
                key: 'Otras Compras', 
                base: compras_bienes_base,
                creditos: compras_bienes_creditos
            },
            {
                key: 'Servicios Adquiridos',
                base: compras_servicios_base,
                creditos: compras_servicios_creditos
            },
            {
                key: 'Importaciones de Centro América',
                base: compras_importaciones_ca_base,
                creditos: compras_importaciones_ca_creditos
            },
            {
                key: 'Adquisiciones con FYDUCA',
                base: compras_fyduca_base,
                creditos: compras_fyduca_creditos,
            },
            {
                key: 'Importaciones del resto del mundo',
                base: compras_importaciones_restantes_total,
                creditos: compras_importaciones_restantes_creditos
            },
            {
                key: 'IVA conforme constancias de exención recibidas',
                base: 0,
                creditos: 0,
            },
            {
                key: 'Remanente de crédito fiscal del período anterior',
                base: 0,
                creditos: remanente_credito_periodo_anterior,
                input: true
            },
            {
                key: 'Sumatoria',
                base: compras_base_total,
                creditos: compras_credito_total
            }
        ];
        setCreditos(creditosMontos);
        setImpuestos([
            {
                key: "Créditos mayor que Débitos",
                monto: creditos_mayor_que_debitos,
            },
            {
                key: "Débitos mayor que Créditos",
                monto: debitos_mayor_que_creditos,
            },
            {
                key: "Saldo del Impuesto",
                monto: saldo_del_impuesto,
            },
            {
                key: "Retenciones IVA del período anterior",
                monto: retenciones_iva_periodo_anterior,
                input: true
            },
            {
                key: "Retenciones IVA del período a declarar",
                monto: retenciones_iva_periodo_adeclarar,
            },
            {
                key: "Saldo de retenciones para el período siguiente",
                monto: saldo_retenciones,
            },
            {
                key: "Impuesto a Pagar",
                monto: impuesto_a_pagar,
            }
        ]);
        setOperacionesCantidad([
            {
                key: 'Facturas',
                emitidas: ventas.filter((documento: IFactura) => documento.tipo_dte != "NCRE").length,
                recibidas: compras.filter((documento: IFactura) => documento.tipo_dte != "NCRE" && !documento.fecha_anulacion).length,
            },
            {
                key: 'FYDUCA',
                emitidas: 0,
                recibidas: 0
            },
            {
                key: 'Constancias de exención',
                emitidas: 0,
                recibidas: 0
            },
            {
                key: 'Constancias de Retención de IVA',
                emitidas: 0,
                recibidas: retenciones.length
            },
            {
                key: 'Facturas Especiales',
                emitidas: 0,
                recibidas: 0
            },
            {
                key: 'Notas de crédito',
                emitidas: ventas.filter((documento: IFactura) => documento.tipo_dte === "NCRE").length,
                recibidas: compras.filter((documento: IFactura) => documento.tipo_dte === "NCRE").length,
            },
            {
                key: 'Notas de débito',
                emitidas: 0,
                recibidas: 0
            }
        ]);
        setOperacionesMonto([
            {
                key: 'Valor de las notas de crédito del período',
                emitidas: ncre_emit_total,
                recibidas: ncre_recib_total,
            },
            {
                key: 'Valor de las notas de débito del período',
                emitidas: 0,
                recibidas: 0
            }
        ]);
    };

    const handleCreditoChange = (e: React.ChangeEvent<HTMLInputElement>, row: any) => {
        const value = e.target.value;
        const credito = value.trim() !== "" ? parseFloat(value) : 0;
        if (isNaN(credito)) return;
    
        const nuevosCreditos = [...creditos];
        const filaIndex = nuevosCreditos.findIndex((item) => item.key == row.key);
    
        if (filaIndex !== -1) {
            nuevosCreditos[filaIndex].creditos = credito;
        }
    
        setCreditos(nuevosCreditos);

        setTimeout(() => {
            fillCampos();
        } , 200);
    };
    

    const handleImpuestoChange = (e: React.ChangeEvent<HTMLInputElement>, row: any) => {
        const value = e.target.value;
        const monto = value.trim() !== "" ? parseFloat(value) : 0;
        if (isNaN(monto)) return;

        const nuevosImpuestos = [...impuestos];
        const filaIndex = nuevosImpuestos.findIndex((item) => item.key == row.key);

        if (filaIndex !== -1) {
            nuevosImpuestos[filaIndex].monto = monto;
        }

        setImpuestos(nuevosImpuestos);

        setTimeout(() => {
            fillCampos();
        } , 200);
    };

    const findFila = (filas: any, key: string) => {
        const index = filas.findIndex((item: any) => item.key == key);
        return filas[index]
    };

    const handleSaveForm = async() => {
        const debito_total = findFila(debitos, "Sumatoria").debitos;
        const remanente_credito = findFila(creditos, "Remanente de crédito fiscal del período anterior").creditos;
        const credito_total = findFila(creditos, "Sumatoria").creditos;
        const credito_periodo_siguiente = findFila(impuestos, "Créditos mayor que Débitos").monto;
        const remanente_retenciones = findFila(impuestos, "Retenciones IVA del período anterior").monto;
        const retenciones_recibidas = findFila(impuestos, "Retenciones IVA del período a declarar").monto;
        const retenciones_periodo_siguiente = findFila(impuestos, "Saldo de retenciones para el período siguiente").monto;
        const impuesto_a_pagar = findFila(impuestos, "Impuesto a Pagar").monto;

        const resumen = {
            debito_total,
            remanente_credito,
            credito_total,
            credito_periodo_siguiente,
            remanente_retenciones,
            retenciones_recibidas,
            retenciones_periodo_siguiente,
            impuesto_a_pagar
        };
        try {
            setLoadingSubmit(true);
            console.log(resumen)
            const { status, data, message } = await crearIVAMensual(
                empresa,
                date,
                resumen
            );
            if (status == 200) {
                toast.success('Formulario Guardado Correctamente');
                vaciarDatos();
            } else {
                toast.error(message);
            }
        } catch (error) {
            console.log(error);
        }finally{
            setLoadingSubmit(false);
        }
    };

    const vaciarDatos = () => {
        setFormularioPasado({
            uuid: "",
            debito_total: "",
            remanente_credito: "",
            credito_total: "",
            credito_periodo_siguiente: "",
            remanente_retenciones: "",
            retenciones_recibidas: "",
            retenciones_periodo_siguiente: "",
            impuesto_a_pagar: "",
            empresa_id: 0,
            fecha_trabajo: "",
            estado: 0,
        });
        setDocumentosVentas([]);
        setDocumentosCompras([]);
        setRetenciones([]);
        setDebitos([
            {
                key: 'Ventas y Servicios Exentos',
                base: 0,
                debitos: 0
            },
            {
                key: 'Ventas de medicamentos',
                base: 0,
                debitos: 0
            },
            {
                key: 'Ventas no afectas a contribuyentes...',
                base: 0,
                debitos: 0
            },
            {
                key: 'Ventas de vehiculos de años antiguos',
                base: 0,
                debitos: 0
            },
            {
                key: 'Ventas de vehiculos nuevos',
                base: 0,
                debitos: 0
            },
            {
                key: 'Ventas gravadas',
                base: 0,
                debitos: 0
            },
            {
                key: 'Servicios gravados',
                base: 0,
                debitos: 0
            },
            {
                key: 'Sumatoria',
                base: 0,
                debitos: 0
            }
        ]);
        setCreditos([
            {
                key: 'Compras de Medicamentos',
                base: 0,
                creditos: 0
            },
            {
                key: 'Compras y servicios adquiridos de pequeños contribuyentes',
                base: 0,
                creditos: 0
            },
            {
                key: 'Compras que no generan crédito Fiscal',
                base: 0,
                creditos: 0
            },
            {
                key: 'Compras de vehiculos de años antiguos',
                base: 0,
                creditos: 0
            },
            {
                key: 'Compras de vehiculos nuevos',
                base: 0,
                creditos: 0
            },
            {
                key: 'Compras de combustibles',
                base: 0,
                creditos: 0
            },
            {
                key: 'Otras Compras',
                base: 0,
                creditos: 0
            },
            {
                key: 'Servicios Adquiridos',
                base: 0,
                creditos: 0
            },
            {
                key: 'Importaciones de Centro América',
                base: 0,
                creditos: 0
            },
            {
                key: 'Adquisiciones con FYDUCA',
                base: 0,
                creditos: 0
            },
            {
                key: 'Importaciones del resto del mundo',
                base: 0,
                creditos: 0
            },
            {
                key: 'IVA conforme constancias de exención recibidas',
                base: 0,
                creditos: 0,
                input: true
            },
            {
                key: 'Remanente de crédito fiscal del período anterior',
                base: 0,
                creditos: 0,
                input: true
            },
            {
                key: 'Sumatoria',
                base: 0,
                creditos: 0
            }
        ]);
        setImpuestos([
            {
                key: "Créditos mayor que Débitos",
                monto: 0,
            },
            {
                key: "Débitos mayor que Créditos",
                monto: 0,
            },
            {
                key: "Saldo del Impuesto",
                monto: 0,
            },
            {
                key: "Retenciones IVA del período anterior",
                monto: 0,
                input: true
            },
            {
                key: "Retenciones IVA del período a declarar",
                monto: 0,
            },
            {
                key: "Saldo de retenciones para el período siguiente",
                monto: 0,
            },
            {
                key: "Impuesto a Pagar",
                monto: 0,
            }
        ]);
        setOperacionesCantidad([
            {
                key: 'Facturas',
                emitidas: 0,
                recibidas: 0
            },
            {
                key: 'FYDUCA',
                emitidas: 0,
                recibidas: 0
            },
            {
                key: 'Constancias de exención',
                emitidas: 0,
                recibidas: 0
            },
            {
                key: 'Constancias de Retención de IVA',
                emitidas: 0,
                recibidas: 0
            },
            {
                key: 'Facturas Especiales',
                emitidas: 0,
                recibidas: 0
            },
            {
                key: 'Notas de crédito',
                emitidas: 0,
                recibidas: 0
            },
            {
                key: 'Notas de débito',
                emitidas: 0,
                recibidas: 0
            }
        ]);
        setOperacionesMonto([
            {
                key: 'Valor de las notas de crédito del período',
                emitidas: 0,
                recibidas: 0
            },
            {
                key: 'Valor de las notas de débito del período',
                emitidas: 0,
                recibidas: 0
            }
        ]);
        clearFunction();
    };

    const handleGeneratePDF = () => {
        const datosFormulario = {
            formularioPasado,
            debitos,
            creditos,
            impuestos,
            operacionesCantidad,
            operacionesMonto
        };
    
        localStorage.setItem('formulario_iva_mensual_data', JSON.stringify(datosFormulario));
        const baseUrl = `${process.env.NEXT_PUBLIC_CLIENT_URL}/pdf/reportes/iva/mensual`;
        const queryParams: Record<string, any> = { empresa, date };
        if (tenantSlug) {
            queryParams.tenant = tenantSlug;
        }

        const queryString = new URLSearchParams(queryParams).toString();
        const url = `${baseUrl}?${queryString}`;
        window.open(url, '_blank');
    };

    const conditionalRowStyles = [
        {
            when: (row: any) => row.fecha_anulacion,
            style: {
                backgroundColor: '#f7d2da'
            }
        },
        {
            when: (row: any) => row.iva == 0,
            style: {
                backgroundColor: '#ccc'
            }
        },
        {
            when: (row: IFactura) => row.tipo_dte != 'FACT',
            style: {
                backgroundColor: '#f5f1a4'
            }
        }
    ];

    const creditoColumns: TableColumn<any>[] = [
        {
            name: 'DESCRIPCIÓN',
            selector: (row) => row.key,
            grow: 2
        },
        {
            name: 'BASE',
            selector: (row) => parseMonto(row.base),
            right: true
        },
        {
            name: 'CRÉDITOS',
            selector: (row) => parseMonto(row.creditos),
            cell: (row) => {
                return row.input ? (
                    <input
                        type="number"
                        value={row.creditos}
                        onChange={(e) => handleCreditoChange(e, row)}
                        className="border rounded-lg px-3 py-2 mt-1 text-sm bg-gray-200 max-w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-right"
                    />
                ) : (
                    parseMonto(row.creditos)
                );
            },
            right: true
        }
    ];

    const impuestoColumns: TableColumn<any>[] = [
        {
            name: 'DESCRIPCIÓN',
            selector: (row) => row.key,
            grow: 2
        },
        {
            name: 'MONTO',
            selector: (row) => parseMonto(row.monto),
            cell: (row) => {
                return row.input ? (
                    <input
                        type="number"
                        value={row.monto}
                        onChange={(e) => handleImpuestoChange(e, row)}
                        className="border rounded-lg px-3 py-2 mt-1 text-sm bg-gray-200 max-w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-right"
                    />
                ) : (
                    parseMonto(row.monto)
                );
            },
            right: true
        }
    ];

    return (
        <div className="flex flex-col">
            <div className="flex flex-col gap-4 py-4">
                <Text variant={'subtitle'} bold>
                    Facturas Ventas:
                </Text>
                <Table
                    columns={ventas}
                    rows={documentosVentas}
                    pending={loading}
                    conditionalRowStyles={conditionalRowStyles}
                    pagination
                />
            </div>
            <div className="flex flex-col gap-4 py-4">
                <Text variant={'subtitle'} bold>
                    Facturas Compras:
                </Text>
                <Table
                    columns={compras}
                    rows={documentosCompras}
                    pending={loading}
                    conditionalRowStyles={conditionalRowStyles}
                    pagination
                />
            </div>
            <div className="flex flex-col gap-4 py-4">
                <Text variant={'subtitle'} bold>
                    Retenciones IVA:
                </Text>
                <Table
                    columns={retencionesColumns}
                    rows={retenciones}
                    pending={loading}
                    pagination
                />
            </div>
            <div
                className={clsx('flex flex-col gap-4 py-4', {
                    'opacity-0': loading,
                    'opacity-100': !loading,
                    'transition-opacity duration-500': true
                })}
            >
                <div className="flex flex-col gap-4">
                    <Text variant={'subtitle'} bold>
                        3. Débito Fiscal por operaciones Locales:
                    </Text>
                    <Table
                        columns={debitoColumns}
                        rows={debitos}
                        pending={false}
                        className="max-w-5xl"
                    />
                </div>
                <div className="flex flex-col gap-4">
                    <Text variant={'subtitle'} bold>
                        5. Crédito Fiscal por Operaciones Locales:
                    </Text>
                    <Table
                        columns={creditoColumns}
                        rows={creditos}
                        pending={false}
                        className="max-w-5xl"
                    />
                </div>
                <div className="flex flex-col gap-4">
                    <Text variant={'subtitle'} bold>
                        7. Determinación del crédito fiscal:
                    </Text>
                    <Table
                        columns={impuestoColumns}
                        rows={impuestos}
                        pending={false}
                        className="max-w-5xl"
                    />
                </div>
                <div className="flex flex-col gap-4">
                    <Text variant={'subtitle'} bold>
                        9.1. Cantidad de operaciones Realizadas:
                    </Text>
                    <Table
                        columns={operacionesColumns}
                        rows={operacionesCantidad}
                        pending={false}
                        className="max-w-5xl"
                    />
                </div>
                <div className="flex flex-col gap-4">
                    <Text variant={'subtitle'} bold>
                        Monto de operaciones Realizadas:
                    </Text>
                    <Table
                        columns={operacionesColumns}
                        rows={operacionesMonto}
                        pending={false}
                        className="max-w-5xl"
                    />
                </div>
                <div className="flex justify-center items-center gap-4">
                    <Button className="w-40" onClick={handleGeneratePDF} icon variant='error'>
                        <PDFIcon />
                        Generar PDF
                    </Button>
                    <Button loading={loadingSubmit} onClick={handleSaveForm}>Guardar Reporte</Button>
                </div>
            </div>
        </div>
    );
};

const ventas: TableColumn<IFactura>[] = [
    {
        name: 'Cuenta Debe',
        selector: (row) => row.cuenta_debe,
        grow: 2
    },
    {
        name: 'Cuenta Haber',
        selector: (row) => row.cuenta_haber,
        grow: 2
    },
    {
        name: 'Tipo DTE',
        selector: (row) => row.tipo_dte
    },
    {
        name: 'Serie',
        selector: (row) => row.serie
    },
    {
        name: 'Número DTE',
        selector: (row) => row.numero_dte
    },
    {
        name: 'ID Receptor',
        selector: (row) => row.id_receptor
    },
    {
        name: 'Nombre Receptor',
        selector: (row) => row.nombre_receptor,
        grow: 2
    },
    {
        name: 'Nombre Establecimiento',
        selector: (row) => row.nombre_establecimiento,
        grow: 2
        // style: { backgroundColor: '#f2f2f2' }
    },
    {
        name: 'Fecha de Emisión',
        selector: (row) => parseDate(row.fecha_emision.toString())
    },
    {
        name: 'Número de Autorización',
        selector: (row) => row.numero_autorizacion
    },
    {
        name: 'Monto Bienes',
        selector: (row) => row.monto_bien
    },
    {
        name: 'Monto Servicios',
        selector: (row) => row.monto_servicio
    },
    {
        name: 'IVA',
        selector: (row) => row.iva.toString()
    },
    {
        name: 'Monto Total',
        selector: (row) => row.monto_total
    },
    {
        name: 'Estado',
        selector: (row) => row.factura_estado.toString()
    },
    {
        name: 'Marca Anulado',
        selector: (row) => row.marca_anulado.toString()
    },
    {
        name: 'Fecha de Anulación',
        selector: (row) =>
            row.fecha_anulacion
                ? parseDate(row.fecha_anulacion.toString())
                : 'N/A'
    },
    {
        name: 'Petroleo',
        selector: (row) => row.petroleo.toString()
    },
    {
        name: 'Turismo Hospedaje',
        selector: (row) => row.turismo_hospedaje.toString()
    },
    {
        name: 'Turismo Pasajes',
        selector: (row) => row.turismo_pasajes.toString()
    },
    {
        name: 'Timbre Prensa',
        selector: (row) => row.timbre_prensa.toString()
    },
    {
        name: 'Bomberos',
        selector: (row) => row.bomberos.toString()
    },
    {
        name: 'Tasa Municipal',
        selector: (row) => row.tasa_municipal.toString()
    },
    {
        name: 'Bebidas Alcohólicas',
        selector: (row) => row.bebidas_alcoholicas.toString()
    },
    {
        name: 'Tabaco',
        selector: (row) => row.tabaco.toString()
    },
    {
        name: 'Cemento',
        selector: (row) => row.cemento.toString()
    },
    {
        name: 'Bebidas No Alcohólicas',
        selector: (row) => row.bebidas_no_alcoholicas.toString()
    },
    {
        name: 'Tarifa Portuaria',
        selector: (row) => row.tarifa_portuaria.toString()
    }
];
const compras: TableColumn<IFactura>[] = [
    {
        name: 'Cuenta Debe',
        selector: (row) => row.cuenta_debe,
        grow: 2
    },
    {
        name: 'Cuenta Haber',
        selector: (row) => row.cuenta_haber,
        grow: 2
    },
    {
        name: 'Tipo DTE',
        selector: (row) => row.tipo_dte
    },
    {
        name: 'Serie',
        selector: (row) => row.serie
    },
    {
        name: 'Número DTE',
        selector: (row) => row.numero_dte
    },
    {
        name: 'ID Receptor',
        selector: (row) => row.id_receptor
    },
    {
        name: 'Nombre Receptor',
        selector: (row) => row.nombre_receptor,
        grow: 2
    },
    {
        name: 'Nombre Establecimiento',
        selector: (row) => row.nombre_establecimiento,
        grow: 2
        // style: { backgroundColor: '#f2f2f2' }
    },
    {
        name: 'Fecha de Emisión',
        selector: (row) => parseDate(row.fecha_emision.toString())
    },
    {
        name: 'Número de Autorización',
        selector: (row) => row.numero_autorizacion
    },
    {
        name: 'Monto Bienes',
        selector: (row) => row.monto_bien
    },
    {
        name: 'Monto Servicios',
        selector: (row) => row.monto_servicio
    },
    {
        name: 'IVA',
        selector: (row) => row.iva.toString()
    },
    {
        name: 'Monto Total',
        selector: (row) => row.monto_total
    },
    {
        name: 'Estado',
        selector: (row) => row.factura_estado.toString()
    },
    {
        name: 'Marca Anulado',
        selector: (row) => row.marca_anulado.toString()
    },
    {
        name: 'Fecha de Anulación',
        selector: (row) =>
            row.fecha_anulacion
                ? parseDate(row.fecha_anulacion.toString())
                : 'N/A'
    },
    {
        name: 'Petroleo',
        selector: (row) => row.petroleo.toString()
    },
    {
        name: 'Turismo Hospedaje',
        selector: (row) => row.turismo_hospedaje.toString()
    },
    {
        name: 'Turismo Pasajes',
        selector: (row) => row.turismo_pasajes.toString()
    },
    {
        name: 'Timbre Prensa',
        selector: (row) => row.timbre_prensa.toString()
    },
    {
        name: 'Bomberos',
        selector: (row) => row.bomberos.toString()
    },
    {
        name: 'Tasa Municipal',
        selector: (row) => row.tasa_municipal.toString()
    },
    {
        name: 'Bebidas Alcohólicas',
        selector: (row) => row.bebidas_alcoholicas.toString()
    },
    {
        name: 'Tabaco',
        selector: (row) => row.tabaco.toString()
    },
    {
        name: 'Cemento',
        selector: (row) => row.cemento.toString()
    },
    {
        name: 'Bebidas No Alcohólicas',
        selector: (row) => row.bebidas_no_alcoholicas.toString()
    },
    {
        name: 'Tarifa Portuaria',
        selector: (row) => row.tarifa_portuaria.toString()
    }
];

const retencionesColumns: TableColumn<IRetencionIVA>[] = [
    {
        name: 'UUID',
        selector: (row) => row.uuid
    },
    // {
    //     name: 'Fecha de Trabajo',
    //     selector: (row) => row.fecha_trabajo
    // },
    {
        name: 'NIT Retenedor',
        selector: (row) => row.nit_retenedor
    },
    {
        name: 'Nombre Retenedor',
        selector: (row) => row.nombre_retenedor
    },
    {
        name: 'Estado Constancia',
        selector: (row) => row.estado_constancia
    },
    {
        name: 'Constancia',
        selector: (row) => row.constancia
    },
    {
        name: 'Fecha de Emisión',
        selector: (row) => row.fecha_emision
    },
    {
        name: 'Total Factura',
        selector: (row) => row.total_factura?.toString() ?? ''
    },
    {
        name: 'Importe Neto',
        selector: (row) => row.importe_neto?.toString() ?? ''
    },
    {
        name: 'Afecto Retención',
        selector: (row) => row.afecto_retencion?.toString() ?? ''
    },
    {
        name: 'Total Retención',
        selector: (row) => row.total_retencion?.toString() ?? ''
    }
];


const debitoColumns: TableColumn<any>[] = [
    {
        selector: (row) => row.key,
        name: 'DESCRIPCIÓN',
        grow: 3
    },
    {
        name: 'BASE',
        selector: (row) => parseMonto(row.base),
        right: true,
    },
    {
        name: 'DÉBITOS',
        selector: (row) => parseMonto(row.debitos),
        right: true,
    }
];

const operacionesColumns: TableColumn<any>[] = [
    {
        name: 'key',
        selector: (row) => row.key,
        grow: 2
    },
    {
        name: 'EMITIDAS',
        selector: (row) => row.emitidas,
        right: true,
    },
    {
        name: 'RECIBIDAS',
        selector: (row) => row.recibidas,
        right: true,
    }
];
