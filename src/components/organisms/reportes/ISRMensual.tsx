//src/components/organisms/reportes/ISRMensual.tsx
"use client";
import React, { useEffect, useState } from "react";
import type { TableColumn } from "react-data-table-component";

import { Button, SummaryItem, Text } from "@/components/atoms";
import { Table } from "@/components/molecules";
import {
  IGetDocumento,
  IResumenIsrOpcional,
  IRetencionISR,
  crearIsrOpcional,
  obtenerRetencionesISR,
  obtenerDocumentosReportes,
  parseDate,
} from "@/utils";
import {
  calcularISR,
  calcularTotalDescuentos,
  calculateBase,
  sumarIVA,
  sumarRetenciones,
} from "./utils";
import clsx from "clsx";
import { toast } from "react-toastify";
import moment from "moment";

export const ISRMensual = ({
    date,
    empresa,
    tenantSlug,
}: {
    date: string;
    empresa: number;
    tenantSlug: string;
}) => {
    const [documentos, setDocumentos] = useState<IGetDocumento[]>([]);
    const [retenciones, setRetenciones] = useState<IRetencionISR[]>([]);
    const [loading, setLoading] = useState(true);
    const [registroLoading, setRegistroLoading] = useState(false);
    const [resumenData, setResumenData] = useState<IResumenIsrOpcional>({
        monto_bienes: 0,
        monto_servicios: 0,
        monto_descuentos: 0,
        iva: 0,
        monto_base: 0,
        facturas_emitidas: 0,
        retenciones_isr: 0,
        monto_isr_porcentaje_5: 0,
        monto_isr_porcentaje_7: 0,
        isr: 0,
        isr_retenido: 0,
        isr_x_pagar: 0,
    })
    useEffect(() => {
        const getData = async () => {
            try {
                if (date && empresa) {
                    setLoading(true);
                    const [
                        {
                            status: statusDocumentos,
                            message: messageDocumentos,
                            data: dataDocumentos
                        },
                        {
                            status: statusRetenciones,
                            message: messageRetenciones,
                            data: dataRetenciones
                        }
                    ] = await Promise.all([
                        obtenerDocumentosReportes(empresa, date, true, tenantSlug),
                        obtenerRetencionesISR(empresa, date, tenantSlug)
                    ]);
                    if (statusDocumentos === 200 && statusRetenciones === 200) {
                        setDocumentos(dataDocumentos);
                        setRetenciones(dataRetenciones);
                    } else {
                        throw new Error(
                            `Error al obtener datos. Documentos: ${messageDocumentos}, Retenciones ISR: ${messageRetenciones}`
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
      if (documentos && documentos.length > 0) {
        calculateResumen(documentos, retenciones)
      }
    }, [documentos, retenciones]);
    

    const conditionalRowStyles = [
        {
            when: (row: any) => row.fecha_anulacion,
            style: {
                backgroundColor: '#f7d2da',
            }
        }
    ];

    const ISRResumen = ({monto_base}: {monto_base: number}): JSX.Element => {
        const isr = calcularISR(monto_base);
        const margen = 30000;
        const impuestoFijo = parseFloat((margen * 0.05).toFixed(2));
        const excedente = parseFloat(((monto_base - margen) * 0.07).toFixed(2));
    
        if (monto_base > 30000) {
            return (
                <>
                    <SummaryItem text={'Fijo (5%): '} value={impuestoFijo} />
                    <SummaryItem text={'Excedente (7%): '} value={excedente} />
                    <SummaryItem primary text={'ISR: '} value={isr} />
                </>
            );
        } else {
            return <SummaryItem primary text={'ISR (5%): '} value={isr} />;
        }
    };

    const calculateResumen = (documentos: IGetDocumento[], retenciones: IRetencionISR[]) => {
        let [monto_bienes, monto_servicios] = calculateBase(documentos);
        let monto_total_descuentos = calcularTotalDescuentos(documentos);
        let iva = sumarIVA(documentos);
        let monto_base = parseFloat((monto_bienes + monto_servicios).toFixed(2));

        let facturas_emitidas = documentos.length;
        let retenciones_isr = retenciones.length;
        let monto_retenciones = sumarRetenciones(retenciones);

        const margen = 30000;
        let impuestoFijo = parseFloat((margen * 0.05).toFixed(2));
        let excedente = monto_base > margen ? parseFloat(((monto_base - margen) * 0.07).toFixed(2)) : 0;//TODO: verificar si es > o >=

        let isr = calcularISR(monto_base);
        let isr_por_pagar = Math.max(0, parseFloat((isr - monto_retenciones).toFixed(2)));

        setResumenData({
            monto_bienes,
            monto_servicios,
            monto_descuentos: monto_total_descuentos,
            iva,
            monto_base,
            facturas_emitidas,
            retenciones_isr,
            monto_isr_porcentaje_5: impuestoFijo,
            monto_isr_porcentaje_7: excedente,
            isr,
            isr_retenido: monto_retenciones,
            isr_x_pagar: isr_por_pagar,
        });
    };

    const guardarFormulario = async () => {
        try {
            let empresa_id = empresa;
            let fecha = date;
            setRegistroLoading(true);
            const { status, data, message } = await crearIsrOpcional(
                empresa_id,
                fecha,
                resumenData,
                tenantSlug
            );
            if (status == 200) {
                toast.success('Formulario Guardado Correctamente');
            } else {
                toast.error(message);
            }
        } catch (error) {
            console.log(error);
        }finally{
            setRegistroLoading(false);
        }
    };

  return (
      <div className="flex flex-col">
          <div className="flex flex-col gap-4 py-4">
              <Text variant={'subtitle'} bold>
                  Facturas:
              </Text>
              <Table
                  columns={facturasColumns}
                  rows={documentos}
                  pending={loading}
                  conditionalRowStyles={conditionalRowStyles}
                  pagination
              />
          </div>
          <div className="flex flex-col gap-4 py-4">
              <Text variant={'subtitle'} bold>
                  Retenciones:
              </Text>
              <Table
                  columns={retencionesColumns}
                  rows={retenciones}
                  pending={loading}
                  conditionalRowStyles={conditionalRowStyles}
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
              <Text variant={'subtitle'} bold>
                  Resumen:
              </Text>
              {(documentos && documentos.length > 0) ? (
                  <>
                      <div className="flex flex-col bg-white gap-2 py-4 rounded-md px-4 max-w-xl">
                          <div className="flex">
                                <p>
                                    ISR Opcional - <span className="font-bold">{documentos[0].nombre_emisor}</span> - <span className='uppercase'>{moment(date).locale('es-gt').format('MMMM YYYY')}</span>
                                </p>
                          </div>
                          <SummaryItem text={'Total de los bienes: '} value={resumenData.monto_bienes} />
                          <SummaryItem text={'Total de los servicios: '} value={resumenData.monto_servicios} />
                          <SummaryItem text={'Total de los descuentos: '} value={resumenData.monto_descuentos} />
                          <SummaryItem text={'IVA: '} value={resumenData.iva} />
                          <SummaryItem success text={'Resultado Base: '} value={resumenData.monto_base} />
                          <SummaryItem primary text={'Número de Facturas Emitidas: '} value={resumenData.facturas_emitidas} />
                          <SummaryItem
                              primary
                              text={'Número de Retenciones por ISR: '}
                              value={resumenData.retenciones_isr}
                          />
                          <ISRResumen monto_base={resumenData.monto_base} />
                          <SummaryItem
                              primary
                              text={'ISR Retenido: '}
                              value={resumenData.isr_retenido}
                          />
                          <SummaryItem
                              success
                              text={'ISR X PAGAR: '}
                              value={resumenData.isr_x_pagar}
                          />
                      </div>
                      <div className="flex justify-center items-center">
                          <Button onClick={guardarFormulario} loading={registroLoading}>
                              Guardar Reporte
                          </Button>
                      </div>
                  </>
              ) : (
                  <></>
              )}
          </div>
      </div>
  );
}

const facturasColumns: TableColumn<any>[] = [
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
        grow: 2,
        // style: { backgroundColor: '#f2f2f2' }
    },
    {
        name: 'Fecha de Emisión',
        selector: (row) => parseDate(row.fecha_emision.toString()),
    },
    {
        name: 'Número de Autorización',
        selector: (row) => row.numero_autorizacion
    },
    {
        name: 'Monto Servicios',
        selector: (row) => row.monto_servicio
    },
    {
        name: 'Monto Bienes',
        selector: (row) => row.monto_bien
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
            row.fecha_anulacion ? parseDate(row.fecha_anulacion.toString()) : 'N/A'
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
    },
    // {
    //     name: 'Tipo de Operación',
    //     selector: (row) => row.tipo_operacion
    // },
    // {
    //     name: 'UUID de la Cuenta',
    //     selector: (row) => (row.cuenta_uuid ? row.cuenta_uuid : 'N/A')
    // },
    // {
    //     name: 'Tipo de Bien/Servicio',
    //     selector: (row) => row.tipo_bien_servicio
    // },
    // {
    //     name: 'Cuenta',
    //     selector: (row) => row.cuenta ?? ''
    // }
    // {
    //     name: 'ID de la Empresa',
    //     selector: (row) => row.empresa_id.toString()
    // }
];

const retencionesColumns: TableColumn<IRetencionISR>[] = [
    // {
    //     name: 'UUID',
    //     selector: (row) => row.uuid
    // },
    {
        name: 'Fecha de Trabajo',
        selector: (row) => row.fecha_trabajo
    },
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
        selector: (row) => row.total_factura?.toString(2) ?? ""
    },
    {
        name: 'Renta Imponible',
        selector: (row) => row.renta_imponible?.toString(2) ?? ""
    },
    {
        name: 'Total Retención',
        selector: (row) => row.total_retencion?.toString(2) ?? ""
    }
];
