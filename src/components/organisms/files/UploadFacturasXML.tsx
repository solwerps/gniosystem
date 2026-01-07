// src/components/organisms/files/UploadFacturasXML.tsx
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { CodeDocIcon, ReportIcon } from '@/components/atoms';
import {
    FilledComponente,
    LoadingComponent
} from '@/components/molecules/table/utils';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import type { IFactura } from '@/utils/models/documentos'; // ajusta si tu ruta de modelos es distinta

interface DragAndDropFileProps {
    setFiles: Dispatch<SetStateAction<File[]>>;
    files: File[];
    setData: Dispatch<SetStateAction<IFactura[]>>;
    validated?: boolean;
    itemCounter?: number;
}

const normalizeItems = (itemsData: any): any[] => {
    // Si los items vienen como un objeto, lo convertimos a un array de un solo elemento
    const itemsArray = Array.isArray(itemsData) ? itemsData : [itemsData];

    // Mapeamos sobre los items para normalizar su estructura
    const normalizedItems = itemsArray.map((item: any) => {
        const newItem: any = {
            cantidad: item['dte:Cantidad'],
            unidadMedida: item['dte:UnidadMedida'],
            descripcion: item['dte:Descripcion'],
            precioUnitario: item['dte:PrecioUnitario'],
            precio: item['dte:Precio'],
            descuento: item['dte:Descuento'],
            impuestos: [],
            total: item['dte:Total'],
            bienOServicio: item['@_BienOServicio'],
            numeroLinea: item['@_NumeroLinea']
        };

        // Si los impuestos están presentes, los agregamos al objeto del item
        if (item['dte:Impuestos']) {
            const impuestos = Array.isArray(
                item['dte:Impuestos']['dte:Impuesto']
            )
                ? item['dte:Impuestos']['dte:Impuesto']
                : [item['dte:Impuestos']['dte:Impuesto']];
            newItem.impuestos = impuestos.map((impuesto: any) => ({
                nombreCorto: impuesto['dte:NombreCorto'],
                codigoUnidadGravable: impuesto['dte:CodigoUnidadGravable'],
                montoGravable: impuesto['dte:MontoGravable'],
                montoImpuesto: impuesto['dte:MontoImpuesto'],
                cantidadUnidadesGravables:
                    impuesto['dte:CantidadUnidadesGravables']
            }));
        }

        return newItem;
    });

    return normalizedItems;
};

const getBases = (items: any[]) => {
    let monto_bien = 0;
    let monto_servicio = 0;

    items.forEach((item: any) => {
        const total = parseFloat(item.total);
        const impuestos = item.impuestos.reduce(
            (totalImpuestos: number, impuesto: any) =>
                totalImpuestos + parseFloat(impuesto.montoImpuesto),
            0
        );

        if (item.bienOServicio === 'B') {
            monto_bien += total - impuestos;
        } else if (item.bienOServicio === 'S') {
            monto_servicio += total - impuestos;
        }
    });

    return { monto_bien, monto_servicio };
};

const getImpuestos = (impuestosData: any) => {
    let iva = 0;
    let petroleo = 0;
    let turismo_hospedaje = 0;
    let turismo_pasajes = 0;
    let timbre_prensa = 0;
    let bomberos = 0;
    let tasa_municipal = 0;
    let bebidas_alcoholicas = 0;
    let tabaco = 0;
    let cemento = 0;
    let bebidas_no_alcoholicas = 0;
    let tarifa_portuaria = 0;

    if (!impuestosData) {
        return {
            iva,
            petroleo,
            turismo_hospedaje,
            turismo_pasajes,
            timbre_prensa,
            bomberos,
            tasa_municipal,
            bebidas_alcoholicas,
            tabaco,
            cemento,
            bebidas_no_alcoholicas,
            tarifa_portuaria
        };
    }

    const impuestos = Array.isArray(impuestosData)
        ? impuestosData
        : [impuestosData];

    impuestos.forEach((item: any) => {
        const impuesto = parseFloat(item['@_TotalMontoImpuesto']);

        switch (item['@_NombreCorto']) {
            case 'IVA':
                iva += impuesto;
                break;
            case 'PETROLEO':
                petroleo += impuesto;
                break;
            case 'TURISMO HOSPEDAJE':
                turismo_hospedaje += impuesto;
                break;
            case 'TURISMO PASAJES':
                turismo_pasajes += impuesto;
                break;
            case 'TIMBRE DE PRENSA':
                timbre_prensa += impuesto;
                break;
            case 'BOMBEROS':
                bomberos += impuesto;
                break;
            case 'TASA MUNICIPAL':
                tasa_municipal += impuesto;
                break;
            case 'BEBIDAS ALCOHOLICAS':
                bebidas_alcoholicas += impuesto;
                break;
            case 'TABACO':
                tabaco += impuesto;
                break;
            case 'CEMENTO':
                cemento += impuesto;
                break;
            case 'BEBIDAS NO ALCOHOLICAS':
                bebidas_no_alcoholicas += impuesto;
                break;
            case 'TARIFA PORTUARIA':
                tarifa_portuaria += impuesto;
                break;
            default:
                // Handle unknown tax types
                console.warn(`Unrecognized tax type: ${item['@_NombreCorto']}`);
                break;
        }
    });

    return {
        iva,
        petroleo,
        turismo_hospedaje,
        turismo_pasajes,
        timbre_prensa,
        bomberos,
        tasa_municipal,
        bebidas_alcoholicas,
        tabaco,
        cemento,
        bebidas_no_alcoholicas,
        tarifa_portuaria
    };
};

