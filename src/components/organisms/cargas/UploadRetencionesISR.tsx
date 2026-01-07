// src/components/organisms/documentos/UploadRetencionesISR.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';
import type { TableColumn } from 'react-data-table-component';

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
  continuarHref: string;      // Ruta a la que se redirige el ContinueModal
}

export const UploadRetencionesISR: React.FC<UploadRetencionesISRProps> = ({
  empresaId,
  empresaNombre,
  continuarHref,
}) => {
  const [retencionesFile, setRetencionesFile] = useState<File[]>([]);
  const [retencionesData, setRetencionesData] = useState<IUploadRetencionISR[]>([]);

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
    const validateData = (data: any): data is IUploadRetencionISR => {
      return (
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
      for (const item of retencionesData) {
        if (!validateData(item)) {
          toast.error('Datos inválidos en los documentos de retención.');
          setRetencionesData([]);
          return;
        }
      }
    }
  }, [retencionesData]);

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
