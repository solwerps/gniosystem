// src/components/templates/RetencionesISR.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/atoms/Button";
import { CalendarMonth } from "@/components/atoms/inputs/CalendarMonth";
import { Table } from "@/components/molecules/table";
import { UploadIconl } from "@/components/atoms/icons/UploadIconl";
import type { TableColumn } from 'react-data-table-component';
import type { IRetencionISR} from '@/utils';
import { obtenerRetencionesISR } from '@/utils/services/retenciones';

interface RetencionesISRProps {
  empresaId: number;        // 👈 Viene del contexto (/empresas/[id])
  empresaNombre: string;    // Para mostrar en la UI
  cargarHref: string;       // Ruta para ir a la pantalla de carga masiva
}

export const RetencionesISR: React.FC<RetencionesISRProps> = ({
  empresaId,
  empresaNombre,
  cargarHref,
}) => {
  const router = useRouter();

  // Retenciones
  const [retenciones, setRetenciones] = useState<IRetencionISR[]>([]);

  // Fecha (mes/año de trabajo)
  const [date, setDate] = useState<Date>(new Date());

  // Loader
  const [loading, setLoading] = useState<boolean>(true);

  // ============================
  // Cargar datos cuando cambie fecha
  // ============================
  useEffect(() => {
    const getData = async () => {
      if (!empresaId) return;

      setLoading(true);
      const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
const fecha = `${year}-${month}`;

      try {
        const { status, data, message } = await obtenerRetencionesISR(
          empresaId,
          fecha
        );
        if (status === 200) {
          setRetenciones(data);
        } else {
          throw new Error(message);
        }
      } catch (error) {
        console.error('Error al obtener retenciones ISR:', error);
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [empresaId, date]);

  return (
    <div className="flex flex-col gap-5">
      {/* Encabezado: Empresa fija + fecha */}
      <div className="flex justify-start items-center gap-10">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-600">
            Empresa:
          </span>
          <span className="text-base font-bold text-blue-700">
            {empresaNombre} (ID: {empresaId})
          </span>
        </div>
        <CalendarMonth
          label="Selecciona la fecha: "
          date={date}
          setDate={setDate}
        />
      </div>

      {/* Botón para ir a la carga masiva */}
      <div className="flex justify-end items-end gap-10">
        <div className="flex gap-2">
          <Button
            icon
            onClick={() => router.push(cargarHref)}
          >
            <UploadIconl />
            Cargar Retenciones
          </Button>
        </div>
      </div>

      {/* Tabla de retenciones ISR */}
      <Table
        columns={columns}
        rows={retenciones}
        pending={loading}
      />
    </div>
  );
};

// ============================
// Columnas de la tabla
// ============================
const columns: TableColumn<IRetencionISR>[] = [
  {
    name: 'Fecha de Trabajo',
    selector: (row) => row.fecha_trabajo,
  },
  {
    name: 'NIT Retenedor',
    selector: (row) => row.nit_retenedor,
  },
  {
    name: 'Nombre Retenedor',
    selector: (row) => row.nombre_retenedor,
  },
  {
    name: 'Estado Constancia',
    selector: (row) => row.estado_constancia,
  },
  {
    name: 'Constancia',
    selector: (row) => row.constancia,
  },
  {
    name: 'Fecha de Emisión',
    selector: (row) => row.fecha_emision,
  },
  {
    name: 'Total Factura',
    selector: (row) =>
      row.total_factura != null
        ? Number(row.total_factura).toFixed(2)
        : '',
  },
  {
    name: 'Renta Imponible',
    selector: (row) =>
      row.renta_imponible != null
        ? Number(row.renta_imponible).toFixed(2)
        : '',
  },
  {
    name: 'Total Retención',
    selector: (row) =>
      row.total_retencion != null
        ? Number(row.total_retencion).toFixed(2)
        : '',
  },
];
