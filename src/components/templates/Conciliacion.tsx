"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import moment from "moment";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import { useSearchParams } from "next/navigation";
import type { TableColumn } from "react-data-table-component";

import {
  Badge,
  Button,
  CalendarRange,
  LeftArrow,
  Select,
  Text,
  UploadIconl,
} from "@/components/atoms";
import { Table } from "@/components/molecules";
import { DragAndDrop } from "@/components/organisms/files/DragAndDrop";
import {
  obtenerCuentasBancariasByEmpresaId,
  obtenerEmpresas,
  obtenerMovimientosBancarios,
  parseMonto,
} from "@/utils";
import type { IMovimientoBancario, OptionType } from "@/utils";

type ConciliacionProps = {
  empresaId: number;
  usuario: string;
};

interface IEstadoCuenta {
  Fecha: string;
  "Descripción": string;
  Tipo_Movimiento: "Débito" | "Crédito";
  Monto: string;
}

const getDefaultDates = () => {
  const today = moment();
  const startOfMonth = moment().startOf("month");

  if (today.date() <= 5) {
    return [
      startOfMonth.toDate(),
      moment().add(15, "days").endOf("day").toDate(),
    ];
  }

  return [startOfMonth.toDate(), today.toDate()];
};

const EMPTY_OPTION: OptionType = {
  value: "",
  label: "Selecciona",
  error: "",
};

const normalizeEstadoCuentaRows = (rows: IEstadoCuenta[]): IEstadoCuenta[] => {
  return rows.map((row) => ({
    Fecha: String(row?.Fecha ?? "").trim(),
    "Descripción": String(row?.["Descripción"] ?? "").trim(),
    Tipo_Movimiento: String(row?.Tipo_Movimiento ?? "").trim() as
      | "Débito"
      | "Crédito",
    Monto: String(row?.Monto ?? "").trim(),
  }));
};

