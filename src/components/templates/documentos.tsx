// src/components/templates/documentos.tsx
"use client";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/atoms/Button";
import { CalendarMonth } from "@/components/atoms/inputs/CalendarMonth";
import { Select } from "@/components/atoms/inputs/Select";
import { Table } from "@/components/molecules/table";
import { PlusIcon } from "@/components/atoms/icons/PlusIcon";
import { EditIcon } from "@/components/atoms/icons/EditIcon";
import { UploadIconl } from "@/components/atoms/icons/UploadIconl";

import type { TableColumn } from "react-data-table-component";

import type { IFactura, OptionType } from "@/utils";
import { downloadDocs, omitColumn, parseDate, tiposDocumento } from "@/utils";
import { obtenerDocumentos } from "@/utils/services";

import moment from "moment";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

type DocumentosProps = {
  empresa_id: number;
  usuario: string;
};

export const Documentos: React.FC<DocumentosProps> = ({
  empresa_id,
  usuario,
}) => {
  const router = useRouter();

  const [documentos, setDocumentos] = useState<IFactura[]>([]);
  const [loading, setLoading] = useState(false);

  const tiposOperacion = [
    { value: "compra", label: "Compra" },
    { value: "venta", label: "Venta" },
  ];

  const [tipoOperacionSelected, setTipoOperacionSelected] =
    useState<OptionType>({ value: "", label: "Selecciona", error: "" });

  // ❤️ Dejamos Date NORMAL, sin tocar CalendarMonth
  const [date, setDate] = useState<Date>(new Date());

  const basePath = `/dashboard/contador/${usuario}/empresas/${empresa_id}/documentos`;

  // 🔥 FIX REAL: USAR moment(date).format("YYYY-MM") para evitar UTC
  useEffect(() => {
    const fetchDocumentos = async () => {
      if (!empresa_id) return;

      let tipo: string | null = null;
      if (tipoOperacionSelected.value !== "") {
        tipo = String(tipoOperacionSelected.value);
      }

      setLoading(true);

      // 💥 FIX 1: NO UTC — fecha correcta en Guatemala
      const fecha = moment(date).format("YYYY-MM");

      try {
        const resp: any = await obtenerDocumentos(empresa_id, fecha, tipo);

        let docs: IFactura[] = [];

        if (Array.isArray(resp)) {
          docs = resp;
        } else if (resp?.status === 200) {
          docs = resp.data ?? [];
        } else {
          toast.error(resp?.message || "Error obteniendo documentos");
          setDocumentos([]);
          return;
        }

        setDocumentos(docs);
      } catch (error: any) {
        console.error(error);
        toast.error(error?.message || "Error al obtener documentos");
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentos();
  }, [empresa_id, date, tipoOperacionSelected.value]);

  const conditionalRowStyles = [
    {
      when: (row: any) => row.fecha_anulacion,
      style: { backgroundColor: "#f7d2da" },
    },
    {
      when: (row: any) => row.iva == 0,
      style: { backgroundColor: "#ccc" },
    },
    {
      when: (row: IFactura) => row.tipo_dte != "FACT",
      style: { backgroundColor: "#f5f1a4" },
    },
  ];

  const columns: TableColumn<IFactura>[] = [
    {
      name: "Fecha de Emisión",
      selector: (row) => parseDate(row.fecha_emision),
      sortable: true,
      minWidth: "150px",
    },
    {
      name: "Tipo DTE",
      selector: (row) => row.tipo_dte,
      sortable: true,
    },
    {
      name: "Serie",
      selector: (row) => row.serie,
      minWidth: "150px",
    },
    {
      name: "Número de Autorización",
      selector: (row) => row.numero_autorizacion,
    },
    {
      name: "Número DTE",
      selector: (row) => row.numero_dte,
    },
    {
      name: "NIT Emisor",
      selector: (row) => row.nit_emisor,
      minWidth: "150px",
    },
    {
      name: "Nombre Emisor",
      selector: (row) => row.nombre_emisor,
      minWidth: "300px",
    },
    {
      name: "Nombre Establecimiento",
      selector: (row) => row.nombre_establecimiento,
      sortable: true,
      minWidth: "300px",
    },
    {
      name: "ID Receptor",
      selector: (row) => row.id_receptor,
      minWidth: "150px",
    },
    {
      name: "Nombre Receptor",
      selector: (row) => row.nombre_receptor,
      minWidth: "300px",
    },
    {
      name: "Moneda",
      selector: (row) => row.moneda,
      minWidth: "120px",
    },
    {
      name: "Monto Bien",
      selector: (row) => row.monto_bien,
      minWidth: "120px",
    },
    {
      name: "Monto Servicio",
      selector: (row) => row.monto_servicio,
      minWidth: "120px",
    },
    {
      name: "IVA",
      selector: (row) => row.iva.toString(),
      minWidth: "120px",
    },
    {
      name: "Petroleo",
      selector: (row) => row.petroleo.toString(),
      minWidth: "120px",
      omit: omitColumn(documentos, "petroleo"),
    },
    {
      name: "Turismo Hospedaje",
      selector: (row) => row.turismo_hospedaje.toString(),
      minWidth: "120px",
      omit: omitColumn(documentos, "turismo_hospedaje"),
    },
    {
      name: "Turismo Pasajes",
      selector: (row) => row.turismo_pasajes.toString(),
      minWidth: "120px",
      omit: omitColumn(documentos, "turismo_pasajes"),
    },
    {
      name: "Timbre Prensa",
      selector: (row) => row.timbre_prensa.toString(),
      minWidth: "120px",
      omit: omitColumn(documentos, "timbre_prensa"),
    },
    {
      name: "Bomberos",
      selector: (row) => row.bomberos.toString(),
      minWidth: "120px",
      omit: omitColumn(documentos, "bomberos"),
    },
    {
      name: "Tasa Municipal",
      selector: (row) => row.tasa_municipal.toString(),
      minWidth: "120px",
      omit: omitColumn(documentos, "tasa_municipal"),
    },
    {
      name: "Bebidas Alcohólicas",
      selector: (row) => row.bebidas_alcoholicas.toString(),
      minWidth: "120px",
      omit: omitColumn(documentos, "bebidas_alcoholicas"),
    },
    {
      name: "Tabaco",
      selector: (row) => row.tabaco.toString(),
      minWidth: "120px",
      omit: omitColumn(documentos, "tabaco"),
    },
    {
      name: "Cemento",
      selector: (row) => row.cemento.toString(),
      minWidth: "120px",
      omit: omitColumn(documentos, "cemento"),
    },
    {
      name: "Bebidas No Alcohólicas",
      selector: (row) => row.bebidas_no_alcoholicas.toString(),
      minWidth: "120px",
      omit: omitColumn(documentos, "bebidas_no_alcoholicas"),
    },
    {
      name: "Tarifa Portuaria",
      selector: (row) => row.tarifa_portuaria.toString(),
      minWidth: "120px",
      omit: omitColumn(documentos, "tarifa_portuaria"),
    },
    {
      name: "Monto Total",
      selector: (row) => row.monto_total.toString(),
      minWidth: "120px",
    },
    {
      name: "Estado",
      selector: (row) => row.factura_estado.toString(),
      minWidth: "120px",
    },
    {
      name: "Tipo de Operación",
      selector: (row) =>
        ((row as any).tipo_operacion_nombre ||
          row.tipo_operacion ||
          "") as string,
      style: { textTransform: "capitalize" },
    },
    {
      name: "Tipo",
      selector: (row) =>
        tiposDocumento.find((tipo) => tipo.value == row.tipo)?.label ?? "",
    },
    {
      name: "Cuenta Debe",
      selector: (row) => {
        const anyRow = row as any;
        return (
          anyRow.cuenta_debe_nombre ||
          anyRow.cuentaDebe?.descripcion ||
          String(row.cuenta_debe ?? "")
        );
      },
      style: { textTransform: "capitalize" },
      minWidth: "250px",
    },
    {
      name: "Cuenta Haber",
      selector: (row) => {
        const anyRow = row as any;
        return (
          anyRow.cuenta_haber_nombre ||
          anyRow.cuentaHaber?.descripcion ||
          String(row.cuenta_haber ?? "")
        );
      },
      style: { textTransform: "capitalize" },
      minWidth: "250px",
    },
    {
      name: "Marca Anulado",
      selector: (row) => row.marca_anulado.toString(),
    },
    {
      name: "Fecha de Anulación",
      selector: (row) =>
        row.fecha_anulacion ? parseDate(row.fecha_anulacion) : "N/A",
      omit: omitColumn(documentos, "fecha_anulacion"),
      minWidth: "150px",
      sortable: true,
    },
  ];

  const handleClickDoc = (doc: IFactura) => {
    if (!doc.uuid) {
      toast.error("Error al obtener el documento");
      return;
    }
    router.push(`${basePath}/${doc.uuid}`);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Filtros */}
      <div className="flex justify-start items-center gap-10">
        <Select
          values={tiposOperacion}
          selected={tipoOperacionSelected}
          setSelected={setTipoOperacionSelected}
          className="!w-[480px]"
          label="Selecciona el tipo de Operación de los documentos: "
        />

        {/* ❤️ FIX 2: CalendarMonth sigue funcionando con Date */}
        <CalendarMonth
          label="Selecciona la fecha: "
          date={date}
          setDate={setDate}
        />
      </div>

      {/* Botones */}
      <div className="flex justify-end items-end gap-10">
        <div className="flex gap-2">
          <Button
            icon
            onClick={() => downloadDocs(documentos)}
            disabled={documentos.length === 0}
            loading={loading}
          >
            <UploadIconl className="rotate-180" />
            Descargar Facturas
          </Button>
          <Button icon onClick={() => router.push(`${basePath}/carga`)}>
            <UploadIconl />
            Cargar Facturas
          </Button>
          <Button icon onClick={() => router.push(`${basePath}/create`)}>
            <PlusIcon />
            Agregar Factura
          </Button>
          <Button icon onClick={() => router.push(`${basePath}/rectificaciones`)}>
            <EditIcon />
            Rectificación de Facturas
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <Table
        columns={columns}
        rows={documentos}
        pending={loading}
        conditionalRowStyles={conditionalRowStyles}
        pagination
        onRowClicked={handleClickDoc}
      />
    </div>
  );
};
