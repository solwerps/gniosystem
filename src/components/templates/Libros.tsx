// src/components/templates/Libros.tsx
"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import type { OptionType } from "@/utils";
import { obtenerFolioByLibro, updateContadorFolios } from "@/utils";

import { Button } from "@/components/atoms/Button";
import { CalendarMonth } from "@/components/atoms/inputs/CalendarMonth";
import { CalendarRange } from "@/components/atoms/inputs/CalendarRange";
import { Modal } from "@/components/molecules/modal/Modal";
import { Select } from "@/components/atoms";
import { PDFIcon } from "@/components/atoms/icons/PDFIcon";
import { TitleModal } from "@/components/molecules/modal/TitleModal";
import { ValueModal } from "@/components/molecules/modal/ValueModal";

type LibrosProps = {
  empresa_id: number;
  usuario: string;
};

export const Libros: React.FC<LibrosProps> = ({ empresa_id }) => {
  // Fecha
  const [date, setDate] = useState<Date>(new Date());
  const [dates, setDates] = useState<Date[]>([]);

  // Folios
  const [folio, setFolio] = useState(0);
  const [foliosUsed, setFoliosUsed] = useState(0);
  const [folioInfo, setFolioInfo] = useState({
    libro_nombre: "",
    contador_folios: 0,
    folios_disponibles: 0,
    folio_id: 0,
  });
  const [folioListener, setFolioListener] = useState(false);

  // Reportes / Libros
  const libros = [
    {
      value: 1,
      label: "Libro de Compras",
      fecha: true,
      sort: true,
      detail: true,
      dateRange: false,
      folioNumber: true,
    },
    {
      value: 2,
      label: "Libro de Ventas",
      fecha: true,
      sort: true,
      detail: true,
      dateRange: false,
      folioNumber: true,
    },
    {
      value: 3,
      label: "Libro Diario",
      fecha: true,
      sort: true,
      detail: false,
      dateRange: false,
      folioNumber: true,
    },
    {
      value: 12,
      label: "Libro Diario (detalle)",
      fecha: true,
      sort: false,
      detail: false,
      dateRange: false,
      folioNumber: true,
    },
    {
      value: 4,
      label: "Libro Mayor",
      fecha: true,
      sort: false,
      detail: false,
      dateRange: false,
      folioNumber: true,
    },
    {
      value: 5,
      label: "Balance General y Estado de Resultados",
      fecha: false,
      sort: false,
      detail: false,
      dateRange: true,
      folioNumber: true,
    },
  ];

  const [libroSelected, setLibroSelected] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });

  // Id numérico del libro seleccionado
  const libroId = Number(libroSelected.value) || 0;
  const libroConfig = libros.find((libro) => libro.value === libroId);

  // Ascendente/Descendente
  const ordenOptions = [
    { value: "ascendente", label: "Ascendente" },
    { value: "descendente", label: "Descendente" },
  ];

  const [ordenSelected, setOrdenSelected] = useState<OptionType>({
    value: "ascendente",
    label: "Ascendente",
    error: "",
  });

  // Mostrar detalles o no
  const detallesOptions = [
    { value: "true", label: "Mostrar Detalles" },
    { value: "false", label: "No Mostrar Detalles" },
  ];

  const [detallesSelected, setDetallesSelected] = useState<OptionType>({
    value: "true",
    label: "Mostrar Detalles",
    error: "",
  });

  // Loader
  const [loading, setLoading] = useState(false);

  // Obtener folio cuando cambian libro y empresa
  useEffect(() => {
    if (libroId && empresa_id) {
      getFolioByLibroHandler();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libroId, empresa_id]);

  // Listener para cambios en localStorage (foliosUsed)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "foliosUsed" && event.newValue) {
        try {
          const updatedFolios = JSON.parse(event.newValue);
          setFoliosUsed(updatedFolios.foliosUsed ?? 0);
          setFolioListener(true);
        } catch (error) {
          console.log("Error al parsear foliosUsed desde localStorage", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const getFolioByLibroHandler = async () => {
    try {
      setLoading(true);
      const { status, data, message } = await obtenerFolioByLibro(
        libroId,
        empresa_id
      );

      if (status === 200) {
        setFolio(data.contador_folios + 1);
        setFolioInfo({
          libro_nombre: data.nombre_libro,
          contador_folios: data.contador_folios,
          folios_disponibles: data.folios_disponibles,
          folio_id: data.folio_id,
        });
      } else {
        throw new Error(message);
      }
    } catch (error) {
      console.log({ error });
      toast.error("Error al obtener el folio del libro");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContadorFolios = async () => {
    try {
      setLoading(true);
      const { status, message } = await updateContadorFolios(
        folioInfo.folio_id,
        foliosUsed
      );
      if (status === 200) {
        toast.success("Conteo de folios actualizado correctamente");
      } else {
        toast.error(message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Error al actualizar el conteo de los folios");
    } finally {
      setFolioListener(false);
      setLoading(false);
      getFolioByLibroHandler();
    }
  };

  const handleClick = async () => {
    if (!date) {
      toast.error("Por favor selecciona una fecha válida");
      return;
    }
    if (!empresa_id) {
      toast.error("No se encontró la empresa activa");
      return;
    }
    if (!libroId) {
      toast.error("Por favor selecciona el libro a generar");
      return;
    }

    const reportes: Record<number, string> = {
      1: "compras",
      2: "ventas",
      3: "diario",
      12: "diario-detalle",
      4: "mayor",
      5: "balance",
    };

    const reporteNombre = reportes[libroId] ?? "ventas";
    const empresaFormated = String(empresa_id);

    // Enviamos fecha como YYYY-MM-DD (string), que es lo que consume bien el PDF y la API
    const dateFormated = date.toISOString().slice(0, 10);

    const baseUrl = `${process.env.NEXT_PUBLIC_CLIENT_URL}/pdf/libros`;

    const queryParams: Record<string, string> = {
      empresa: empresaFormated,
    };

    if (libroConfig?.fecha) {
      queryParams.date = dateFormated;
    }
    if (libroConfig?.sort) {
      queryParams.orden = String(ordenSelected.value);
    }
    if (libroConfig?.detail) {
      queryParams.detalle = String(detallesSelected.value);
    }
    if (libroConfig?.folioNumber) {
      queryParams.folio = String(folio);
    }
    
    if (libroConfig?.dateRange && dates.length >= 2) {
      const date1 = dates[0].toISOString().slice(0, 10);
      const date2 = dates[1].toISOString().slice(0, 10);
      queryParams.date1 = date1;
      queryParams.date2 = date2;
    } else if (libroConfig?.dateRange && dates.length === 1) {
      const singleDate = dates[0].toISOString().slice(0, 10);
      queryParams.date1 = singleDate;
      queryParams.date2 = singleDate;
    }

    const queryString = new URLSearchParams(queryParams).toString();
    const url = `${baseUrl}/${reporteNombre}?${queryString}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <div className="flex- flex-col">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 bg-white p-4 rounded-lg">
          <Select
            values={libros}
            selected={libroSelected}
            setSelected={setLibroSelected}
            label="Selecciona el Libro: "
            className="md:col-span-2"
          />

          {libroId && libroConfig?.fecha && (
            <CalendarMonth
              label="Selecciona la fecha: "
              date={date}
              setDate={setDate}
            />
          )}

          {libroId && libroConfig?.sort && (
            <Select
              values={ordenOptions}
              selected={ordenSelected}
              setSelected={setOrdenSelected}
              label="Ordenar Por: "
            />
          )}

          {libroId && libroConfig?.detail && (
            <Select
              values={detallesOptions}
              selected={detallesSelected}
              setSelected={setDetallesSelected}
              label="Mostrar Detalles: "
            />
          )}

          {libroId && libroConfig?.dateRange && (
            <div>
              <CalendarRange
                label="Selecciona un rango de fecha (opcional): "
                dates={dates}
                setDates={setDates}
              />
              <p className="text-sm text-gray-400 italic">
                Déjalo en blanco para ver el resultado histórico
              </p>
            </div>
          )}

          <div className="mx-auto md:col-span-2">
            <Button
              className="w-40"
              onClick={handleClick}
              icon
              loading={loading}
            >
              <PDFIcon />
              Generar PDF
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={folioListener}
        setIsOpen={setFolioListener}
        title="Actualización del Conteo de Folios"
      >
        <div className="flex flex-col justify-center py-4">
          <p className="text-blue-600 font-bold capitalize text-lg mb-2 text-center">
            {folioInfo.libro_nombre}
          </p>
          <p className="mb-2">
            Se ha detectado un cambio en los folios utilizados para este libro
            contable. Si desea actualizar el conteo, los datos se modificarán de
            la siguiente manera:
          </p>
          <div className="my-2">
            <div className="flex justify-between mb-2">
              <TitleModal text="Folios Disponibles después de la actualización:" />
              <div className="flex-grow border-dotted border-b-4 border-gray-400 mx-2" />
              <ValueModal
                text={
                  folioInfo.folios_disponibles - foliosUsed <= 0
                    ? 0
                    : folioInfo.folios_disponibles - foliosUsed
                }
              />
            </div>
            <div className="flex justify-between mb-2">
              <TitleModal text="Conteo de Folios después de la actualización:" />
              <div className="flex-grow border-dotted border-b-4 border-gray-400 mx-2" />
              <ValueModal text={folioInfo.contador_folios + foliosUsed} />
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Al confirmar, el nuevo conteo de folios será guardado y los cambios
            se aplicarán en el sistema de manera inmediata.
          </p>
          <p className="text-sm text-basics-error font-semibold mt-1">
            Ten en cuenta que esta acción no se puede deshacer.
          </p>
        </div>

        <div className="flex border-t pt-4 gap-2 justify-end">
          <Button onClick={() => setFolioListener(false)} variant="error">
            Cancelar
          </Button>
          <Button
            onClick={handleUpdateContadorFolios}
            variant="success"
            loading={loading}
          >
            Guardar Cambios
          </Button>
        </div>
      </Modal>
    </>
  );
};
