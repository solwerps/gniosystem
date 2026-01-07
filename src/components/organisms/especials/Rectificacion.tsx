// src/components/organisms/especials/Rectificacion.tsx

"use client";

import React, { useEffect, useState } from "react";
import type { DropResult, DraggableProvided } from "@hello-pangea/dnd";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import moment from "moment";
import { toast } from "react-toastify";

import type { IFactura } from "@/utils/models/documentos";
import type { OptionType } from "@/utils/models/variety";
import type { SelectOption } from "@/utils/models/nomenclaturas";

import { obtenerDocumentos } from "@/utils/services/documentos";
import { obtenerCuentasByEmpresa } from "@/utils/services/nomenclatura";
import { parseMonto } from "@/utils/functions/parseMonto";

import {
  Button,
  CalendarMonth,
  Select,
  Text,
  CheckBox,
} from "@/components/atoms";
import { LeftArrow } from "@/components/atoms/icons/LeftArrow";
import {
  Modal,
  RowModal,
  TitleModal,
  ValueModal,
} from "@/components/molecules";

// ======================
// Helpers locales
// ======================
const toNumber = (v: any): number => {
  const n = parseFloat(String(v ?? 0));
  return Number.isNaN(n) ? 0 : n;
};

// 🔑 ID único para cada factura en el DnD
const getFacturaDragId = (factura: IFactura): string => {
  const f: any = factura as any;

  // Si el backend ya manda identificador_unico, aprovechalo (GNIO sí lo manda)
  if (f.identificador_unico) {
    return String(f.identificador_unico);
  }

  // Fallback: combinamos varios campos que, juntos, deberían ser únicos
  return [
    factura.serie ?? "",
    factura.numero_dte ?? "",
    f.numero_autorizacion ?? "",
    f.nit_emisor ?? "",
  ].join("-");
};

// Busca el label de una cuenta (ej. "Caja General (110101)") a partir del id
const getCuentaLabelFromOptions = (
  cuentas: SelectOption[],
  cuentaId: any
): string => {
  if (cuentaId === null || cuentaId === undefined || cuentaId === "") return "";
  const found = cuentas.find(
    (c) => String(c.value) === String(cuentaId as any)
  );
  return found ? found.label : String(cuentaId ?? "");
};

interface RectificacionProps {
  empresaId: number;
  empresaNombre: string;
}

