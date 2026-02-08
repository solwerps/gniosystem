// src/components/organisms/documentos/UploadRetencionesISR.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import type { TableColumn } from 'react-data-table-component';
import * as XLSX from 'xlsx';

import { DragAndDrop } from '@/components/organisms/files';
import type { IUploadRetencionISR} from '@/utils';
import { crearRetencionesISR } from '@/utils';
import { Button } from '@/components/atoms';
import { CalendarMonth } from '@/components/atoms';
import { Table } from '@/components/molecules';
import { Modal } from '@/components/molecules';
import { ContinueModal } from '@/components/molecules';

interface UploadRetencionesISRProps {
  empresaId: number;          // 👈 Viene del route / de la página GNIO
  empresaNombre: string;      // Solo para mostrar en el modal/textos
  empresaNit: string;         // NIT de la empresa para validar el archivo
  continuarHref: string;      // Ruta a la que se redirige el ContinueModal
}

export const UploadRetencionesISR: React.FC<UploadRetencionesISRProps> = ({
  empresaId,
  empresaNombre,
  empresaNit,
  continuarHref,
}) => {
  const [retencionesFile, setRetencionesFile] = useState<File[]>([]);
  const [retencionesData, setRetencionesData] = useState<IUploadRetencionISR[]>([]);
  const [nitRetenidoHeader, setNitRetenidoHeader] = useState('');
  const [nitRetenidoParsed, setNitRetenidoParsed] = useState(false);

  // Fecha de trabajo (explícita, no global)
  const [date, setDate] = useState<Date>(new Date());

  // loaders
  const [loading, setLoading] = useState(false);

  // Modals
  const [modalSubmit, setModalSubmit] = useState(false);
  const [modalContinue, setModalContinue] = useState(false);

  // ============================
  // Validación de datos cargados
  // ============================
  useEffect(() => {
    if (retencionesFile.length === 0) {
      setNitRetenidoHeader('');
      setNitRetenidoParsed(false);
      return;
    }

    const file = retencionesFile[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const buffer = e.target?.result as ArrayBuffer;
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const nitRetenido = extractNitRetenido(sheet);

      setNitRetenidoHeader(nitRetenido);
      setNitRetenidoParsed(true);
    };

    reader.readAsArrayBuffer(file);
  }, [retencionesFile]);

  useEffect(() => {
    if (!nitRetenidoHeader || retencionesData.length === 0) return;

    const needsNit = retencionesData.some(
      (row) => !(row as any)['NIT RETENIDO'] && !(row as any)['NIT RETENIDO:']
    );

    if (!needsNit) return;

    setRetencionesData((prev) =>
      prev.map((row) =>
        (row as any)['NIT RETENIDO'] || (row as any)['NIT RETENIDO:']
          ? row
          : {
              ...row,
              'NIT RETENIDO': nitRetenidoHeader,
            }
      )
    );
  }, [nitRetenidoHeader, retencionesData]);

  useEffect(() => {
    const validateData = (data: any): data is IUploadRetencionISR => {
      const nitRetenido = getNitRetenido(data, nitRetenidoHeader);
      return (
        typeof nitRetenido === 'string' &&
        nitRetenido.trim().length > 0 &&
        typeof data['NIT RETENEDOR'] === 'string' &&
        typeof data['NOMBRE RETENEDOR'] === 'string' &&
        typeof data['ESTADO CONSTANCIA'] === 'string' &&
        typeof data['CONSTANCIA'] === 'string' &&
        typeof data['FECHA EMISION'] === 'string' &&
        !isNaN(Number(data['TOTAL FACTURA'])) &&
        !isNaN(Number(data['RENTA IMPONIBLE'])) &&
        !isNaN(Number(data['TOTAL RETENCIÓN']))
      );
    };

    if (retencionesData.length > 0) {
      const rowHasNit = retencionesData.some(
        (row) => (row as any)['NIT RETENIDO'] || (row as any)['NIT RETENIDO:']
      );

      if (!rowHasNit && !nitRetenidoParsed) {
        return;
      }

      for (const item of retencionesData) {
        if (!validateData(item)) {
          toast.error(
            'Datos inválidos en los documentos de retención. Verifica que exista la columna NIT RETENIDO o el encabezado del archivo.'
          );
          setRetencionesData([]);
          return;
        }
      }

      const empresaNitNormalizado = normalizeNit(empresaNit);
      if (!empresaNitNormalizado) {
        toast.error('No se encontró el NIT de la empresa.');
        setRetencionesData([]);
        return;
      }

      const nitNoCoincide = retencionesData.find((item) => {
        const nitRetenido = getNitRetenido(item, nitRetenidoHeader);
        return normalizeNit(nitRetenido) !== empresaNitNormalizado;
      });

      if (nitNoCoincide) {
        toast.error(
          'El NIT RETENIDO no coincide con el NIT de la empresa. Revisa el archivo.'
        );
        setRetencionesData([]);
        return;
      }

      const constancias = retencionesData
        .map((item) => normalizeConstancia(item['CONSTANCIA']))
        .filter(Boolean);
      const duplicadas = findDuplicates(constancias);

      if (duplicadas.length > 0) {
        toast.error(
          `Constancia duplicada en el archivo: ${duplicadas
            .slice(0, 5)
            .join(', ')}`
        );
        setRetencionesData([]);
        return;
      }
    }
  }, [retencionesData, empresaNit, nitRetenidoHeader, nitRetenidoParsed]);

  // ============================
  // Confirmar antes de enviar
  // ============================
  const handleConfirm = () => {
    if (!empresaId) {
      toast.error('No se encontró la empresa seleccionada.');
      return;
    }

    if (retencionesData.length === 0) {
      toast.error('No hay documentos para guardar.');
      return;
    }

    if (!date) {
      toast.error('Seleccione una fecha válida.');
      return;
    }

    setModalSubmit(true);
  };

  // ============================
  // Enviar al backend GNIO
  // ============================
  const submitDocuments = async () => {
    try {
      setLoading(true);

      const { status, message } = await crearRetencionesISR(
        retencionesData,
        empresaId,
        date
      );

      if (status === 200) {
        toast.success('Retenciones de ISR creadas correctamente.');
        setModalContinue(true);
      } else {
        toast.error(message || 'Error al guardar las retenciones.');
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Error al guardar las retenciones: ' + error);
    } finally {
      setLoading(false);
      setModalSubmit(false);
    }
  };

  // ============================
  // Reset para continuar
  // ============================
  const handleContinue = () => {
    setRetencionesFile([]);
    setRetencionesData([]);
    setLoading(false);
    setModalSubmit(false);
    setModalContinue(false);
  };

  // ============================
  // Columnas de la tabla previa
  // ============================
  const columns: TableColumn<IUploadRetencionISR>[] = [
    {
      name: 'NIT Retenido',
      selector: (row) => getNitRetenido(row, nitRetenidoHeader),
    },
    {
      name: 'NIT Retenedor',
      selector: (row) => row['NIT RETENEDOR'],
    },
    {
      name: 'Nombre Retenedor',
      selector: (row) => row['NOMBRE RETENEDOR'],
    },
    {
      name: 'Estado Constancia',
      selector: (row) => row['ESTADO CONSTANCIA'],
    },
    {
      name: 'Constancia',
      selector: (row) => row['CONSTANCIA'],
    },
    {
      name: 'Fecha de Emisión',
      selector: (row) => row['FECHA EMISION'],
    },
    {
      name: 'Total Factura',
      selector: (row) => row['TOTAL FACTURA'],
    },
    {
      name: 'Renta Imponible',
      selector: (row) => row['RENTA IMPONIBLE'],
    },
    {
      name: 'Total Retención',
      selector: (row) => row['TOTAL RETENCIÓN'],
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Encabezado: Empresa (fija) + Fecha de trabajo */}
      <div className="flex gap-10 items-end">
        <div className="flex flex-col w-full">
          <span className="text-sm font-semibold text-gray-600">
            Empresa:
          </span>
          <span className="text-base font-bold text-blue-700">
            {empresaNombre} (ID: {empresaId})
          </span>
        </div>
        <CalendarMonth
          label="Selecciona la fecha de trabajo:"
          date={date}
          setDate={setDate}
        />
      </div>

      {/* Drag & Drop o Tabla previa */}
      {retencionesData.length === 0 ? (
        <DragAndDrop
          files={retencionesFile}
          setFiles={setRetencionesFile}
          beforAction={() => {}}
          setData={setRetencionesData}
          range={6}
        />
      ) : (
        <>
          <Table columns={columns} rows={retencionesData} pending={false} />
          <Button
            className="w-80 mx-auto"
            onClick={handleConfirm}
            loading={loading}
          >
            Guardar Datos
          </Button>
        </>
      )}

      {/* Modal de confirmación */}
      <Modal
        isOpen={modalSubmit}
        setIsOpen={setModalSubmit}
        title="Cargar Retenciones ISR"
      >
        <div className="flex flex-col justify-center items-center py-4">
          <p className="text-center mb-2">
            ¿Está seguro de realizar esta acción?
          </p>
          <Row>
            <Title text="Tipo de operación:" />
            <Value text="Retenciones de ISR" />
          </Row>
          <Row>
            <Title text="Empresa:" />
            <Value text={empresaNombre} />
          </Row>
          <Row>
            <Title text="Fecha:" />
            <Value
              text={moment(new Date(date).toISOString().split('T')[0])
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
            Cargar Retenciones
          </Button>
        </div>
      </Modal>

      {/* Modal para continuar */}
      <ContinueModal
        isOpen={modalContinue}
        setIsOpen={setModalContinue}
        text="¿Desea continuar subiendo Retenciones de ISR?"
        href={continuarHref}
        continueAction={handleContinue}
      />
    </div>
  );
};

// Helpers de UI para el modal
const Title = ({ text }: { text: string }) => {
  return <span className="text-gray-700 font-bold ">{`${text} `}</span>;
};

const Value = ({ text }: { text: string }) => {
  return <span className="text-blue-600 font-bold capitalize">{text}</span>;
};

const Row = ({ children }: { children: React.ReactNode }) => {
  return <p className="mb-2 text-center">{children}</p>;
};

const normalizeNit = (value: string) => {
  return String(value ?? '')
    .trim()
    .replace(/[-\s]/g, '')
    .toUpperCase();
};

const getNitRetenido = (
  row: IUploadRetencionISR,
  fallback?: string
) => {
  const raw =
    (row as any)['NIT RETENIDO'] ??
    (row as any)['NIT RETENIDO:'] ??
    fallback ??
    '';
  return String(raw ?? '').trim();
};

const normalizeConstancia = (value: string) => {
  return String(value ?? '').trim();
};

const findDuplicates = (values: string[]) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    const key = value.trim();
    if (!key) return;
    if (seen.has(key)) {
      duplicates.add(key);
    } else {
      seen.add(key);
    }
  });

  return Array.from(duplicates);
};

const extractNitRetenido = (sheet: XLSX.WorkSheet) => {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: 0,
    raw: false,
  }) as Array<Array<string | number | null | undefined>>;

  for (const row of rows.slice(0, 12)) {
    if (!row) continue;
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      const cellText = String(cell ?? '').trim();
      if (!cellText) continue;

      const normalized = cellText.replace(/\s+/g, ' ').toUpperCase();
      if (normalized.includes('NIT RETENIDO')) {
        const next = row[i + 1];
        const nextText = String(next ?? '').trim();
        if (nextText) return nextText;

        const parts = cellText.split(':');
        if (parts.length > 1) {
          const value = parts.slice(1).join(':').trim();
          if (value) return value;
        }
      }
    }
  }

  return '';
};
