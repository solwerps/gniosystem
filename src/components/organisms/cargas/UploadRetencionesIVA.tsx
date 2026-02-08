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
import * as XLSX from "xlsx";

interface UploadRetencionesIVAProps {
  empresaId: number;
  empresaNombre: string;
  empresaNit: string;
  continuarHref: string;
}

export const UploadRetencionesIVA: React.FC<UploadRetencionesIVAProps> = ({
  empresaId,
  empresaNombre,
  empresaNit,
  continuarHref,
}) => {
  const [retencionesFile, setRetencionesFile] = useState<File[]>([]);
  const [retencionesData, setRetencionesData] = useState<IUploadRetencionIVA[]>([]);
  const [nitRetenidoHeader, setNitRetenidoHeader] = useState("");
  const [nitRetenidoParsed, setNitRetenidoParsed] = useState(false);

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
    if (retencionesFile.length === 0) {
      setNitRetenidoHeader("");
      setNitRetenidoParsed(false);
      return;
    }

    const file = retencionesFile[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const buffer = e.target?.result as ArrayBuffer;
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: "array" });
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
      (row) => !(row as any)["NIT RETENIDO"] && !(row as any)["NIT RETENIDO:"]
    );

    if (!needsNit) return;

    setRetencionesData((prev) =>
      prev.map((row) =>
        (row as any)["NIT RETENIDO"] || (row as any)["NIT RETENIDO:"]
          ? row
          : {
              ...row,
              "NIT RETENIDO": nitRetenidoHeader,
            }
      )
    );
  }, [nitRetenidoHeader, retencionesData]);

  useEffect(() => {
    const validateData = (data: any): data is IUploadRetencionIVA => {
      const nitRetenido = getNitRetenido(data, nitRetenidoHeader);
      return (
        typeof nitRetenido === "string" &&
        nitRetenido.trim().length > 0 &&
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
      const rowHasNit = retencionesData.some(
        (row) => (row as any)["NIT RETENIDO"] || (row as any)["NIT RETENIDO:"]
      );

      if (!rowHasNit && !nitRetenidoParsed) {
        return;
      }

      for (const item of retencionesData) {
        if (!validateData(item)) {
          toast.error(
            "Datos inválidos en los documentos de retención. Verifica que exista la columna NIT RETENIDO o el encabezado del archivo."
          );
          setRetencionesData([]);
          return;
        }
      }

      const empresaNitNormalizado = normalizeNit(empresaNit);
      if (!empresaNitNormalizado) {
        toast.error("No se encontró el NIT de la empresa.");
        setRetencionesData([]);
        return;
      }

      const nitNoCoincide = retencionesData.find((item) => {
        const nitRetenido = getNitRetenido(item, nitRetenidoHeader);
        return normalizeNit(nitRetenido) !== empresaNitNormalizado;
      });

      if (nitNoCoincide) {
        toast.error(
          "El NIT RETENIDO no coincide con el NIT de la empresa. Revisa el archivo."
        );
        setRetencionesData([]);
        return;
      }

      const constancias = retencionesData
        .map((item) => normalizeConstancia(item["CONSTANCIA"]))
        .filter(Boolean);
      const duplicadas = findDuplicates(constancias);

      if (duplicadas.length > 0) {
        toast.error(
          `Constancia duplicada en el archivo: ${duplicadas
            .slice(0, 5)
            .join(", ")}`
        );
        setRetencionesData([]);
        return;
      }
    }
  }, [retencionesData, empresaNit, nitRetenidoHeader, nitRetenidoParsed]);

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
      name: "NIT Retenido",
      selector: (row) => getNitRetenido(row, nitRetenidoHeader),
    },
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

const normalizeNit = (value: string) => {
  return String(value ?? "")
    .trim()
    .replace(/[-\s]/g, "")
    .toUpperCase();
};

const getNitRetenido = (
  row: IUploadRetencionIVA,
  fallback?: string
) => {
  const raw =
    (row as any)["NIT RETENIDO"] ??
    (row as any)["NIT RETENIDO:"] ??
    fallback ??
    "";
  return String(raw ?? "").trim();
};

const normalizeConstancia = (value: string) => {
  return String(value ?? "").trim();
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
      const cellText = String(cell ?? "").trim();
      if (!cellText) continue;

      const normalized = cellText.replace(/\s+/g, " ").toUpperCase();
      if (normalized.includes("NIT RETENIDO")) {
        const next = row[i + 1];
        const nextText = String(next ?? "").trim();
        if (nextText) return nextText;

        const parts = cellText.split(":");
        if (parts.length > 1) {
          const value = parts.slice(1).join(":").trim();
          if (value) return value;
        }
      }
    }
  }

  return "";
};
