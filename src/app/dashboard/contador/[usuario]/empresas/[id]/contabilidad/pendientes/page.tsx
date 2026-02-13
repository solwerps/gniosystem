"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import type { TableColumn } from "react-data-table-component";

import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { Path } from "@/components/molecules/Path";
import { Table } from "@/components/molecules";

type PendienteRow = {
  documento_uuid: string;
  serie: string;
  numero_dte: string;
  fecha_emision: string;
  tercero: string;
  total: number;
  aplicado: number;
  pendiente: number;
};

type PendientesResponse = {
  cxc: PendienteRow[];
  cxp: PendienteRow[];
  totales: { cxc: number; cxp: number };
};

export default function PendientesPage() {
  const params = useParams();
  const search = useSearchParams();
  const usuario = String(params?.usuario ?? "");
  const empresaId = Number(params?.id);
  const tenantSlug = search.get("tenant") || usuario;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PendientesResponse>({
    cxc: [],
    cxp: [],
    totales: { cxc: 0, cxp: 0 },
  });

  const fetchPendientes = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/contabilidad/pendientes?empresa_id=${empresaId}&tenant=${encodeURIComponent(
          tenantSlug
        )}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "No se pudieron cargar pendientes.");
      }
      setData(json?.data ?? { cxc: [], cxp: [], totales: { cxc: 0, cxp: 0 } });
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Error al cargar pendientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!empresaId) return;
    fetchPendientes();
  }, [empresaId, tenantSlug]);

  const columns = useMemo<TableColumn<PendienteRow>[]>(
    () => [
      {
        name: "Documento",
        selector: (row) => `${row.serie}-${row.numero_dte}`,
        minWidth: "140px",
      },
      {
        name: "Fecha",
        selector: (row) => String(row.fecha_emision).slice(0, 10),
        minWidth: "140px",
      },
      {
        name: "Tercero",
        selector: (row) => row.tercero,
        minWidth: "220px",
      },
      {
        name: "Total",
        selector: (row) => row.total,
        right: true,
        minWidth: "120px",
      },
      {
        name: "Aplicado",
        selector: (row) => row.aplicado,
        right: true,
        minWidth: "120px",
      },
      {
        name: "Pendiente",
        selector: (row) => row.pendiente,
        right: true,
        minWidth: "120px",
      },
    ],
    []
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <EmpresaSidebar empresaId={empresaId} forceUsuario={usuario} />
      <main className="flex-1 p-6">
        <div className="containerPage max-w-6xl mx-auto space-y-6">
          <Path
            parent={{
              text: "Contabilidad",
              href: `/dashboard/contador/${usuario}/empresas/${empresaId}/contabilidad/pendientes?tenant=${encodeURIComponent(
                tenantSlug
              )}`,
            }}
            hijos={[{ text: "Pendientes CxC/CxP" }]}
          />

          <div className="rounded-lg bg-white p-6 shadow space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Cuentas por Cobrar</h2>
              <p className="text-sm text-slate-500">
                Total pendiente: Q{Number(data.totales.cxc || 0).toFixed(2)}
              </p>
              <Table
                columns={columns}
                rows={data.cxc}
                pending={loading}
                pagination
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold">Cuentas por Pagar</h2>
              <p className="text-sm text-slate-500">
                Total pendiente: Q{Number(data.totales.cxp || 0).toFixed(2)}
              </p>
              <Table
                columns={columns}
                rows={data.cxp}
                pending={loading}
                pagination
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
