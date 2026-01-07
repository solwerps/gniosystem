// src/components/organisms/cargas/UploadDocumentos.tsx
'use client';

import React, { useEffect, useState } from 'react';
// 🧩 Componentes para carga de archivos
import { UploadFacturasCSV } from '@/components/organisms/files';
import { UploadFacturasXML } from '@/components/organisms/files';
import { toast } from 'react-toastify';
// Tipos de nomenclatura
import type { SelectOption } from '@/utils/models/nomenclaturas';

// Tipos genéricos (OptionType)
import type { OptionType } from '@/utils/models/variety';

// Servicios de documentos
import { crearDocumentos } from '@/utils/services/documentos';

// Modelos de documentos
import type {
  IUploadDocumento as Documento,
  IFactura,
  IDocUpload as IDoc,
  TipoFactura
} from '@/utils/models/documentos';

// Utilidades
import { omitColumn } from '@/utils/functions/omitColumn';
import { parseDate } from '@/utils/functions/parseDate';

// Catálogo / data de tipos de documento
import {
  tiposDocumentoVenta,
  tiposDocumentoCompra
} from '@/utils/data/documentosData';

// Servicios de nomenclatura / cuentas
import { obtenerCuentasByEmpresa } from '@/utils/services/nomenclatura';

import { Button } from '@/components/atoms';
import { CalendarMonth } from '@/components/atoms';
import { TrashIcon } from '@/components/atoms';
import { Table } from '@/components/molecules';
import { SelectTable } from '@/components/atoms';
import { Modal } from '@/components/molecules';
import { ContinueModal } from '@/components/molecules';

import type { TableColumn } from 'react-data-table-component';
import moment from 'moment';

interface UploadDocumentosProps {
  empresaId: number;
  empresaNit: string;
  empresaNombre: string;
  usuario: string;
  cuentaDebeDefaultId?: number | string;
  cuentaHaberDefaultId?: number | string;
}

/** Helpers seguros para montos (evitan NaN y strings inválidos) */
const toDecimalString = (value: any): string => {
  if (value === null || value === undefined) return '0.00';

  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '0.00';
    return value.toFixed(2);
  }

  const str = String(value).trim();
  if (!str) return '0.00';

  const normalized = str.replace(',', '.');
  const n = parseFloat(normalized);
  if (Number.isNaN(n)) return '0.00';

  return n.toFixed(2);
};

const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  const str = String(value).trim();
  if (!str) return 0;
  const normalized = str.replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? 0 : n;
};

type ErrorAlert = {
  title: string;
  messages: string[];
};