export const Conciliacion: React.FC<ConciliacionProps> = ({
  empresaId,
  usuario,
}) => {
  const search = useSearchParams();
  const tenantSlug = search.get("tenant") || usuario;

  const [fetching, setFetching] = useState(true);

  const [step, setStep] = useState(1);

  const [estadoCuentaFile, setEstadoCuentaFile] = useState<File[]>([]);
  const [estadoCuentaData, setEstadoCuentaData] = useState<IEstadoCuenta[]>([]);
  const [movimientosBancarios, setMovimientosBancarios] = useState<
    IMovimientoBancario[]
  >([]);

  const [empresas, setEmpresas] = useState<OptionType[]>([]);
  const [empresaSelected, setEmpresaSelected] = useState<OptionType>(EMPTY_OPTION);

  const [cuentasBancarias, setCuentasBancarias] = useState<OptionType[]>([]);
  const [cuentaBancaria, setCuentaBancaria] = useState<OptionType>(EMPTY_OPTION);

  const [dates, setDates] = useState<Date[]>(getDefaultDates());

  const safeDates = useMemo(() => {
    if (dates.length >= 2) return [dates[0], dates[1]];
    if (dates.length === 1) return [dates[0], dates[0]];
    const [start, end] = getDefaultDates();
    return [start, end];
  }, [dates]);

  const fetchEmpresas = useCallback(async () => {
    try {
      setFetching(true);
      const response = await obtenerEmpresas(tenantSlug);
      const empresasData = Array.isArray(response?.data) ? response.data : [];

      const options: OptionType[] = empresasData.map((empresa: any) => ({
        value: empresa.id,
        label: `${empresa.nombre} (${empresa.nit})`,
      }));

      setEmpresas(options);

      const selectedEmpresa =
        options.find((empresa) => Number(empresa.value) === empresaId) ??
        options[0] ??
        EMPTY_OPTION;

      setEmpresaSelected({
        ...selectedEmpresa,
        error: selectedEmpresa.value ? "success" : "",
      });
    } catch (error) {
      console.error(error);
      toast.error("Error al obtener empresas.");
    } finally {
      setFetching(false);
    }
  }, [empresaId, tenantSlug]);

  const fetchCuentasBancarias = async (empresaValue: string | number) => {
    try {
      setFetching(true);
      const { status, data, message } = await obtenerCuentasBancariasByEmpresaId(
        Number(empresaValue),
        true,
        tenantSlug
      );

      if (status !== 200) {
        throw new Error(message || "No se pudieron obtener cuentas bancarias.");
      }

      setCuentasBancarias(Array.isArray(data) ? data : []);
      setCuentaBancaria(EMPTY_OPTION);
    } catch (error) {
      console.error(error);
      setCuentasBancarias([]);
      setCuentaBancaria(EMPTY_OPTION);
      toast.error("Error al obtener cuentas bancarias.");
    } finally {
      setFetching(false);
    }
  };

  const fetchMovimientos = async () => {
    try {
      setFetching(true);
      const { status, data, message } = await obtenerMovimientosBancarios(
        Number(cuentaBancaria.value),
        safeDates,
        Number(empresaSelected.value || empresaId),
        tenantSlug
      );

      if (status !== 200) {
        throw new Error(message || "No se pudieron obtener movimientos.");
      }

      setMovimientosBancarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Error al obtener movimientos bancarios.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  useEffect(() => {
    if (empresaSelected.value !== "") {
      fetchCuentasBancarias(empresaSelected.value);
    }
  }, [empresaSelected.value]);

  const downloadEstadoDeCuentaFormat = () => {
    const wb = XLSX.utils.book_new();
    const dataSheet = [
      {
        Fecha: "01/01/2025",
        "Descripción": "Pago de servicios (EJEMPLO)",
        Tipo_Movimiento: "Débito",
        Monto: "1000.00",
      },
      {
        Fecha: "01/01/2025",
        "Descripción": "Depósito cliente (EJEMPLO)",
        Tipo_Movimiento: "Crédito",
        Monto: "1000.00",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(dataSheet, {
      header: ["Fecha", "Descripción", "Tipo_Movimiento", "Monto"],
    });
    XLSX.utils.book_append_sheet(wb, ws, "EstadoDeCuentas");
    XLSX.writeFile(wb, "Formato-para-carga-de-estado-de-cuenta.xlsx");
  };

  const validateEstadoDeCuentaFormat = (
    rows: IEstadoCuenta[]
  ): IEstadoCuenta[] | null => {
    const isValidDate = (dateString: string): boolean =>
      moment(dateString, "DD/MM/YYYY", true).isValid();

    const isValidMonto = (monto: string): boolean => {
      const regex = /^\d+(\.\d{1,2})?$/;
      return regex.test(monto);
    };

    const normalizedRows = normalizeEstadoCuentaRows(rows);
    if (normalizedRows.length === 0) {
      toast.error("El archivo no contiene datos.");
      return null;
    }

    for (let i = 0; i < normalizedRows.length; i += 1) {
      const data = normalizedRows[i];

      if (!isValidDate(data.Fecha)) {
        toast.error(
          `Error en la fila ${i + 2}: Fecha inválida (${data.Fecha}). Usa formato dd/mm/yyyy.`
        );
        return null;
      }

      if (!data["Descripción"]) {
        toast.error(
          `Error en la fila ${i + 2}: Descripción inválida. Debe ser un texto no vacío.`
        );
        return null;
      }

      if (
        data.Tipo_Movimiento !== "Débito" &&
        data.Tipo_Movimiento !== "Crédito"
      ) {
        toast.error(
          `Error en la fila ${i + 2}: Tipo de movimiento inválido (${data.Tipo_Movimiento}).`
        );
        return null;
      }

      if (!isValidMonto(data.Monto)) {
        toast.error(
          `Error en la fila ${i + 2}: Monto inválido (${data.Monto}). Ejemplo válido: 1000.00.`
        );
        return null;
      }
    }

    return normalizedRows;
  };

  const handleCheck = async () => {
    if (empresaSelected.value === "") {
      toast.error("Selecciona una empresa válida.");
      return;
    }
    if (cuentaBancaria.value === "") {
      toast.error("Selecciona una cuenta bancaria válida.");
      return;
    }
    setStep(2);
    await fetchMovimientos();
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleDeleteEstadoCuenta = () => {
    setEstadoCuentaFile([]);
    setEstadoCuentaData([]);
  };

  const handleConciliar = () => {
    setStep(3);
  };

  const columnsMovimientos: TableColumn<IMovimientoBancario>[] = [
    {
      name: "Descripción",
      selector: (row) => row.descripcion,
      cell: (row) => (
        <span className="block w-full truncate" title={row.descripcion}>
          {row.descripcion}
        </span>
      ),
      minWidth: "220px",
      maxWidth: "320px",
    },
    {
      name: "Fecha",
      selector: (row) => moment(row.fecha).format("DD/MM/YYYY"),
      cell: (row) => (
        <span className="block text-center">
          {moment(row.fecha).format("DD/MM/YYYY")}
        </span>
      ),
      minWidth: "120px",
      maxWidth: "160px",
    },
    {
      name: "Tipo",
      cell: (row) =>
        row.tipo_movimiento === "debito" ? (
          <Badge variant="danger">Débito</Badge>
        ) : (
          <Badge variant="success">Crédito</Badge>
        ),
      minWidth: "120px",
      maxWidth: "140px",
      center: true,
    },
    {
      name: "Monto",
      cell: (row) => (
        <span
          className={clsx(
            "block text-right font-semibold",
            row.tipo_movimiento === "debito" ? "text-red-600" : "text-green-600"
          )}
        >
          {row.tipo_movimiento === "debito" ? "- " : "+ "}Q.
          {parseMonto(Number(row.monto))}
        </span>
      ),
      minWidth: "140px",
      right: true,
    },
  ];

  const columnsEstadoCuenta: TableColumn<IEstadoCuenta>[] = [
    {
      name: "Descripción",
      selector: (row) => row["Descripción"],
      cell: (row) => (
        <span className="block w-full truncate" title={row["Descripción"]}>
          {row["Descripción"]}
        </span>
      ),
      minWidth: "220px",
      maxWidth: "320px",
    },
    {
      name: "Fecha",
      selector: (row) => row.Fecha,
      cell: (row) => <span className="block text-center">{row.Fecha}</span>,
      minWidth: "120px",
      maxWidth: "160px",
    },
    {
      name: "Tipo",
      selector: (row) => row.Tipo_Movimiento,
      cell: (row) => (
        <span
          className={clsx(
            "block text-center font-semibold",
            row.Tipo_Movimiento === "Débito" ? "text-red-600" : "text-green-600"
          )}
        >
          {row.Tipo_Movimiento}
        </span>
      ),
      minWidth: "120px",
      center: true,
    },
    {
      name: "Monto",
      selector: (row) => row.Monto,
      cell: (row) => (
        <span
          className={clsx(
            "block text-right font-semibold",
            row.Tipo_Movimiento === "Débito" ? "text-red-600" : "text-green-600"
          )}
        >
          {row.Tipo_Movimiento === "Débito" ? "- " : "+ "}Q.
          {parseMonto(Number(row.Monto))}
        </span>
      ),
      minWidth: "140px",
      right: true,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
            <Select
              values={empresas}
              selected={empresaSelected}
              setSelected={setEmpresaSelected}
              className="w-full xl:w-3/4"
              label="Selecciona la Empresa:"
              loading={fetching}
            />
            <CalendarRange
              label="Selecciona un rango de fecha:"
              dates={dates}
              setDates={setDates}
              classNameContainer="w-full xl:w-1/4"
              customDisableDates={() => false}
            />
          </div>

          <Select
            values={cuentasBancarias}
            selected={cuentaBancaria}
            setSelected={setCuentaBancaria}
            className="w-full"
            label="Selecciona la Cuenta Bancaria:"
            loading={fetching}
            noOptionsMessage="No se encontraron cuentas bancarias para la empresa seleccionada."
          />

          <div className="flex justify-end">
            <Button className="w-full max-w-sm" onClick={handleCheck} loading={fetching}>
              Confirmar Información
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          <div className="mb-2 flex justify-start">
            <Button onClick={handleBack} variant="error" icon>
              <LeftArrow />
              Regresar
            </Button>
          </div>

          <div className="flex w-full flex-col gap-6 xl:flex-row">
            <div className="flex-1 rounded-lg bg-white p-6 shadow-md">
              <div className="w-full space-y-4">
                <Text variant="subtitle" className="text-center">
                  <span className="font-bold">Movimientos Bancarios</span>
                </Text>
                <Text variant="subtitle" className="text-center">
                  <span className="font-bold">Cuenta:</span> {cuentaBancaria.label}
                </Text>
                <Text variant="subtitle" className="text-center">
                  <span className="font-bold">De:</span>{" "}
                  {moment(safeDates[0]).format("DD/MM/YYYY")}{" "}
                  <span className="font-bold">hasta:</span>{" "}
                  {moment(safeDates[1]).format("DD/MM/YYYY")}
                </Text>
                <Table
                  columns={columnsMovimientos}
                  rows={movimientosBancarios}
                  pending={fetching}
                  pagination
                  className="shadow-md"
                />
              </div>
            </div>

            <div className="flex-1 rounded-lg bg-white p-6 shadow-md">
              {estadoCuentaData.length === 0 ? (
                <div className="relative flex h-full flex-col items-center justify-center gap-4">
                  <Button
                    onClick={downloadEstadoDeCuentaFormat}
                    variant="primary"
                    icon
                    className="absolute right-1 top-1 w-full max-w-xs"
                  >
                    <UploadIconl className="rotate-180" />
                    Descargar Formato de Estado de Cuenta
                  </Button>

                  <Text variant="paragraph" className="pt-14 text-center">
                    Sube los movimientos del estado de cuenta para compararlos
                    con los del sistema.
                  </Text>

                  <DragAndDrop
                    files={estadoCuentaFile}
                    setFiles={setEstadoCuentaFile}
                    beforAction={() => {}}
                    setData={(data) => {
                      const validRows = validateEstadoDeCuentaFormat(
                        data as IEstadoCuenta[]
                      );
                      if (!validRows) {
                        setEstadoCuentaFile([]);
                        setEstadoCuentaData([]);
                        return;
                      }
                      setEstadoCuentaData(validRows);
                    }}
                  />

                  <p className="w-full text-end text-sm italic text-gray-400">
                    Todos los montos registrados deben ser en quetzales*
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 lg:h-full lg:justify-between">
                  <Text variant="subtitle" className="text-center">
                    <span className="font-bold">Estado de Cuenta</span>
                  </Text>
                  <Table
                    columns={columnsEstadoCuenta}
                    rows={estadoCuentaData}
                    pending={false}
                    pagination
                    className="shadow-md"
                  />
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <Button
                      onClick={handleDeleteEstadoCuenta}
                      loading={fetching}
                      variant="error"
                    >
                      Descartar Estado de Cuenta
                    </Button>
                    <Button
                      onClick={handleConciliar}
                      loading={fetching}
                      variant="success"
                    >
                      Conciliar Información
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <Text variant="subtitle" className="text-center">
            Conciliación Bancaria
          </Text>
          <Text variant="paragraph" className="text-center">
            El paso 3 de conciliación automática sigue pendiente, igual que en
            Conta Cox. Ya tienes los movimientos del sistema y el estado de
            cuenta cargados/validados.
          </Text>
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Regresar al comparador
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
