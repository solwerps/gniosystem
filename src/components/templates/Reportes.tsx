"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import type { OptionType } from "@/utils";
import { Button, CalendarMonth, Select, Text } from "@/components/atoms";
import { IVAMensual, ISRMensual } from "@/components/organisms/reportes";

type ReportesProps = {
  empresa_id: number;
  usuario: string;
};

type EntornoData = {
  features?: {
    reportes?: { href: string; caps?: Record<string, boolean> } | null;
  };
  raw?: {
    nombreIva?: string;
    nombreIsr?: string;
  };
};

const normalize = (value: string) =>
  (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

export const Reportes: React.FC<ReportesProps> = ({ empresa_id, usuario }) => {
  const [date, setDate] = useState<Date>(new Date());

  const [reporteSelected, setReporteSelected] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });

  const [entornoLoading, setEntornoLoading] = useState(true);
  const [entorno, setEntorno] = useState<EntornoData | null>(null);

  const [reporte, setReporte] = useState<React.ReactNode>(
    <EmptyReport message="Selecciona un reporte" />
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setEntornoLoading(true);
        const res = await fetch(
          `/api/empresas/${empresa_id}/entorno?tenant=${usuario}`,
          { cache: "no-store" }
        );
        const payload = await res.json();
        if (!alive) return;
        setEntorno(payload?.data ?? null);
      } catch (error) {
        if (!alive) return;
        setEntorno(null);
      } finally {
        if (alive) setEntornoLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [empresa_id, usuario]);

  const reportes = useMemo(() => {
    const options: { value: number; label: string }[] = [];
    const hasReportes = !!entorno?.features?.reportes;
    const nombreIva = normalize(entorno?.raw?.nombreIva ?? "");
    const nombreIsr = normalize(entorno?.raw?.nombreIsr ?? "");

    const ivaPermitido = hasReportes
      ? ["primario", "pecuario", "iva general"].some((tipo) =>
          nombreIva.includes(tipo)
        )
      : false;

    const isrPermitido = hasReportes ? nombreIsr.includes("isr") : false;

    if (ivaPermitido) {
      const rawIva = (entorno?.raw?.nombreIva ?? "").trim();
      const ivaLabel = rawIva
        ? nombreIva.includes("iva")
          ? rawIva
          : `IVA ${rawIva}`
        : "IVA General Mensual";
      options.push({ value: 1, label: ivaLabel });
    }
    if (isrPermitido) {
      const rawIsr = (entorno?.raw?.nombreIsr ?? "").trim();
      const isrLabel = rawIsr
        ? nombreIsr.includes("isr")
          ? rawIsr
          : `ISR ${rawIsr}`
        : "ISR General Mensual";
      options.push({ value: 2, label: isrLabel });
    }

    return options;
  }, [entorno]);

  useEffect(() => {
    if (reportes.length === 0) {
      setReporte(<EmptyReport message="No hay reportes habilitados" />);
      return;
    }
    if (!reporteSelected.value) {
      setReporte(<EmptyReport message="Selecciona un reporte" />);
    }
  }, [reportes.length, reporteSelected.value]);

  const handleClick = async () => {
    if (!date) {
      toast.error("Por favor selecciona una fecha valida");
      return;
    }
    if (!empresa_id) {
      toast.error("No se encontro la empresa activa");
      return;
    }
    if (!reporteSelected.value) {
      toast.error("Por favor selecciona el reporte a generar");
      return;
    }

    const componente = renderizarComponente(
      date.toISOString().slice(0, 7),
      empresa_id,
      Number(reporteSelected.value)
    );
    setReporte(componente);
  };

  const clearReporte = () => {
    setReporte(<EmptyReport message="Selecciona un reporte" />);
    setReporteSelected({
      value: "",
      label: "Selecciona",
      error: "",
    });
  };

  const renderizarComponente = (fecha: string, empresa: number, reporteId: number) => {
    switch (reporteId) {
      case 1:
        return (
          <IVAMensual date={fecha} empresa={empresa} clearFunction={clearReporte} />
        );
      case 2:
        return <ISRMensual date={fecha} empresa={empresa} />;
      default:
        return <EmptyReport message="Selecciona un reporte" />;
    }
  };

  return (
    <div className="flex- flex-col">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 bg-white p-4 rounded-lg">
        <CalendarMonth
          label="Selecciona la fecha: "
          date={date}
          setDate={setDate}
        />
        <Select
          values={reportes}
          selected={reporteSelected}
          setSelected={setReporteSelected}
          label="Selecciona el Reporte: "
          loading={entornoLoading}
        />

        <div className="mx-auto md:col-span-2">
          <Button className="w-40" onClick={handleClick} loading={entornoLoading}>
            Aceptar
          </Button>
        </div>
      </div>
      <div className="mt-4">{reporte}</div>
    </div>
  );
};

const EmptyReport = ({ message }: { message: string }) => {
  return (
    <div className="bg-white w-full flex justify-center items-center h-80 rounded-md">
      <Text variant="subtitle" italic>
        {message}
      </Text>
    </div>
  );
};