export const UploadDocumentos: React.FC<UploadDocumentosProps> = ({
  empresaId,
  empresaNit,
  empresaNombre,
  usuario,
  cuentaDebeDefaultId,
  cuentaHaberDefaultId
}) => {
  const [step, setStep] = useState(1);

  // Documentos
  // CSV
  const [CSVFile, setCSVFile] = useState<File[]>([]);
  const [documentosCSV, setDocumentosCSV] = useState<Documento[]>([]);
  // XML
  const [XMLFile, setXMLFile] = useState<File[]>([]);
  const [documentosBackupXML, setDocumentosBackupXML] = useState<IFactura[]>([]);
  const [documentosXML, setDocumentosXML] = useState<IFactura[]>([]);
  // combinados
  const [documentos, setDocumentos] = useState<IDoc[]>([]);
  const [notFound, setNotFound] = useState<string[]>([]);

  // Compra o Venta
  const tiposOperacion: { value: string; label: string }[] = [
    { value: 'venta', label: 'Venta' },
    { value: 'compra', label: 'Compra' }
  ];
  const [tipoOperacionSelected, setTipoOperacionSelected] =
    useState<OptionType>({ value: '', label: 'Selecciona', error: '' });

  // Cuentas
  const [cuentasOptions, setCuentasOptions] = useState<SelectOption[]>([]);

  // Fecha
  const [date, setDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // loaders
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  // modal
  const [modalSubmit, setModalSubmit] = useState(false);
  const [continueModal, setContinueModal] = useState(false);
  const [notFoundModal, setNotFoundModal] = useState(false);

  // Alertas de error (Tailwind)
  const [errorAlert, setErrorAlert] = useState<ErrorAlert | null>(null);

  // 🔹 GNIO: traer cuentas por empresaId (ya no se selecciona empresa)
  useEffect(() => {
    const fetchCuentas = async () => {
      if (!empresaId) return;

      setFetching(true);
      try {
        const { status, data, message } = await obtenerCuentasByEmpresa(
          Number(empresaId),
          true
        );
        if (status === 200) {
          setCuentasOptions(data);
        } else {
          throw new Error(message);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setFetching(false);
      }
    };

    fetchCuentas();
  }, [empresaId]);

  const handleConfirm = () => {
    setModalSubmit(true);
  };

  const combinateDocs = (): [IDoc[], string[]] => {
    const notFounds: string[] = [];

    const docs: any[] = documentosCSV.map((csv) => {
      const xmlDoc = documentosBackupXML.find(
        (xml) => xml.numero_autorizacion === csv['Número de Autorización']
      );

      if (!xmlDoc) {
        notFounds.push(csv['Número de Autorización']);
      }

      const { monto_bien, monto_servicio } = montosHandler(csv, xmlDoc);

      return {
        fecha_emision: csv['Fecha de emisión'],
        numero_autorizacion: csv['Número de Autorización'],
        tipo_dte: csv['Tipo de DTE (nombre)'],
        serie: csv['Serie'],
        numero_dte: csv['Número del DTE'],
        nit_emisor: csv['NIT del emisor'],
        nombre_emisor: csv['Nombre completo del emisor'],
        codigo_establecimiento: csv['Código de establecimiento'],
        nombre_establecimiento: csv['Nombre del establecimiento'],
        id_receptor: csv['ID del receptor'],
        nombre_receptor: csv['Nombre completo del receptor'],
        nit_certificador: csv['NIT del Certificador'],
        nombre_certificador: csv['Nombre completo del Certificador'],
        moneda: csv['Moneda'],
        monto_total: toDecimalString(csv['Gran Total (Moneda Original)']),
        estado: csv['Estado'],
        marca_anulado: csv['Marca de anulado'],
        fecha_anulacion: csv['Fecha de anulación'],
        iva: toDecimalString(csv['IVA (monto de este impuesto)']),
        petroleo: toDecimalString(csv['Petróleo (monto de este impuesto)']),
        turismo_hospedaje: toDecimalString(
          csv['Turismo Hospedaje (monto de este impuesto)']
        ),
        turismo_pasajes: toDecimalString(
          csv['Turismo Pasajes (monto de este impuesto)']
        ),
        timbre_prensa: toDecimalString(
          csv['Timbre de Prensa (monto de este impuesto)']
        ),
        bomberos: toDecimalString(csv['Bomberos (monto de este impuesto)']),
        tasa_municipal: toDecimalString(
          csv['Tasa Municipal (monto de este impuesto)']
        ),
        bebidas_alcoholicas: toDecimalString(
          csv['Bebidas alcohólicas (monto de este impuesto)']
        ),
        bebidas_no_alcoholicas: toDecimalString(
          csv['Bebidas no Alcohólicas (monto de este impuesto)']
        ),
        tabaco: toDecimalString(csv['Tabaco (monto de este impuesto)']),
        cemento: toDecimalString(csv['Cemento (monto de este impuesto)']),
        tarifa_portuaria: toDecimalString(
          csv['Tarifa Portuaria (monto de este impuesto)']
        ),
        monto_bien,
        monto_servicio
      };
    });

    docs.forEach((document: any) => {
      const { cuenta_debe, cuenta_haber, tipo } = handleDetails(
        document,
        tipoOperacionSelected.value,
        cuentasOptions
      );

      Object.assign(document, { cuenta_debe, cuenta_haber, tipo });
    });

    return [docs as IDoc[], notFounds];
  };

  const handleDetails = (
    documento: any,
    tipo: any,
    cuentas: SelectOption[]
  ) => {
    const cuentaLabels = {
      ventas_bienes: '410101',
      ventas_servicios: '410102',
      gastos: '520218',
      caja: '110101',
      combustibles: '520223',
      fpeq: '520238',
      compras_servicios: '520239',
      compras_bienes: '520240'
    };

    const getCuenta = (label: string) =>
      cuentas.find((cuenta) => cuenta.label.includes(label));

    const getCuentaById = (cuentaId: string) =>
      cuentas.find((cuenta) => `${cuenta.value}` === cuentaId);

    const getCuentaId = (doc: any) => {
      if (tipo === 'venta') {
        if (parseFloat(doc.monto_servicio) > 0) {
          return getCuenta(cuentaLabels.ventas_servicios);
        }
        return getCuenta(cuentaLabels.ventas_bienes);
      }

      if (tipo === 'compra') {
        if (doc.tipo_dte === 'FPEQ') {
          return getCuenta(cuentaLabels.fpeq);
        }
        if (doc.petroleo > 0) {
          return getCuenta(cuentaLabels.combustibles);
        }
        if (parseFloat(doc.monto_servicio) > 0) {
          return getCuenta(cuentaLabels.compras_servicios);
        }
        return getCuenta(cuentaLabels.compras_bienes);
      }

      // Si no se cumple ninguna condición
      return getCuenta(cuentaLabels.ventas_bienes);
    };

    const setCuentasDefault = () => {
      const cuenta_debe_default =
        (cuentaDebeDefaultId &&
          getCuentaById(String(cuentaDebeDefaultId))) ??
        getCuenta(cuentaLabels.caja);

      const cuenta_haber_default =
        (cuentaHaberDefaultId &&
          getCuentaById(String(cuentaHaberDefaultId))) ??
        getCuenta(cuentaLabels.caja);

      if (tipo === 'venta') {
        return {
          cuenta_debe: cuenta_debe_default,
          cuenta_haber: getCuentaId(documento)
        };
      } else {
        return {
          cuenta_debe: getCuentaId(documento),
          cuenta_haber: cuenta_haber_default
        };
      }
    };

    const { cuenta_debe, cuenta_haber } = setCuentasDefault();

    let documento_tipo: TipoFactura = 'bien_y_servicio';
    if (parseFloat(documento.monto_bien) > 0) documento_tipo = 'bien';
    if (parseFloat(documento.monto_servicio) > 0) documento_tipo = 'servicio';
    if (
      parseFloat(documento.monto_servicio) > 0 &&
      parseFloat(documento.monto_bien) > 0
    )
      documento_tipo = 'bien_y_servicio';
    if (parseFloat(documento.petroleo) > 0) documento_tipo = 'combustibles';

    if (tipo === 'compra') {
      if (documento.tipo_dte == 'FPEQ' || documento.tipo_dte == 'FCAP')
        documento_tipo = 'pequeno_contribuyente';
      if (documento.tipo_dte == 'RECI' || documento.tipo_dte == 'RDON')
        documento_tipo = 'sin_derecho_credito_fiscal';
    }

    return {
      cuenta_debe: cuenta_debe ? cuenta_debe.value : null,
      cuenta_haber: cuenta_haber ? cuenta_haber.value : null,
      tipo: documento_tipo
    };
  };

  const montosHandler = (csv: Documento, xml?: IFactura) => {
    let monto_bien = '0.00';
    const monto_servicio = '0.00';

    if (xml) {
      return {
        monto_bien: toDecimalString(xml.monto_bien),
        monto_servicio: toDecimalString(xml.monto_servicio)
      };
    }

    const total = toNumber(csv['Gran Total (Moneda Original)']);
    const iva = toNumber(csv['IVA (monto de este impuesto)']);
    const descuentos = handlerDecuentos(csv);

    monto_bien = toDecimalString(total - iva - descuentos);

    return {
      monto_bien,
      monto_servicio
    };
  };

  const handlerDecuentos = (csv: Documento): number => {
    const petroleo = toNumber(csv['Petróleo (monto de este impuesto)']);
    const turismo_hospedaje = toNumber(
      csv['Turismo Hospedaje (monto de este impuesto)']
    );
    const turismo_pasajes = toNumber(
      csv['Turismo Pasajes (monto de este impuesto)']
    );
    const timbre_prensa = toNumber(
      csv['Timbre de Prensa (monto de este impuesto)']
    );
    const bomberos = toNumber(csv['Bomberos (monto de este impuesto)']);
    const tasa_municipal = toNumber(
      csv['Tasa Municipal (monto de este impuesto)']
    );
    const bebidas_alcoholicas = toNumber(
      csv['Bebidas alcohólicas (monto de este impuesto)']
    );
    const bebidas_no_alcoholicas = toNumber(
      csv['Bebidas no Alcohólicas (monto de este impuesto)']
    );
    const tabaco = toNumber(csv['Tabaco (monto de este impuesto)']);
    const cemento = toNumber(csv['Cemento (monto de este impuesto)']);
    const tarifa_portuaria = toNumber(
      csv['Tarifa Portuaria (monto de este impuesto)']
    );

    const descuentos =
      petroleo +
      turismo_hospedaje +
      turismo_pasajes +
      timbre_prensa +
      bomberos +
      tasa_municipal +
      bebidas_alcoholicas +
      bebidas_no_alcoholicas +
      tabaco +
      cemento +
      tarifa_portuaria;

    return descuentos || 0;
  };

  const confirmNotFound = () => {
    setNotFoundModal(false);
    setNotFound([]);
  };

  const submitDocuments = async () => {
    try {
      setLoading(true);
      setErrorAlert(null);

      const { status, message } = await crearDocumentos(
        documentos,
        Number(empresaId),
        String(tipoOperacionSelected.value),
        date
      );
      if (status == 200) {
        setModalSubmit(false);
        toast.success('Documentos creados correctamente');
        setContinueModal(true);
      } else {
        setErrorAlert({
          title: 'Error al guardar (Documentos ya creados)',
          messages: [message]
        });
        toast.error(message, { autoClose: 10000 });
      }
    } catch (error: any) {
      console.log(error);
      const msg = 'Error al guardar los documentos: ' + error;
      setErrorAlert({
        title: 'Error inesperado',
        messages: [msg]
      });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ Validación de NIT según tipo de operación:
   * - VENTA: NIT del emisor debe coincidir con el NIT de la empresa en TODAS las filas
   * - COMPRA: ID del receptor debe coincidir con el NIT de la empresa en TODAS las filas
   * Si hay errores, muestra las series afectadas.
   */
  const validateNitInFiles = (
    nitEmpresa: string,
    tipoOperacion: OptionType,
    docsCSV: Documento[]
  ): boolean => {
    const nit = (nitEmpresa ?? '').trim();

    if (!nit) {
      setErrorAlert({
        title: 'Error de empresa',
        messages: ['Error al obtener el NIT de la empresa.']
      });
      toast.error('Error al obtener el NIT de la empresa.');
      return false;
    }

    const isCompra = tipoOperacion.value === 'compra';
    const campo = isCompra ? 'ID del receptor' : 'NIT del emisor';
    const mensajeBase = isCompra
      ? 'NIT DEL RECEPTOR NO COINCIDE CON EL NIT DE LA EMPRESA A TRABAJAR PARA LAS FACTURAS'
      : 'NIT DEL EMISOR NO COINCIDE CON EL NIT DE LA EMPRESA A TRABAJAR PARA LAS FACTURAS';

    const seriesInvalidas: string[] = [];

    for (const doc of docsCSV) {
      const nitDoc = String((doc as any)[campo] ?? '').trim();
      if (nitDoc !== nit) {
        const serieRaw = (doc as any)['Serie'] ?? '';
        const serie = String(serieRaw || '').trim() || '(SIN SERIE)';
        seriesInvalidas.push(serie);
      }
    }

    if (seriesInvalidas.length > 0) {
      const seriesUnicas = Array.from(new Set(seriesInvalidas));

      setErrorAlert({
        title: isCompra
          ? 'Error de NIT del receptor'
          : 'Error de NIT del emisor',
        messages: [
          mensajeBase,
          `Analizar las facturas con Serie: ${seriesUnicas.join(', ')}.`
        ]
      });

      toast.error(
        `${mensajeBase}: ${seriesUnicas.join(', ')}`
      );
      return false;
    }

    return true;
  };

  const handleAccept = () => {
    setErrorAlert(null);

    if (!tipoOperacionSelected.value) {
      setErrorAlert({
        title: 'Validación de tipo de operación',
        messages: ['POR FAVOR SELECCIONA UN TIPO DE OPERACIÓN']
      });
      toast.error('POR FAVOR SELECCIONA UN TIPO DE OPERACIÓN');
      return;
    }

    if (documentosCSV.length === 0) {
      setErrorAlert({
        title: 'Validación de archivos',
        messages: ['No se ha cargado el archivo EXCEL (CSV).']
      });
      toast.error('No se ha cargado el Excel');
      return;
    }
    if (documentosBackupXML.length === 0) {
      setErrorAlert({
        title: 'Validación de archivos',
        messages: ['No se han cargado los archivos XML.']
      });
      toast.error('No se han cargado los XML');
      return;
    }

    if (!date) {
      setErrorAlert({
        title: 'Validación de fecha',
        messages: ['Seleccione una fecha válida en el campo "Selecciona la fecha".']
      });
      toast.error('Seleccione una fecha válida');
      return;
    }

    if (
      !validateNitInFiles(
        empresaNit,
        tipoOperacionSelected,
        documentosCSV
      )
    ) {
      return;
    }

    const [newDocs, notFounds] = combinateDocs();
    setDocumentos(newDocs);
    setNotFound(notFounds);

    if (notFounds.length > 0) {
      setNotFoundModal(true);
    }

    return setStep(2);
  };

  const handleChange = (
    propertyName: string,
    newValue: OptionType | null,
    row: IDoc
  ) => {
    if (newValue) {
      const updatedDocumentosData = documentos.map((documento) => {
        if (documento === row) {
          return {
            ...documento,
            [propertyName]: String(newValue.value)
          };
        }
        return documento;
      });
      setDocumentos(updatedDocumentosData);
    }
  };

  const clearStates = () => {
    setStep(1);
    setCSVFile([]);
    setDocumentosCSV([]);
    setXMLFile([]);
    setDocumentosBackupXML([]);
    setDocumentosXML([]);
    setDocumentos([]);
    setTipoOperacionSelected({
      value: '',
      label: 'Selecciona',
      error: ''
    });
    setDate(new Date());
    setModalSubmit(false);
    setContinueModal(false);
    setErrorAlert(null);
  };

  const continueUpload = () => {
    setStep(1);
    setCSVFile([]);
    setDocumentosCSV([]);
    setXMLFile([]);
    setDocumentosBackupXML([]);
    setDocumentosXML([]);
    setDocumentos([]);
    setModalSubmit(false);
    setContinueModal(false);
    setErrorAlert(null);
  };

  const comprasColumns: TableColumn<IDoc>[] = [
    {
      name: 'Fecha de Emisión',
      selector: (row) =>
        row.fecha_emision ? parseDate(row.fecha_emision) : '',
      minWidth: '150px'
    },
    {
      name: 'Tipo DTE',
      selector: (row) => row.tipo_dte ?? ''
    },
    {
      name: 'Serie',
      selector: (row) => row.serie ?? ''
    },
    {
      name: 'Número de Autorización',
      selector: (row) => row.numero_autorizacion ?? '',
      minWidth: '200px'
    },
    {
      name: 'Número DTE',
      selector: (row) => row.numero_dte ?? '',
      minWidth: '120px'
    },
    {
      name: 'ID Receptor',
      selector: (row) => row.id_receptor ?? '',
      minWidth: '150px'
    },
    {
      name: 'Nombre Receptor',
      selector: (row) => row.nombre_receptor ?? '',
      minWidth: '300px'
    },
    {
      name: 'Moneda',
      selector: (row) => row.moneda ?? '',
      minWidth: '120px'
    },
    {
      name: 'NIT Emisor',
      selector: (row) => row.nit_emisor ?? '',
      minWidth: '150px'
    },
    {
      name: 'Código Establecimiento',
      selector: (row) => row.codigo_establecimiento ?? ''
    },
    {
      name: 'Bien',
      selector: (row) => row.monto_bien ?? '0',
      minWidth: '120px'
    },
    {
      name: 'Servicio',
      selector: (row) => row.monto_servicio ?? '0',
      minWidth: '120px'
    },
    {
      name: 'Petroleo',
      selector: (row) => row.petroleo ?? '0',
      omit: omitColumn(documentosXML, 'petroleo'),
      minWidth: '120px'
    },
    {
      name: 'Turismo Hospedaje',
      selector: (row) => row.turismo_hospedaje ?? '0',
      omit: omitColumn(documentosXML, 'turismo_hospedaje'),
      minWidth: '120px'
    },
    {
      name: 'Turismo Pasajes',
      selector: (row) => row.turismo_pasajes ?? '0',
      omit: omitColumn(documentosXML, 'turismo_pasajes'),
      minWidth: '120px'
    },
    {
      name: 'Timbre Prensa',
      selector: (row) => row.timbre_prensa ?? '0',
      omit: omitColumn(documentosXML, 'timbre_prensa'),
      minWidth: '120px'
    },
    {
      name: 'Bomberos',
      selector: (row) => row.bomberos ?? '0',
      omit: omitColumn(documentosXML, 'bomberos'),
      minWidth: '120px'
    },
    {
      name: 'Tasa Municipal',
      selector: (row) => row.tasa_municipal ?? '0',
      omit: omitColumn(documentosXML, 'tasa_municipal'),
      minWidth: '120px'
    },
    {
      name: 'Bebidas Alcohólicas',
      selector: (row) => row.bebidas_alcoholicas ?? '0',
      omit: omitColumn(documentosXML, 'bebidas_alcoholicas'),
      minWidth: '120px'
    },
    {
      name: 'Tabaco',
      selector: (row) => row.tabaco ?? '0',
      omit: omitColumn(documentosXML, 'tabaco'),
      minWidth: '120px'
    },
    {
      name: 'Cemento',
      selector: (row) => row.cemento ?? '0',
      omit: omitColumn(documentosXML, 'cemento'),
      minWidth: '120px'
    },
    {
      name: 'Bebidas No Alcohólicas',
      selector: (row) => row.bebidas_no_alcoholicas ?? '0',
      omit: omitColumn(documentosXML, 'bebidas_no_alcoholicas'),
      minWidth: '120px'
    },
    {
      name: 'Tarifa Portuaria',
      selector: (row) => row.tarifa_portuaria ?? '0',
      omit: omitColumn(documentosXML, 'tarifa_portuaria'),
      minWidth: '120px'
    },
    {
      name: 'IVA',
      selector: (row) => row.iva ?? '0',
      minWidth: '120px'
    },
    {
      name: 'Total',
      selector: (row) => row.monto_total ?? '0',
      minWidth: '120px'
    },
    {
      name: 'Nombre completo del Emisor',
      selector: (row) => row.nombre_emisor ?? '',
      minWidth: '300px',
      sortable: true
    },
    {
      name: 'Nombre Establecimiento',
      selector: (row) => row.nombre_establecimiento ?? '',
      sortable: true,
      minWidth: '300px'
    },
    {
      name: 'Cuenta Debe',
      minWidth: '250px',
      cell: (row) => {
        return (
          <SelectTable
            values={cuentasOptions}
            value={row.cuenta_debe}
            onChange={(newValue) =>
              handleChange('cuenta_debe', newValue, row)
            }
            loading={fetching}
            isOptionDisabled={(option) => option.nivel <= 3}
          />
        );
      }
    },
    {
      name: 'Cuenta Haber',
      minWidth: '250px',
      cell: (row) => {
        return (
          <SelectTable
            values={cuentasOptions}
            value={row.cuenta_haber}
            onChange={(newValue) =>
              handleChange('cuenta_haber', newValue, row)
            }
            loading={fetching}
            isOptionDisabled={(option) => option.nivel <= 3}
          />
        );
      }
    },
    {
      name: 'Tipo',
      minWidth: '250px',
      cell: (row) => {
        return (
          <SelectTable
            values={tiposDocumentoCompra}
            value={row.tipo}
            onChange={(newValue) =>
              handleChange('tipo', newValue, row)
            }
            loading={fetching}
          />
        );
      }
    }
  ];

  const ventasColumns: TableColumn<IDoc>[] = [
    {
      name: 'Fecha de Emisión',
      selector: (row) =>
        row.fecha_emision ? parseDate(row.fecha_emision) : '',
      minWidth: '150px'
    },
    {
      name: 'Tipo DTE',
      selector: (row) => row.tipo_dte ?? ''
    },
    {
      name: 'Serie',
      selector: (row) => row.serie ?? ''
    },
    {
      name: 'Número de Autorización',
      selector: (row) => row.numero_autorizacion ?? '',
      minWidth: '200px'
    },
    {
      name: 'Número DTE',
      selector: (row) => row.numero_dte ?? '',
      minWidth: '120px'
    },
    {
      name: 'NIT Emisor',
      selector: (row) => row.nit_emisor ?? '',
      minWidth: '150px'
    },
    {
      name: 'Nombre Emisor',
      selector: (row) => row.nombre_emisor ?? '',
      minWidth: '300px'
    },
    {
      name: 'Código Establecimiento',
      selector: (row) => row.codigo_establecimiento ?? ''
    },
    {
      name: 'Nombre Establecimiento',
      selector: (row) => row.nombre_establecimiento ?? '',
      sortable: true
    },
    {
      name: 'ID Receptor',
      selector: (row) => row.id_receptor ?? '',
      minWidth: '150px'
    },
    {
      name: 'Nombre Receptor',
      selector: (row) => row.nombre_receptor ?? '',
      minWidth: '300px'
    },
    {
      name: 'Moneda',
      selector: (row) => row.moneda ?? '',
      minWidth: '120px'
    },
    {
      name: 'Bien',
      selector: (row) => row.monto_bien ?? '0',
      minWidth: '120px'
    },
    {
      name: 'Servicio',
      selector: (row) => row.monto_servicio ?? '0',
      minWidth: '120px'
    },
    {
      name: 'Petroleo',
      selector: (row) => row.petroleo ?? '0',
      omit: omitColumn(documentosXML, 'petroleo'),
      minWidth: '120px'
    },
    {
      name: 'Turismo Hospedaje',
      selector: (row) => row.turismo_hospedaje ?? '0',
      omit: omitColumn(documentosXML, 'turismo_hospedaje'),
      minWidth: '120px'
    },
    {
      name: 'Turismo Pasajes',
      selector: (row) => row.turismo_pasajes ?? '0',
      omit: omitColumn(documentosXML, 'turismo_pasajes'),
      minWidth: '120px'
    },
    {
      name: 'Timbre Prensa',
      selector: (row) => row.timbre_prensa ?? '0',
      omit: omitColumn(documentosXML, 'timbre_prensa'),
      minWidth: '120px'
    },
    {
      name: 'Bomberos',
      selector: (row) => row.bomberos ?? '0',
      omit: omitColumn(documentosXML, 'bomberos'),
      minWidth: '120px'
    },
    {
      name: 'Tasa Municipal',
      selector: (row) => row.tasa_municipal ?? '0',
      omit: omitColumn(documentosXML, 'tasa_municipal'),
      minWidth: '120px'
    },
    {
      name: 'Bebidas Alcohólicas',
      selector: (row) => row.bebidas_alcoholicas ?? '0',
      omit: omitColumn(documentosXML, 'bebidas_alcoholicas'),
      minWidth: '120px'
    },
    {
      name: 'Tabaco',
      selector: (row) => row.tabaco ?? '0',
      omit: omitColumn(documentosXML, 'tabaco'),
      minWidth: '120px'
    },
    {
      name: 'Cemento',
      selector: (row) => row.cemento ?? '0',
      omit: omitColumn(documentosXML, 'cemento'),
      minWidth: '120px'
    },
    {
      name: 'Bebidas No Alcohólicas',
      selector: (row) => row.bebidas_no_alcoholicas ?? '0',
      omit: omitColumn(documentosXML, 'bebidas_no_alcoholicas'),
      minWidth: '120px'
    },
    {
      name: 'Tarifa Portuaria',
      selector: (row) => row.tarifa_portuaria ?? '0',
      omit: omitColumn(documentosXML, 'tarifa_portuaria'),
      minWidth: '120px'
    },
    {
      name: 'IVA',
      selector: (row) => row.iva ?? '0',
      minWidth: '120px'
    },
    {
      name: 'Total',
      selector: (row) => row.monto_total ?? '0',
      minWidth: '120px'
    },
    {
      name: 'Cuenta Debe',
      minWidth: '250px',
      cell: (row) => {
        return (
          <SelectTable
            values={cuentasOptions}
            value={row.cuenta_debe}
            onChange={(newValue) =>
              handleChange('cuenta_debe', newValue, row)
            }
            loading={fetching}
            isOptionDisabled={(option) => option.nivel <= 3}
          />
        );
      }
    },
    {
      name: 'Cuenta Haber',
      minWidth: '250px',
      cell: (row) => {
        return (
          <SelectTable
            values={cuentasOptions}
            value={row.cuenta_haber}
            onChange={(newValue) =>
              handleChange('cuenta_haber', newValue, row)
            }
            loading={fetching}
            isOptionDisabled={(option) => option.nivel <= 3}
          />
        );
      }
    },
    {
      name: 'Tipo',
      minWidth: '250px',
      cell: (row) => {
        return (
          <SelectTable
            values={tiposDocumentoVenta}
            value={row.tipo}
            onChange={(newValue) =>
              handleChange('tipo', newValue, row)
            }
            loading={fetching}
          />
        );
      }
    }
  ];

  return (
    <>
      <div className="flex flex-col gap-5">
        {errorAlert && (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                !
              </span>
              <div>
                <p className="font-semibold mb-1">
                  {errorAlert.title}
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {errorAlert.messages.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-10">
          <div className="flex flex-col w-full">
            <span className="mb-1 text-sm font-medium text-gray-700">
              Selecciona el tipo de Operación de los documentos:
            </span>
            <SelectTable
              values={tiposOperacion}
              value={tipoOperacionSelected.value}
              onChange={(newValue: OptionType | null) =>
                newValue && setTipoOperacionSelected(newValue)
              }
              loading={false}
            />
          </div>
          <CalendarMonth
            label="Selecciona la fecha: "
            date={date}
            setDate={setDate}
          />
        </div>
        {step === 2 && (
          <div className="flex justify-end">
            <Button icon onClick={clearStates} variant="error">
              <TrashIcon />
              Descartar información
            </Button>
          </div>
        )}
        {step === 1 && (
          <div className="flex gap-5 flex-col">
            <div className="flex gap-5">
              <UploadFacturasCSV
                files={CSVFile}
                setFiles={setCSVFile}
                setData={setDocumentosCSV}
                validated={documentosCSV.length > 0}
                itemCounter={documentosCSV.length}
              />
              <UploadFacturasXML
                files={XMLFile}
                setFiles={setXMLFile}
                setData={setDocumentosBackupXML}
                validated={documentosBackupXML.length > 0}
                itemCounter={documentosBackupXML.length}
              />
            </div>
            <Button className="w-80 mx-auto" onClick={handleAccept}>
              Confirmar Datos
            </Button>
          </div>
        )}
        {step === 2 && (
          <>
            <Table
              columns={
                tipoOperacionSelected.value == 'venta'
                  ? ventasColumns
                  : comprasColumns
              }
              rows={documentos}
              pending={false}
              pagination
            />
            <Button className="w-80 mx-auto" onClick={handleConfirm}>
              Guardar Datos
            </Button>
          </>
        )}
      </div>
      <Modal
        isOpen={notFoundModal}
        setIsOpen={setNotFoundModal}
        title="Error en Facturas"
      >
        <div className="flex flex-col justify-center items-center py-4">
          <p className="mb-4 text-sm text-center">
            Se ha encontrado un problema al procesar las facturas XML. Las
            siguientes facturas no se pudieron identificar correctamente en
            los archivos XML. Por defecto, se clasificarán como facturas de
            tipo <strong>BIEN</strong>, basándose en la información
            proporcionada en el archivo EXCEL.
          </p>

          <div className="w-full bg-slate-200 rounded-sm p-4">
            <ul className="list-none space-y-2 max-h-96 overflow-auto">
              {notFound.map((fact, index) => (
                <li
                  key={index}
                  className="flex items-center text-sm"
                >
                  <span className="mr-2 text-gray-700">-</span>
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex border-t pt-4 justify-center">
          <Button onClick={confirmNotFound} variant="primary">
            Aceptar
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={modalSubmit}
        setIsOpen={setModalSubmit}
        title="Cargar Facturas"
      >
        <div className="flex flex-col justify-center items-center py-4">
          <p className="text-center mb-2">
            ¿Está seguro de realizar esta acción?
          </p>
          <Row>
            <Title text={'Tipo de operación:'} />
            <Value text={tipoOperacionSelected.label} />
          </Row>
          <Row>
            <Title text={'Empresa:'} />
            <Value text={empresaNombre} />
          </Row>
          <Row>
            <Title text={'Fecha:'} />
            <Value
              text={moment(
                new Date(date).toISOString().split('T')[0]
              )
                .locale('es')
                .format('MMMM YYYY')}
            />
          </Row>
        </div>
        <div className="flex border-t pt-4 gap-2 justify-end">
          <Button
            onClick={() => setModalSubmit(false)}
            variant="error"
          >
            Cancelar
          </Button>
          <Button
            onClick={submitDocuments}
            variant="success"
            loading={loading}
          >
            Cargar Facturas
          </Button>
        </div>
      </Modal>
      <ContinueModal
        isOpen={continueModal}
        setIsOpen={setContinueModal}
        text="¿Desea continuar subiendo Documentos?"
        href={`/dashboard/contador/${usuario}/empresas/${empresaId}/documentos`}
        continueAction={continueUpload}
      />
    </>
  );
};

const Title = ({ text }: { text: string }) => {
  return (
    <span className="text-gray-700 font-bold ">{`${text} `}</span>
  );
};

const Value = ({ text }: { text: string }) => {
  return (
    <span className="text-blue-600 font-bold capitalize">
      {text}
    </span>
  );
};

const Row = ({ children }: { children: React.ReactNode }) => {
  return <p className="mb-2 text-center">{children}</p>;
};