export const Rectificacion: React.FC<RectificacionProps> = ({
  empresaId,
  empresaNombre,
}) => {
  // Columns
  const [leftItems, setLeftItems] = useState<IFactura[]>([]);
  const [rightItems, setRightItems] = useState<IFactura[]>([]);

  // Steps
  const [step, setStep] = useState(1);

  // Cuentas
  const [cuentas, setCuentas] = useState<SelectOption[]>([]);
  const [cuentaDebe, setCuentaDebe] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });
  const [cuentaDebe2, setCuentaDebe2] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });
  const [cuentaHaber, setCuentaHaber] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });
  const [cuentaHaber2, setCuentaHaber2] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });

  // Fechas
  const [fetchDate, setFetchDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [date, setDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Tipo de operación (compra / venta)
  const tiposOperacion = [
    { value: "venta", label: "Venta" },
    { value: "compra", label: "Compra" },
  ];
  const [tipoOperacionSelected, setTipoOperacionSelected] =
    useState<OptionType>({
      value: "",
      label: "Selecciona",
      error: "",
    });

  // Flags
  const [deleted, setDeleted] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [submiting, setSubmiting] = useState(false);

  // Modal
  const [confirmModal, setConfirmModal] = useState(false);

  // Totales
  const [totals, setTotals] = useState({
    montoTotal: 0,
    montoBienes: 0,
    montoServicios: 0,
    iva: 0,
    descuentos: 0,
    combustibles: 0,
    fpeq: 0,
  });

  // ======================
  // Cálculo de totales
  // ======================
  const calculateTotals = (items: IFactura[]) => {
    const nuevoTotal = items.reduce(
      (acc, item) => {
        if (item.fecha_anulacion) {
          return acc;
        }

        acc.montoTotal += toNumber(item.monto_total);
        acc.montoBienes += toNumber(item.monto_bien);
        acc.montoServicios += toNumber(item.monto_servicio);
        acc.iva += toNumber(item.iva);

        acc.descuentos +=
          toNumber(item.petroleo) +
          toNumber(item.turismo_hospedaje) +
          toNumber(item.turismo_pasajes) +
          toNumber(item.timbre_prensa) +
          toNumber(item.bomberos) +
          toNumber(item.tasa_municipal) +
          toNumber(item.bebidas_alcoholicas) +
          toNumber(item.tabaco) +
          toNumber(item.cemento) +
          toNumber(item.bebidas_no_alcoholicas) +
          toNumber(item.tarifa_portuaria);

        if (item.tipo === "combustibles") {
          acc.combustibles +=
            toNumber(item.monto_bien) + toNumber(item.monto_servicio);
        }

        if (item.tipo_dte === "FPEQ") {
          acc.fpeq +=
            toNumber(item.monto_bien) + toNumber(item.monto_servicio);
        }

        return acc;
      },
      {
        montoTotal: 0,
        montoBienes: 0,
        montoServicios: 0,
        iva: 0,
        descuentos: 0,
        combustibles: 0,
        fpeq: 0,
      }
    );

    setTotals(nuevoTotal);
  };

  useEffect(() => {
    calculateTotals(rightItems);
  }, [rightItems]);


  
  // ======================
  // Drag & Drop
  // ======================
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    // mismo droppable
    if (source.droppableId === destination.droppableId) {
      const list =
        source.droppableId === "left" ? [...leftItems] : [...rightItems];
      const [movedItem] = list.splice(source.index, 1);
      list.splice(destination.index, 0, movedItem);

      if (source.droppableId === "left") {
        setLeftItems(list);
      } else {
        setRightItems(list);
      }
    } else {
      // entre columnas
      const sourceList =
        source.droppableId === "left" ? [...leftItems] : [...rightItems];
      const destinationList =
        destination.droppableId === "left" ? [...leftItems] : [...rightItems];

      const [movedItem] = sourceList.splice(source.index, 1);
      destinationList.splice(destination.index, 0, movedItem);

      if (source.droppableId === "left") {
        setLeftItems(sourceList);
        setRightItems(destinationList);
      } else {
        setLeftItems(destinationList);
        setRightItems(sourceList);
      }
    }
  };

  // ======================
  // Obtener docs + cuentas
  // ======================
  const getData = async () => {
    try {
      setFetching(true);

      let tipo: string | null = null;
      if (tipoOperacionSelected.value !== "") {
        tipo = String(tipoOperacionSelected.value);
      }

    const fecha = `${fetchDate.getFullYear()}-${String(fetchDate.getMonth() + 1).padStart(2, "0")}`;



      const [
        { status: statusDocs, data: dataDocs, message: messageDocs },
        {
          status: statusCuentas,
          data: dataCuentas,
          message: messageCuentas,
        },
      ] = await Promise.all([
        obtenerDocumentos(empresaId, fecha, tipo),
        obtenerCuentasByEmpresa(empresaId, true),
      ]);

      if (statusDocs === 200 && statusCuentas === 200) {
        if (!dataDocs || dataDocs.length === 0) {
          toast.warning("No hay documentos registrados para esa fecha.");
        } else {
          setLeftItems(dataDocs);
          setCuentas(dataCuentas);
          setStep(2);
        }
      } else {
        toast.error(
          "Error al obtener datos. Inténtalo de nuevo en unos momentos."
        );
        throw new Error(
          `Error al obtener datos. Docs: ${messageDocs}, Cuentas: ${messageCuentas}`
        );
      }
    } catch (error) {
      console.error({ error });
    } finally {
      setFetching(false);
    }
  };

  const handleCheck = () => {
    if (!tipoOperacionSelected.value) {
      toast.error("Debe seleccionar un tipo de operación (Compra o Venta).");
      return;
    }

    if (!empresaId) {
      toast.error("La empresa no es válida.");
      return;
    }

    if (!fetchDate) {
      toast.error("Seleccione una fecha válida.");
      return;
    }

    getData();
  };

  const handleBack = () => {
    setLeftItems([]);
    setRightItems([]);
    setCuentas([]);
    setCuentaDebe({ value: "", label: "Selecciona", error: "" });
    setCuentaHaber({ value: "", label: "Selecciona", error: "" });
    setCuentaDebe2({ value: "", label: "Selecciona", error: "" });
    setCuentaHaber2({ value: "", label: "Selecciona", error: "" });
    setDeleted(false);
    setDate(() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    setTotals({
      montoTotal: 0,
      montoBienes: 0,
      montoServicios: 0,
      iva: 0,
      descuentos: 0,
      combustibles: 0,
      fpeq: 0,
    });
    setStep(1);
  };

  const handleSubmit = async () => {
    try {
      setSubmiting(true);

      const debe = cuentaDebe.value === "" ? null : String(cuentaDebe.value);
      const debe2 =
        cuentaDebe2.value === "" ? null : String(cuentaDebe2.value);
      const haber =
        cuentaHaber.value === "" ? null : String(cuentaHaber.value);
      const haber2 =
        cuentaHaber2.value === "" ? null : String(cuentaHaber2.value);

      // 🔥 Aquí llamamos DIRECTO a la API GNIO
      const payload = {
        facturas: rightItems,        // la API usa identificador_unico de cada factura
        empresa_id: empresaId,
        fecha_trabajo: date,         // la API normaliza el mes y solo toca fecha_trabajo
        cuenta_debe: debe,
        cuenta_haber: haber,
        cuenta_debe2: debe2,
        cuenta_haber2: haber2,
        deleted,
      };

      const res = await fetch("/api/documentos/rectificacion", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      const { status, message } = json;

      if (status === 200) {
        toast.success("Documentos actualizados correctamente");
        setRightItems([]);
      } else {
        toast.error(message || "Error al actualizar los documentos", {
          autoClose: 10000,
        });
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Error al actualizar los documentos: " + error?.message);
    } finally {
      setConfirmModal(false);
      setSubmiting(false);
    }
  };

  const handleConfirm = () => {
    if (rightItems.length === 0) {
      return toast.error("No hay documentos para actualizar.");
    }
    if (!date) {
      return toast.error("Elige una fecha válida.");
    }
    setConfirmModal(true);
  };

  // ======================
  // Render
  // ======================
  return (
    <>
      {step === 1 && (
        <div className="flex flex-col gap-5 bg-white p-6 rounded-lg">
          <Text variant="subtitle">Información general</Text>
          <hr className="border-gray-400" />

          <p className="mt-1 mb-3 text-sm text-gray-700">
            Empresa:&nbsp;
            <span className="font-semibold text-blue-700">
              {empresaNombre} (ID: {empresaId})
            </span>
          </p>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col md:flex-row gap-6">
              <Select
                values={tiposOperacion}
                selected={tipoOperacionSelected}
                setSelected={setTipoOperacionSelected}
                className="w-full"
                label="Selecciona el tipo de Operación de los documentos: "
              />
              <CalendarMonth
                label="Selecciona la fecha (mes a rectificar): "
                date={fetchDate}
                setDate={setFetchDate}
              />
            </div>
            <div className="flex justify-end">
              <Button
                className="w-80"
                onClick={handleCheck}
                loading={fetching}
              >
                Confirmar Información
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          <div className="flex mb-4">
            <Button onClick={handleBack} variant="error" icon>
              <LeftArrow />
              Regresar
            </Button>
          </div>

          <div className="flex flex-col 2xl:flex-row gap-5">
            {/* Columna izquierda / derecha */}
            <div className="h-[50vh] w-full 2xl:w-3/4 2xl:h-[70vh]">
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="bg-white p-6 rounded-lg flex justify-between gap-5 h-full">
                  <Droppable droppableId="left">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        className="w-2/4 max-w-[50%] min-h-80 p-2 bg-[#ebecf0] rounded-lg overflow-y-auto shadow-md"
                        {...provided.droppableProps}
                      >
                        <Text
                          variant="subtitle"
                          className="text-center my-3"
                        >
                          Facturas:
                        </Text>
                        {leftItems.map((item, index) => {
                          const dragId = getFacturaDragId(item);
                          return (
                            <Draggable
                              key={dragId}
                              draggableId={dragId}
                              index={index}
                            >
                              {(draggableProvided) => (
                                <Factura
                                  provided={draggableProvided}
                                  factura={item}
                                  cuentas={cuentas}
                                />
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  <Droppable droppableId="right">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        className="w-2/4 max-w-[50%] min-h-80 p-2 bg-[#ebecf0] rounded-xl overflow-y-auto shadow-md"
                        {...provided.droppableProps}
                      >
                        <Text
                          variant="subtitle"
                          className="text-center my-3"
                        >
                          Facturas a actualizar:
                        </Text>
                        {rightItems.map((item, index) => {
                          const dragId = getFacturaDragId(item);
                          return (
                            <Draggable
                              key={dragId}
                              draggableId={dragId}
                              index={index}
                            >
                              {(draggableProvided) => (
                                <Factura
                                  provided={draggableProvided}
                                  factura={item}
                                  cuentas={cuentas}
                                />
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </DragDropContext>
            </div>

            {/* Panel derecho: totales + cambios */}
            <div className="h-[30vh] w-full 2xl:w-1/4 2xl:h-[70vh] bg-white p-6 rounded-lg shadow-md">
              <div className="w-full h-full p-2 bg-[#ebecf0] rounded-xl overflow-y-auto">
                <Text variant="subtitle" className="text-center mb-2">
                  Cantidades:
                </Text>

                <div className="p-4 mb-4 border border-solid border-gray-300 bg-white rounded-lg shadow-md flex flex-col gap-3">
                  <div className="text-sm text-gray-500">
                    <span className="text-gray-600">Monto Total: </span>
                    <span className="font-semibold text-green-600">
                      Q{parseMonto(totals.montoTotal)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="text-gray-600">Montos por Bienes: </span>
                    <span className="font-semibold text-green-600">
                      Q{parseMonto(totals.montoBienes)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="text-gray-600">
                      Montos por Servicios:{" "}
                    </span>
                    <span className="font-semibold text-green-600">
                      Q{parseMonto(totals.montoServicios)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="text-gray-600">
                      Montos por Combustibles:{" "}
                    </span>
                    <span className="font-semibold text-green-600">
                      Q{parseMonto(totals.combustibles)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="text-gray-600">Montos por FPEQ: </span>
                    <span className="font-semibold text-green-600">
                      Q{parseMonto(totals.fpeq)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="text-gray-600">IVA: </span>
                    <span className="font-semibold text-blue-600">
                      Q{parseMonto(totals.iva)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="text-gray-600">Descuentos: </span>
                    <span className="font-semibold text-red-500">
                      Q{parseMonto(totals.descuentos)}
                    </span>
                  </div>
                </div>

                <Text variant="subtitle" className="text-center mb-2">
                  Información a actualizar:
                </Text>

                <div className="p-4 mb-4 border border-solid border-gray-300 bg-white rounded-lg shadow-md flex flex-col gap-3">
                  <CalendarMonth
                    label="Selecciona la nueva fecha: "
                    date={date}
                    setDate={setDate}
                  />

                  <Select
                    values={cuentas}
                    selected={cuentaDebe}
                    setSelected={setCuentaDebe}
                    label="Selecciona una Cuenta Debe: "
                    loading={fetching}
                    className="w-full"
                    top
                    isOptionDisabled={(option) => (option as any).nivel <= 3}
                  />

                  {tipoOperacionSelected.value === "compra" && (
                    <Select
                      values={cuentas}
                      selected={cuentaDebe2}
                      setSelected={setCuentaDebe2}
                      label="Selecciona una Cuenta Debe (2): "
                      loading={fetching}
                      className="w-full"
                      top
                      isOptionDisabled={(option) => (option as any).nivel <= 3}
                    />
                  )}

                  <Select
                    values={cuentas}
                    selected={cuentaHaber}
                    setSelected={setCuentaHaber}
                    label="Selecciona una Cuenta Haber: "
                    loading={fetching}
                    className="w-full"
                    top
                    isOptionDisabled={(option) => (option as any).nivel <= 3}
                  />

                  {tipoOperacionSelected.value === "venta" && (
                    <Select
                      values={cuentas}
                      selected={cuentaHaber2}
                      setSelected={setCuentaHaber2}
                      label="Selecciona una Cuenta Haber (2): "
                      loading={fetching}
                      className="w-full"
                      top
                      isOptionDisabled={(option) => (option as any).nivel <= 3}
                    />
                  )}

                  <CheckBox
                    label={"Eliminar de los registros: "}
                    checked={deleted}
                    onChange={(e) => setDeleted(e.target.checked)}
                  />
                  <p className="text-sm text-gray-400 italic">
                    Al marcar esta casilla, el/los documentos serán eliminados
                    totalmente del sistema y no se tomarán en cuenta en ningún
                    reporte o libro contable.
                  </p>
                  <p className="text-sm text-red-500 italic">
                    Esta acción es irreversible y afectará el cálculo de los
                    reportes financieros y libros contables.
                  </p>

                  <Button onClick={handleConfirm}>
                    Actualizar Información
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Modal de confirmación */}
          <Modal
            isOpen={confirmModal}
            setIsOpen={setConfirmModal}
            title="Actualizar Documentos"
          >
            <div className="flex flex-col justify-center items-center py-4">
              <p className="text-center mb-2">
                ¿Está seguro de realizar esta acción?
              </p>
              <RowModal>
                <TitleModal text={"Documentos de:"} />
                <ValueModal text={empresaNombre} />
              </RowModal>
              <RowModal>
                <TitleModal text={"Fecha a actualizar:"} />
                <ValueModal
                  text={moment(
                    new Date(date).toISOString().split("T")[0]
                  )
                    .locale("es")
                    .format("MMMM YYYY")}
                />
              </RowModal>
              {cuentaDebe.value && (
                <RowModal>
                  <TitleModal text={"Cuenta Debe:"} />
                  <ValueModal text={cuentaDebe.label} />
                </RowModal>
              )}
              {cuentaHaber.value && (
                <RowModal>
                  <TitleModal text={"Cuenta Haber:"} />
                  <ValueModal text={cuentaHaber.label} />
                </RowModal>
              )}
            </div>
            <div className="flex border-t pt-4 gap-2 justify-end">
              <Button onClick={() => setConfirmModal(false)} variant="error">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                variant="success"
                loading={submiting}
              >
                Actualizar Documentos
              </Button>
            </div>
          </Modal>
        </>
      )}
    </>
  );
};

// ======================
// Card de factura
// ======================
const Factura: React.FC<{
  provided: DraggableProvided;
  factura: IFactura;
  cuentas: SelectOption[];
}> = ({ provided, factura, cuentas }) => {
  const descuentos =
    toNumber(factura.petroleo) +
    toNumber(factura.turismo_hospedaje) +
    toNumber(factura.turismo_pasajes) +
    toNumber(factura.timbre_prensa) +
    toNumber(factura.bomberos) +
    toNumber(factura.tasa_municipal) +
    toNumber(factura.bebidas_alcoholicas) +
    toNumber(factura.tabaco) +
    toNumber(factura.cemento) +
    toNumber(factura.bebidas_no_alcoholicas) +
    toNumber(factura.tarifa_portuaria);

  const nombreEmisor = (factura.nombre_emisor as any) || "";

  const cuentaDebeLabel = getCuentaLabelFromOptions(
    cuentas,
    (factura as any).cuenta_debe
  );
  const cuentaHaberLabel = getCuentaLabelFromOptions(
    cuentas,
    (factura as any).cuenta_haber
  );

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{ ...provided.draggableProps.style }}
      className="p-4 mb-4 border border-solid border-gray-300 cursor-pointer bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
    >
      {factura.fecha_anulacion && (
        <div className="text-center mb-2 text-red-500">
          {`Doc Anulado el ${moment(factura.fecha_anulacion)
            .locale("es")
            .format("DD/MM/YYYY")}`}
        </div>
      )}

      <div className="flex flex-col mb-2">
        <div className="text-sm text-gray-500">
          Fecha de emisión:
          <span className="font-medium">
            {` ${moment(factura.fecha_emision)
              .locale("es")
              .format("DD/MM/YYYY")}`}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          Serie:
          <span className="font-medium">{` ${factura.serie}`}</span>
        </div>
        <div className="text-sm text-gray-500">
          Número de DTE:
          <span className="font-medium">{` ${factura.numero_dte}`}</span>
        </div>
      </div>

      <div className="text-lg font-semibold text-gray-700">
        {nombreEmisor.length > 28
          ? `${nombreEmisor.slice(0, 28)}...`
          : nombreEmisor}
        <span className="text-sm text-gray-500">
          ({(factura as any).nit_emisor})
        </span>
      </div>

      <div className="mt-2 flex flex-col">
        <div>
          <span className="text-sm text-gray-600">Tipo: </span>
          <span className="font-medium text-gray-700 capitalize">
            {factura.tipo}
          </span>
        </div>
        <div>
          <span className="text-sm text-gray-600">Cuenta Debe: </span>
          <span className="font-medium text-gray-700">
            {cuentaDebeLabel || "—"}
          </span>
        </div>
        <div>
          <span className="text-sm text-gray-600">Cuenta Haber: </span>
          <span className="font-medium text-gray-700">
            {cuentaHaberLabel || "—"}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm text-gray-500">
          <span className="text-gray-600">Monto Total: </span>
          <span className="font-semibold text-green-600">
            Q{toNumber(factura.monto_total).toFixed(2)}
          </span>
        </div>

        <div className="text-sm text-gray-500">
          <span className="text-gray-600">IVA: </span>
          <span className="font-semibold text-blue-600">
            Q{toNumber(factura.iva).toFixed(2)}
          </span>
        </div>

        <div className="text-sm text-gray-500">
          <span className="text-gray-600">Descuentos: </span>
          <span className="font-semibold text-red-500">
            Q{descuentos.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Rectificacion;
