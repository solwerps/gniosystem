"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { Path } from "@/components/molecules/Path";
import { Button } from "@/components/atoms";

type CierreRow = {
  id: number;
  empresa_id: number;
  year: number;
  month: number;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: number | null;
};

export default function CierreMensualPage() {
  const params = useParams();
  const search = useSearchParams();
  const usuario = String(params?.usuario ?? "");
  const empresaId = Number(params?.id);
  const tenantSlug = search.get("tenant") || usuario;

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState<number>(now.getUTCFullYear());
  const [month, setMonth] = useState<number>(now.getUTCMonth() + 1);
  const [status, setStatus] = useState<CierreRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/contabilidad/cierres?empresa_id=${empresaId}&tenant=${encodeURIComponent(
          tenantSlug
        )}&year=${year}&month=${month}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "No se pudo obtener el cierre.");
      }
      setStatus(json?.data ?? null);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Error al cargar cierre.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!empresaId) return;
    loadStatus();
  }, [empresaId, tenantSlug, year, month]);

  const toggleCierre = async (action: "close" | "open") => {
    try {
      setSaving(true);
      const res = await fetch("/api/contabilidad/cierres", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenant: tenantSlug,
          empresa_id: empresaId,
          year,
          month,
          action,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "No se pudo actualizar cierre.");
      }
      toast.success(json?.message || "Cierre actualizado.");
      setStatus(json?.data ?? null);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Error al actualizar cierre.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <EmpresaSidebar empresaId={empresaId} forceUsuario={usuario} />
      <main className="flex-1 p-6">
        <div className="containerPage max-w-5xl mx-auto space-y-6">
          <Path
            parent={{
              text: "Contabilidad",
              href: `/dashboard/contador/${usuario}/empresas/${empresaId}/contabilidad/cierre?tenant=${encodeURIComponent(
                tenantSlug
              )}`,
            }}
            hijos={[{ text: "Cierre mensual" }]}
          />

          <div className="rounded-lg bg-white p-6 shadow space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Año</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Mes</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadStatus} loading={loading}>
                  Consultar estado
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-sm text-slate-600">
                Estado actual:{" "}
                <span className="font-semibold">
                  {status?.is_closed ? "CERRADO" : "ABIERTO"}
                </span>
              </p>
              <p className="text-sm text-slate-500">
                Fecha cierre: {status?.closed_at ?? "—"}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => toggleCierre("close")}
                loading={saving}
                disabled={Boolean(status?.is_closed)}
              >
                Cerrar mes
              </Button>
              <Button
                onClick={() => toggleCierre("open")}
                loading={saving}
                disabled={!status?.is_closed}
                variant="error"
              >
                Reabrir mes
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
