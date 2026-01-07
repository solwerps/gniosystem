// src/components/organisms/cargas/UploadRetencionesIVA.tsx

"use client";

import React, { useEffect, useState } from "react";
import { DragAndDrop } from '@/components/organisms/files';
import { toast } from "react-toastify";
import type { SelectOption, OptionType, IUploadRetencionIVA } from "@/utils";
import { crearRetencionesIVA } from "@/utils";
import { Button } from '@/components/atoms';
import { CalendarMonth } from '@/components/atoms';
import { Table } from '@/components/molecules';
import { Modal } from '@/components/molecules';
import { ContinueModal } from '@/components/molecules';
import { Select } from '@/components/atoms'; // Importación añadida
import type { TableColumn } from "react-data-table-component";
import moment from "moment";

interface UploadRetencionesIVAProps {
  empresaId: number;
  empresaNombre: string;
  continuarHref: string;
}

export const UploadRetencionesIVA: React.FC<UploadRetencionesIVAProps> = ({
  empresaId,
  empresaNombre,
  continuarHref,
}) => {
  const [retencionesFile, setRetencionesFile] = useState<File[]>([]);
  const [retencionesData, setRetencionesData] = useState<IUploadRetencionIVA[]>([]);

  // Como ahora la empresa viene fija por props, solo la mostramos:
  const empresasOptions: SelectOption[] = [
    { value: empresaId, label: empresaNombre },
  ];
  const [empresaSelected, setEmpresaSelected] = useState<OptionType>({
    value: empresaId,
    label: empresaNombre,
    error: "",
  });

  // Fecha
  const [date, setDate] = useState<Date>(new Date());

  // loaders
  const [fetching] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Modals
  const [modalSubmit, setModalSubmit] = useState(false);
  const [modalConfirm, setModalConfirm] = useState(false);

  // ===============================
  // VALIDACIÓN DE DATA CSV
  // ===============================
  useEffect(() => {
    const validateData = (data: any): data is IUploadRetencionIVA => {
      return (
        typeof data["NIT RETENEDOR"] === "string" &&
        typeof data["NOMBRE RETENEDOR"] === "string" &&
        typeof data["ESTADO CONSTANCIA"] === "string" &&
        typeof data["CONSTANCIA"] === "string" &&
        typeof data["FECHA EMISION"] === "string" &&
        typeof data["TOTAL FACTURA"] === "string" &&
        typeof data["IMPORTE NETO"] === "string" &&
        typeof data["AFECTO RETENCIÓN"] === "string" &&
        typeof data["TOTAL RETENCIÓN"] === "string"
      );
    };

    if (retencionesData.length > 0) {
      for (const item of retencionesData) {
        if (!validateData(item)) {
          toast.error("Datos inválidos en los documentos de retención.");
          setRetencionesData([]);
          return;
        }
      }
    }
  }, [retencionesData]);

  // ===============================
  // HANDLERS
  // ===============================
  const handleConfirm = () => {
    if (!empresaSelected.value) {
      toast.error("Debe seleccionar una empresa para los documentos.");
      return;
    }

    if (retencionesData.length === 0) {
      toast.error("No hay documentos para guardar.");
      return;
    }

    if (!date) {
      toast.error("Seleccione una fecha válida");
      return;
    }

    setModalSubmit(true);
  };

  const submitDocuments = async () => {
    try {
      setLoading(true);

      const { status, message } = await crearRetencionesIVA(
        retencionesData,
        Number(empresaSelected.value),
        date
      );

      if (status === 200) {
        toast.success("Retenciones creadas correctamente");
        setModalConfirm(true);
      } else {
        toast.error(message);
      }
    } catch (error: any) {
      console.log(error);
      toast.error("Error al guardar las retenciones: " + error);
    } finally {
      setLoading(false);
      setModalSubmit(false);
    }
  };

  const handleContinue = () => {
    setRetencionesFile([]);
    setRetencionesData([]);
    setLoading(false);
    setModalSubmit(false);
    setModalConfirm(false);
  };

  const columns: TableColumn<IUploadRetencionIVA>[] = [
    {
      name: "NIT Retenedor",
      selector: (row) => row["NIT RETENEDOR"],
    },
    {
      name: "Nombre Retenedor",
      selector: (row) => row["NOMBRE RETENEDOR"],
    },
    {
      name: "Estado Constancia",
      selector: (row) => row["ESTADO CONSTANCIA"],
    },
    {
      name: "Constancia",
      selector: (row) => row["CONSTANCIA"],
    },
    {
      name: "Fecha de Emisión",
      selector: (row) => row["FECHA EMISION"],
    },
    {
      name: "Total Factura",
      selector: (row) => row["TOTAL FACTURA"],
    },
    {
      name: "Importe Neto",
      selector: (row) => row["IMPORTE NETO"],
    },
    {
      name: "Afecto Retención",
      selector: (row) => row["AFECTO RETENCIÓN"],
    },
    {
      name: "Total Retención",
      selector: (row) => row["TOTAL RETENCIÓN"],
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-10">
        <Select
          values={empresasOptions}
          selected={empresaSelected}
          setSelected={setEmpresaSelected}
          className="w-full"
          label="Empresa:"
          loading={fetching}
        />
        <CalendarMonth
          label="Selecciona la fecha: "
          date={date}
          setDate={setDate}
        />
      </div>

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

      {/* Modal Confirmar Carga */}
      <Modal
        isOpen={modalSubmit}
        setIsOpen={setModalSubmit}
        title="Cargar Retenciones IVA"
      >
        <div className="flex flex-col justify-center items-center py-4">
          <p className="text-center mb-2">
            ¿Está seguro de realizar esta acción?
          </p>
          <Row>
            <Title text={"Tipo de operación:"} />
            <Value text={"Retenciones de IVA"} />
          </Row>
          <Row>
            <Title text={"Empresa:"} />
            <Value text={empresaSelected.label} />
          </Row>
          <Row>
            <Title text={"Fecha:"} />
            <Value
              text={moment(new Date(date).toISOString().split("T")[0])
                .locale("es")
                .format("MMMM YYYY")}
            />
          </Row>
        </div>
        <div className="flex border-t pt-4 gap-2 justify-end">
          <Button onClick={() => setModalSubmit(false)} variant="error">
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

      {/* Modal Continuar */}
      <ContinueModal
        isOpen={modalConfirm}
        setIsOpen={setModalConfirm}
        text="¿Desea continuar subiendo Retenciones de IVA?"
        href={continuarHref}
        continueAction={handleContinue}
      />
    </div>
  );
};

const Title = ({ text }: { text: string }) => {
  return <span className="text-gray-700 font-bold ">{`${text} `}</span>;
};

const Value = ({ text }: { text: string }) => {
  return <span className="text-blue-600 font-bold capitalize">{text}</span>;
};

const Row = ({ children }: { children: React.ReactNode }) => {
  return <p className="mb-2 text-center">{children}</p>;
};