const facturaConstructor = (content: any): IFactura | undefined => {
    if (!content?.['dte:GTDocumento']) {
        console.error("Archivo XML inválido. No se encontró 'dte:GTDocumento'.");
        return;
    }

    const base_location =
        content?.['dte:GTDocumento']?.['dte:SAT']?.['dte:DTE']?.['dte:DatosEmision'];
    if (!base_location) {
        console.error("No se encontró 'dte:DatosEmision' en el archivo XML.");
        return;
    }

    const datos_certificacion =
        content['dte:GTDocumento']['dte:SAT']['dte:DTE']['dte:Certificacion'];
    const datos_generales = base_location['dte:DatosGenerales'];
    const datos_emisor = base_location['dte:Emisor'];
    const datos_receptor = base_location['dte:Receptor'];
    const datos_items = base_location['dte:Items']['dte:Item']; // puede ser un array de items o un objeto con solo un item
    const items = normalizeItems(datos_items);
    const datos_totales = base_location['dte:Totales'];
    const impuestos =
        datos_totales &&
        datos_totales['dte:TotalImpuestos'] &&
        datos_totales['dte:TotalImpuestos']['dte:TotalImpuesto'];

    const { monto_bien, monto_servicio } = getBases(items);
    const {
        iva,
        petroleo,
        turismo_hospedaje,
        turismo_pasajes,
        timbre_prensa,
        bomberos,
        tasa_municipal,
        bebidas_alcoholicas,
        tabaco,
        cemento,
        bebidas_no_alcoholicas,
        tarifa_portuaria
    } = getImpuestos(impuestos || null);

    const tipo_dte = datos_generales['@_Tipo'];

    const factura: IFactura = {
      fecha_emision: datos_generales['@_FechaHoraEmision'],
      numero_autorizacion: datos_certificacion['dte:NumeroAutorizacion']['#text'],
      nombre_certificador: datos_certificacion['dte:NombreCertificador'],
      nit_certificador: datos_certificacion['dte:NITCertificador'],
      tipo_dte,
      serie: datos_certificacion['dte:NumeroAutorizacion']['@_Serie'],
      numero_dte: datos_certificacion['dte:NumeroAutorizacion']['@_Numero'],
      nit_emisor: datos_emisor['@_NITEmisor'],
      nombre_emisor: datos_emisor['@_NombreEmisor'],
      codigo_establecimiento: datos_emisor['@_CodigoEstablecimiento'],
      nombre_establecimiento: datos_emisor['@_NombreComercial'],
      id_receptor: datos_receptor['@_IDReceptor'],
      nombre_receptor: datos_receptor['@_NombreReceptor'],

      moneda: datos_generales['@_CodigoMoneda'],
      monto_total: datos_totales['dte:GranTotal'],
      monto_bien,
      monto_servicio,
      factura_estado: '',
      marca_anulado: '',
      fecha_anulacion: '',
      iva,
      petroleo,
      turismo_hospedaje,
      turismo_pasajes,
      timbre_prensa,
      bomberos,
      tasa_municipal,
      bebidas_alcoholicas,
      tabaco,
      cemento,
      bebidas_no_alcoholicas,
      tarifa_portuaria,
      uuid: '',
      fecha_trabajo: '',
      identificador_unico: '',
      tipo_operacion: 'venta',
      cuenta_debe: null,
      cuenta_haber: null,
      tipo: '',
      empresa_id: 0,
      estado: 0
    };

    if (!factura.numero_autorizacion || !factura.nit_emisor) {
        console.warn('Factura con datos incompletos omitida.');
        return; // Omitir esta factura si faltan datos clave
    }

    return factura;
};

export const UploadFacturasXML = ({
    setFiles,
    files,
    setData,
    validated,
    itemCounter
}: DragAndDropFileProps) => {
    const filesTypesAccepted = {
        'text/xml': ['.xml']
    };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length === 0) {
                return toast.error('Formato de archivo inválido');
            }

            if (acceptedFiles[0].size / 1024 > 8000) {
                return toast.error(
                    'Tamaño de archivo permitido excedido (Máximo 8mb)'
                );
            }

            const options = {
                ignoreAttributes: false
            };

            acceptedFiles.forEach((file) => {
                const reader = new FileReader();
                reader.onerror = () => {
                    console.error(`Error leyendo el archivo ${file.name}`);
                };
                reader.onload = (e: ProgressEvent<FileReader>) => {
                    try {
                        const xmlData = e.target?.result as string;
                        const parser = new XMLParser(options);
                        const content = parser.parse(xmlData);
                        const factura = facturaConstructor(content);

                        if (factura) {
                            setData((prevData) => [...prevData, factura]);
                        } else {
                            console.warn(
                                `El archivo ${file.name} fue omitido por tener datos inválidos.`
                            );
                        }
                    } catch (err: any) {
                        console.error(
                            `Error al procesar el archivo ${file.name}: ${err.message}`
                        );
                    }
                };
                reader.readAsText(file);
            });
            setFiles(files.concat(acceptedFiles));
        },
        accept: filesTypesAccepted
    });

    const clearFilesAndData = () => {
        setFiles([]);
        setData([]);
    };

    return (
        <>
            {validated ? (
                <FilledComponente
                    itemCounter={itemCounter ?? 0}
                    action={clearFilesAndData}
                />
            ) : (
                <div {...getRootProps({ className: 'dropzone w-full' })}>
                    <input
                        className="input-zone"
                        accept={Object.keys(filesTypesAccepted).join(',')}
                        {...getInputProps()}
                    />
                    <div className="flex justify-center items-center bg-white text-background p-8 rounded-2xl cursor-pointer shadow-md min-h-40">
                        <div className="dropzone-content flex text-center flex-col justify-center items-center">
                            <CodeDocIcon />
                            Arrastra y suelta los XML ó
                            <span className="text-background font-semibold underline underline-offset-4">
                                Busca en tu ordenador
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
