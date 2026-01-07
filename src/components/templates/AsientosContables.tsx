// src/components/templates/AsientosContables.tsx
"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";

import type { SelectOption, OptionType, IGetAsientoContable, IPartida } from "@/utils";
import { obtenerAsientosContables, obtenerPolizas, parseDate, parseMonto } from "@/utils";

import { Button, CalendarRange, FilterIcon, Input, Select, Text } from "@/components/atoms";

type Props = {
  empresaId: number;      // GNIO: empresa fija por ruta
  tenant?: string;        // opcional; si no viene, se resuelve desde URL
};

function resolveTenantFallback(explicitTenant?: string) {
  if (explicitTenant && explicitTenant.trim()) return explicitTenant.trim();

  if (typeof window === "undefined") return "";
  const qs = new URLSearchParams(window.location.search);
  const qTenant = qs.get("tenant");
  if (qTenant && qTenant.trim()) return qTenant.trim();

  // fallback: /dashboard/contador/[usuario]/...
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("contador");
  if (idx >= 0 && parts[idx + 1]) return String(parts[idx + 1]);

  return "";
}

export const AsientosContables = ({ empresaId, tenant: tenantProp }: Props) => {
  // Loaders
  const [fetching, setFetching] = useState(true);
  const [searching, setSearching] = useState(false);
  const [buscado, setBuscado] = useState(false);

  // GNIO
  const [tenant, setTenant] = useState("");

  // Fecha
  const [dates, setDates] = useState<Date[]>([]);
  // Poliza
  const [polizas, setPolizas] = useState<SelectOption[]>([]);
  const [polizaSelected, setPolizaSelected] = useState<OptionType>({
    value: "",
    label: "Selecciona",
    error: "",
  });
  // Correlativo
  const [correlativo, setCorrelativo] = useState("");

  // Resultados
  const [asientosContables, setAsientosContables] = useState<IGetAsientoContable[]>([]);

  // 1) Resolver tenant
  useEffect(() => {
    const t = resolveTenantFallback(tenantProp);
    setTenant(t);
    if (!t) toast.error("TENANT_REQUIRED: falta ?tenant=... o no se pudo resolver desde la ruta.");
  }, [tenantProp]);

  // 2) Cargar pólizas (GNIO: requiere tenant)
  useEffect(() => {
    const getPolizas = async () => {
      if (!tenant) return;
      try {
        setFetching(true);
        // GNIO: obtenerPolizas(tenant, select)
        const { status, message, data } = await obtenerPolizas(tenant, true);
        if (status === 200) {
          setPolizas((data ?? []) as SelectOption[]);
        } else {
          throw new Error(message || "Error al obtener pólizas");
        }
      } catch (error) {
        toast.error("Error al obtener pólizas.");
        console.log({ error });
      } finally {
        setFetching(false);
      }
    };
    getPolizas();
  }, [tenant]);

  const fetchAsientosContables = async () => {
    if (!tenant) {
      toast.error("TENANT_REQUIRED");
      return;
    }
    if (!empresaId || Number.isNaN(empresaId)) {
      toast.error("EMPRESA_CONTEXT_REQUIRED");
      return;
    }

    try {
      setSearching(true);

      const { status, message, data } = await obtenerAsientosContables(
        tenant,
        empresaId,
        dates,
        Number(polizaSelected.value || 0),
        correlativo
      );

      if (status === 200) {
        setAsientosContables((data ?? []) as IGetAsientoContable[]);
      } else {
        throw new Error(message || "Error al obtener asientos");
      }
    } catch (error) {
      toast.error("Error al obtener datos.");
      console.log({ error });
    } finally {
      setSearching(false);
      setBuscado(true);
    }
  };

  const EmptyReport = () => {
    return (
      <div className="bg-white w-full flex justify-center items-center h-80 rounded-md">
        <Text variant="subtitle" italic>
          {buscado
            ? "No se encontraron asientos contables con esas características"
            : "Busca un Asiento Contable"}
        </Text>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 bg-white p-4 rounded-lg items-center">
        {/* GNIO: empresa fija por ruta, se elimina Select de empresa */}

        <CalendarRange
          label="Selecciona un rango de fecha: "
          dates={dates}
          setDates={setDates}
        />

        <Select
          values={polizas}
          selected={polizaSelected}
          setSelected={setPolizaSelected}
          label="Selecciona la Poliza: "
          loading={fetching}
        />

        <Input
          label="Correlativo Asiento Contable"
          placeholder="Ingresa el Correlativo del Asiento Contable"
          name="correlativo_asiento"
          value={correlativo}
          onChange={(e) => setCorrelativo(e.target.value)}
        />

        <div className="md:col-span-2 w-full flex justify-end">
          <Button
            onClick={fetchAsientosContables}
            disabled={fetching || !tenant}
            loading={searching}
            icon
            variant="secondary"
          >
            <FilterIcon />
            Aplicar filtros
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {asientosContables.length === 0 ? <EmptyReport /> : renderAsientosContables(asientosContables)}
      </div>
    </div>
  );
};

const renderAsientosContables = (asientos: IGetAsientoContable[]) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-black py-6">
          <tr className="py-6">
            <th className="p-6 text-left text-xs font-medium text-white uppercase tracking-wider">
              Fecha
            </th>
            <th className="p-6 text-left text-xs font-medium text-white uppercase tracking-wider">
              Cuenta
            </th>
            <th className="p-6 text-left text-xs font-medium text-white uppercase tracking-wider">
              Descripción
            </th>
            <th className="p-6 text-left text-xs font-medium text-white uppercase tracking-wider">
              DEBE
            </th>
            <th className="p-6 text-left text-xs font-medium text-white uppercase tracking-wider">
              HABER
            </th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {asientos.map((asiento, index) => {
            const { totalDebe, totalHaber } = asiento.partidas.reduce(
              (acc, p) => {
                acc.totalDebe += Number(p.monto_debe || 0);
                acc.totalHaber += Number(p.monto_haber || 0);
                return acc;
              },
              { totalDebe: 0, totalHaber: 0 }
            );

            const partidas = [...(asiento.partidas as IPartida[])].sort((a, b) => {
              if (a.monto_debe > 0 && b.monto_debe === 0) return -1;
              if (a.monto_haber > 0 && b.monto_haber === 0) return 1;
              return 0;
            });

            return (
              <React.Fragment key={index}>
                <tr className="bg-gray-100">
                  <td colSpan={5} className="px-6 py-4 text-gray-900">
                    <p
                      className={clsx("text-sm font-medium inline-block", {
                        "line-through": asiento.estado === 0,
                      })}
                    >
                      {`${asiento.descripcion} - #${asiento.correlativo}`}
                    </p>
                    {asiento.estado === 0 && (
                      <span className="ml-2 text-sm text-red-500 inline-block">
                        (Anulados)
                      </span>
                    )}
                  </td>
                </tr>

                {partidas.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {idx === 0 ? parseDate(asiento.fecha) : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {p.cuenta}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.descripcion}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-end">
                    {parseMonto(Number(p.monto_debe ?? 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-end">
                    {parseMonto(Number(p.monto_haber ?? 0))}
                  </td>
                </tr>
              ))}

                <tr>
                  <td colSpan={3} className="px-6 py-4 text-sm font-medium">
                    Monto Total
                  </td>
                  <td className="px-6 py-4 text-sm font-medium border-black border-t text-end">
                    {parseMonto(totalDebe)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium border-black border-t text-end">
                    {parseMonto(totalHaber)}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
